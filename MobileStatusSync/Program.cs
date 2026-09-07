using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using static MobileStatusSync.TeamsNotifier;

namespace MobileStatusSync;

/// <summary>
/// One run = one comparison pass. Scheduled by Windows Task Scheduler (default: every 60 minutes) (see deploy/).
///   1. get Entra token for the service principal
///   2. read (serviceorderid, stageid, mobilestatus) from the Fabric view
///   3. bulk-load into #src on the target SQL Server and diff against Target.Table
///   4. DRY-RUN: report only · APPLY: UPDATE differing rows, then post the list to MS Teams
/// Exit codes: 0 ok · 1 error · 2 blocked by Sync:MaxChangesPerRun · 3 config error
/// </summary>
public static class Program
{
    private const int ExitOk = 0, ExitError = 1, ExitBlockedByCap = 2, ExitConfig = 3;
    private static readonly TimeSpan RunTimeout = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan AlertThrottle = TimeSpan.FromMinutes(60);

    public static async Task<int> Main(string[] args)
    {
        args = ExpandShortcuts(args);
        try { Console.OutputEncoding = System.Text.Encoding.UTF8; } catch { /* no console (Task Scheduler) */ }

        // A scheduled run must never overlap the previous one (Task Scheduler is also set to IgnoreNew, this is the second lock).
        using var mutex = new Mutex(initiallyOwned: true, name: @"Global\MobileStatusSync", out var isFirstInstance);
        if (!isFirstInstance)
        {
            Console.WriteLine("Another MobileStatusSync instance is still running — skipping this run.");
            return ExitOk;
        }

        AppSettings settings;
        try
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(AppContext.BaseDirectory)
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
                .AddJsonFile("appsettings.Production.json", optional: true, reloadOnChange: false)
                .AddEnvironmentVariables(prefix: "MSS_")   // e.g. MSS_Fabric__ClientSecret, MSS_Sync__DryRun
                .AddCommandLine(args)                       // e.g. --Sync:DryRun=false  (or shortcuts: --apply / --dry-run / --no-teams)
                .Build();
            settings = config.Get<AppSettings>() ?? new AppSettings();
            settings.Validate();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"CONFIG ERROR: {ex.Message}");
            return ExitConfig;
        }

        using var log = new Log(settings.LogDirectory);
        using var cts = new CancellationTokenSource(RunTimeout);
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
        var ct = cts.Token;

        var t = settings.Target;
        var title = settings.Teams.Title;
        var mode = settings.Sync.DryRun ? "DRY-RUN" : "APPLY";
        var host = Environment.MachineName;
        string Footer(int shown, int total) => $"{mode} · {host} · {DateTime.Now:yyyy-MM-dd HH:mm} · แสดง {shown} จาก {total} รายการ";

        log.Info($"=== MobileStatusSync v{typeof(Program).Assembly.GetName().Version} start · mode={mode} · target={t.Table}.{t.StatusColumn} (key {t.KeyColumn}) · host={host}");

        try
        {
            var sw = Stopwatch.StartNew();

            // 1. token
            var token = await FabricSource.GetAccessTokenAsync(settings.Fabric, http, ct);
            log.Info($"[1/4] Entra token acquired ({sw.ElapsedMilliseconds} ms)");

            // 2. read source
            sw.Restart();
            var raw = await FabricSource.ReadAsync(settings.Fabric, token, ct);
            var rows = FabricSource.Deduplicate(raw, out var duplicates, out var ambiguous);
            log.Info($"[2/4] Fabric view read: {raw.Count} rows → {rows.Count} unique service orders ({duplicates} duplicates) ({sw.ElapsedMilliseconds} ms)");
            if (ambiguous.Count > 0)
                log.Warn($"      {ambiguous.Count} service orders skipped because duplicate rows disagree on mobilestatus: {Preview(ambiguous)}");

            if (rows.Count == 0)
            {
                log.Warn("Source returned 0 rows — nothing to compare. Check Fabric:SourceQuery / the view.");
                await AlertOnceAsync(settings, http, log, "source-empty",
                    $"⚠️ {title}: view ว่าง", "Fabric view คืน 0 แถว — ไม่มีอะไรให้เทียบ ตรวจ view / SourceQuery", "Warning", ct);
                return ExitError;
            }

            // 3. diff
            sw.Restart();
            await using var target = await TargetSession.OpenAsync(t, rows, ct);
            var allDiffs = await target.FindDiffsAsync(ct);
            log.Info($"[3/4] Compared with {t.Table}: {allDiffs.Count} service orders differ ({sw.ElapsedMilliseconds} ms)");

            // Sync:AllowedTransitions — differences outside the whitelist are reported but never written.
            var diffs = allDiffs.Where(d => settings.Sync.IsAllowed(d.OldValue, d.NewValue)).ToList();
            var skipped = allDiffs.Count - diffs.Count;
            var skippedNote = "";
            if (skipped > 0)
            {
                var skippedBreakdown = Breakdown(allDiffs.Where(d => !settings.Sync.IsAllowed(d.OldValue, d.NewValue)));
                log.Info($"      skipped by Sync:AllowedTransitions ({skipped}): {skippedBreakdown}");
                skippedNote = $"\n\nข้าม {skipped} รายการที่อยู่นอก AllowedTransitions: {skippedBreakdown}";
            }

            if (diffs.Count == 0)
            {
                log.Info(skipped > 0 ? "No allowed differences — nothing to update." : "No differences — nothing to update.");
                if (settings.Teams.NotifyWhenNoChanges)
                    await SendAsync(settings.Teams, http, log, $"✅ {title}", "ไม่มี service order ที่ต้องอัปเดต" + skippedNote, [], "Good", Footer(0, allDiffs.Count), ct);
                return ExitOk;
            }

            var breakdown = Breakdown(diffs) + skippedNote;
            log.Info($"      transitions to apply (old → new: count): {Breakdown(diffs)}");
            foreach (var d in diffs.Take(settings.Teams.MaxListedRows))
                log.Info($"      {d.Key}  stage={d.StageId ?? "-"}  {d.OldValue ?? "NULL"} → {d.NewValue}");
            if (diffs.Count > settings.Teams.MaxListedRows)
                log.Info($"      … and {diffs.Count - settings.Teams.MaxListedRows} more");

            var facts = diffs.Take(settings.Teams.MaxListedRows)
                .Select(d => new Fact(d.Key, $"stage {d.StageId ?? "-"} · {d.OldValue ?? "NULL"} → {d.NewValue}"))
                .ToList();

            // circuit breaker (APPLY only — a dry run always reports the full picture)
            var overCap = settings.Sync.MaxChangesPerRun > 0 && diffs.Count > settings.Sync.MaxChangesPerRun;
            if (overCap && !settings.Sync.DryRun)
            {
                log.Warn($"BLOCKED: {diffs.Count} changes exceed Sync:MaxChangesPerRun={settings.Sync.MaxChangesPerRun}. Nothing updated.");
                await AlertOnceAsync(settings, http, log, "cap-exceeded",
                    $"⛔ {title}: หยุดอัปเดต — เกินเพดาน",
                    $"พบ **{diffs.Count}** รายการที่ต่างกัน มากกว่าเพดาน {settings.Sync.MaxChangesPerRun} รายการ/รอบ (Sync:MaxChangesPerRun) — **ยังไม่ได้อัปเดต** ตรวจสอบก่อนแล้วปรับเพดานถ้าถูกต้อง\n\n{breakdown}",
                    "Attention", ct, facts, Footer(facts.Count, diffs.Count));
                return ExitBlockedByCap;
            }

            // 4. dry-run or apply
            if (settings.Sync.DryRun)
            {
                log.Info("[4/4] DRY-RUN — no rows updated." + (overCap ? $" NOTE: {diffs.Count} > Sync:MaxChangesPerRun={settings.Sync.MaxChangesPerRun} — an APPLY run would be blocked until the cap is raised." : ""));
                WriteChangeAudit(settings.LogDirectory, "DRY-RUN", diffs, log);
                await SendAsync(settings.Teams, http, log,
                    $"🧪 [DRY RUN] {title}",
                    $"พบ **{diffs.Count}** service order ที่ค่า `{t.StatusColumn}` ต่างจาก stage ใน D365 — **ยังไม่ได้อัปเดต** (โหมดทดสอบ)\n\n{breakdown}"
                    + (overCap ? $"\n\n⚠️ เกินเพดาน {settings.Sync.MaxChangesPerRun} รายการ/รอบ — โหมด APPLY จะถูกบล็อกจนกว่าจะปรับ Sync:MaxChangesPerRun" : ""),
                    facts, "Warning", Footer(facts.Count, diffs.Count), ct);
                return ExitOk;
            }

            sw.Restart();
            var affected = await target.ApplyAsync(diffs.Select(d => d.Key).ToList(), ct);
            log.Info($"[4/4] UPDATED {affected} rows in {t.Table}.{t.StatusColumn} ({sw.ElapsedMilliseconds} ms)");
            WriteChangeAudit(settings.LogDirectory, "APPLIED", diffs, log);
            await SendAsync(settings.Teams, http, log,
                $"🔄 {title}: อัปเดต {affected} รายการ",
                $"ค่า `{t.StatusColumn}` ของ service order ต่อไปนี้ถูกอัปเดตตาม stage ปัจจุบันใน D365\n\n{breakdown}",
                facts, "Good", Footer(facts.Count, diffs.Count), ct);
            return ExitOk;
        }
        catch (OperationCanceledException) when (cts.IsCancellationRequested)
        {
            log.Error($"Run exceeded {RunTimeout.TotalMinutes} min and was aborted.");
            await AlertOnceAsync(settings, http, log, "timeout", $"❌ {title}: timeout", $"รอบนี้ใช้เวลาเกิน {RunTimeout.TotalMinutes} นาที ถูกยกเลิก", "Attention", CancellationToken.None);
            return ExitError;
        }
        catch (Exception ex)
        {
            log.Error($"FAILED: {ex.GetType().Name}: {ex.Message}");
            log.Error(ex.ToString());
            await AlertOnceAsync(settings, http, log, "error:" + ex.GetType().Name, $"❌ {title}: ล้มเหลว", $"{ex.GetType().Name}: {ex.Message}", "Attention", CancellationToken.None);
            return ExitError;
        }
        finally
        {
            log.Info("=== end");
        }
    }

    /// <summary>Convenience flags → configuration keys.</summary>
    private static string[] ExpandShortcuts(string[] args) => args.Select(a => a switch
    {
        "--dry-run" => "--Sync:DryRun=true",
        "--apply" => "--Sync:DryRun=false",
        "--no-teams" => "--Teams:Enabled=false",
        _ => a,
    }).ToArray();

    private static string Breakdown(IEnumerable<DiffRow> diffs) => string.Join(" · ",
        diffs.GroupBy(d => $"{d.OldValue ?? "NULL"} → {d.NewValue}")
             .OrderByDescending(g => g.Count())
             .Select(g => $"{g.Key}: {g.Count()}"));

    private static string Preview(IReadOnlyList<string> ids) =>
        string.Join(", ", ids.Take(10)) + (ids.Count > 10 ? $" … (+{ids.Count - 10})" : "");

    private static string ResolveDir(string logDirectory) =>
        Path.IsPathRooted(logDirectory) ? logDirectory : Path.Combine(AppContext.BaseDirectory, logDirectory);

    /// <summary>
    /// Full per-row audit trail (every differing row, not just the ones shown in Teams):
    /// &lt;LogDirectory&gt;/changes-yyyyMMdd.csv — timestamp,mode,key,stageid,old_value,new_value.
    /// This is the only place the previous value is kept, so it is what you use to roll a change back.
    /// </summary>
    private static void WriteChangeAudit(string logDirectory, string mode, IReadOnlyList<DiffRow> diffs, Log log)
    {
        try
        {
            var dir = ResolveDir(logDirectory);
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, $"changes-{DateTime.Now:yyyyMMdd}.csv");
            var isNew = !File.Exists(path);
            using var w = new StreamWriter(path, append: true, System.Text.Encoding.UTF8);
            if (isNew) w.WriteLine("timestamp,mode,key,stageid,old_value,new_value");
            var ts = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            foreach (var d in diffs)
                w.WriteLine($"{ts},{mode},{Csv(d.Key)},{Csv(d.StageId)},{Csv(d.OldValue)},{Csv(d.NewValue)}");
            log.Info($"      change audit: {diffs.Count} rows appended to {path}");
        }
        catch (Exception ex)
        {
            log.Warn($"[audit] cannot write change audit: {ex.Message}");
        }
    }

    private static string Csv(string? s) =>
        s is null ? "" : (s.Contains(',') || s.Contains('"') || s.Contains('\n') ? $"\"{s.Replace("\"", "\"\"")}\"" : s);

    /// <summary>
    /// Error/warning cards are throttled per key (default 60 min) so a persistent failure does not post to Teams on every scheduled run.
    /// State lives in &lt;LogDirectory&gt;/alert-state.json.
    /// </summary>
    private static async Task AlertOnceAsync(AppSettings s, HttpClient http, Log log, string key, string title, string summary, string color,
        CancellationToken ct, IReadOnlyList<Fact>? facts = null, string? footer = null)
    {
        if (!s.Teams.Enabled) return;
        var dir = ResolveDir(s.LogDirectory);
        var statePath = Path.Combine(dir, "alert-state.json");
        var state = new Dictionary<string, DateTime>();
        try
        {
            if (File.Exists(statePath))
                state = JsonSerializer.Deserialize<Dictionary<string, DateTime>>(await File.ReadAllTextAsync(statePath, ct)) ?? state;
        }
        catch (Exception ex) { log.Warn($"[alert] cannot read {statePath}: {ex.Message}"); }

        if (state.TryGetValue(key, out var last) && DateTime.UtcNow - last < AlertThrottle)
        {
            log.Info($"[alert] '{key}' already sent {(DateTime.UtcNow - last).TotalMinutes:F0} min ago — throttled");
            return;
        }

        var sent = await SendAsync(s.Teams, http, log, title, summary, facts ?? [], color, footer ?? $"{Environment.MachineName} · {DateTime.Now:yyyy-MM-dd HH:mm}", ct);
        if (!sent) return;
        state[key] = DateTime.UtcNow;
        try
        {
            Directory.CreateDirectory(dir);
            await File.WriteAllTextAsync(statePath, JsonSerializer.Serialize(state), ct);
        }
        catch (Exception ex) { log.Warn($"[alert] cannot write {statePath}: {ex.Message}"); }
    }
}
