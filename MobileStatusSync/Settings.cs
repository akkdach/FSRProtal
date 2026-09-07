using System.Text.RegularExpressions;

namespace MobileStatusSync;

/// <summary>Root of appsettings.json (also bindable from env vars with prefix MSS_ and command line).</summary>
public sealed class AppSettings
{
    public FabricSettings Fabric { get; set; } = new();
    public TargetSettings Target { get; set; } = new();
    public SyncSettings Sync { get; set; } = new();
    public TeamsSettings Teams { get; set; } = new();
    public string LogDirectory { get; set; } = "logs";

    public void Validate()
    {
        Fabric.Validate();
        Target.Validate();
        Sync.Validate();
        Teams.Validate();
    }
}

/// <summary>Source of truth: the view on the Fabric SQL analytics endpoint (Dataverse mirror).</summary>
public sealed class FabricSettings
{
    public string Server { get; set; } = "";
    public string Database { get; set; } = "";
    public string TenantId { get; set; } = "";
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";

    /// <summary>Must return columns: serviceorderid, stageid, mobilestatus.</summary>
    public string SourceQuery { get; set; } =
        "SELECT serviceorderid, stageid, mobilestatus FROM dbo.update_mobile_status_when_callbackwork";

    /// <summary>"Mandatory" (TLS over TDS 7.x) or "Strict" (TDS 8.0). Fabric accepts both.</summary>
    public string Encrypt { get; set; } = "Mandatory";
    public int CommandTimeoutSeconds { get; set; } = 300;

    public void Validate()
    {
        Require(Server, "Fabric:Server");
        Require(Database, "Fabric:Database");
        Require(TenantId, "Fabric:TenantId");
        Require(ClientId, "Fabric:ClientId");
        Require(ClientSecret, "Fabric:ClientSecret");
        Require(SourceQuery, "Fabric:SourceQuery");
        if (Encrypt is not ("Mandatory" or "Strict" or "Optional"))
            throw new ConfigException("Fabric:Encrypt must be Mandatory, Strict or Optional");
    }

    private static void Require(string value, string key)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ConfigException($"Missing config value: {key}");
    }
}

/// <summary>Target: SQL Server table on the VM whose status column is kept in sync.</summary>
public sealed class TargetSettings
{
    public string ConnectionString { get; set; } = "";
    public string Table { get; set; } = "dbo.work_order";
    public string KeyColumn { get; set; } = "ORDERID";
    public string StatusColumn { get; set; } = "WEB_STATUS";

    /// <summary>Optional datetime column stamped with SYSDATETIME() on every updated row (empty = don't touch).</summary>
    public string TouchColumn { get; set; } = "";
    public int CommandTimeoutSeconds { get; set; } = 120;

    private static readonly Regex Identifier = new("^[A-Za-z_][A-Za-z0-9_]*$", RegexOptions.Compiled);

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(ConnectionString)) throw new ConfigException("Missing config value: Target:ConnectionString");
        foreach (var part in Table.Split('.'))
            if (!Identifier.IsMatch(part)) throw new ConfigException($"Target:Table has an invalid identifier part '{part}'");
        if (!Identifier.IsMatch(KeyColumn)) throw new ConfigException("Target:KeyColumn is not a valid identifier");
        if (!Identifier.IsMatch(StatusColumn)) throw new ConfigException("Target:StatusColumn is not a valid identifier");
        if (TouchColumn.Length > 0 && !Identifier.IsMatch(TouchColumn)) throw new ConfigException("Target:TouchColumn is not a valid identifier");
    }

    /// <summary>[schema].[table] — every part validated against a strict identifier regex, so it is safe to inline in SQL.</summary>
    public string QuotedTable => string.Join(".", Table.Split('.').Select(p => $"[{p}]"));
    public string QuotedKey => $"[{KeyColumn}]";
    public string QuotedStatus => $"[{StatusColumn}]";
    public string? QuotedTouch => TouchColumn.Length > 0 ? $"[{TouchColumn}]" : null;
}

public sealed class SyncSettings
{
    /// <summary>true = only report what would change (default, safe). Set false (or pass --apply) to write.</summary>
    public bool DryRun { get; set; } = true;

    /// <summary>Circuit breaker: if more rows than this differ, do NOT update — alert instead. 0 = no limit.</summary>
    public int MaxChangesPerRun { get; set; } = 500;

    /// <summary>
    /// Whitelist of "old>new" transitions that may be written, e.g. "4>0", "4>2", "*>4", "NULL>2".
    /// "*" matches any value, "NULL" matches a NULL target. Empty list = every difference is written.
    /// Differences outside the list are reported as "skipped", never updated.
    /// </summary>
    public List<string> AllowedTransitions { get; set; } = [];

    public void Validate()
    {
        if (MaxChangesPerRun < 0) throw new ConfigException("Sync:MaxChangesPerRun must be >= 0");
        foreach (var t in AllowedTransitions)
        {
            var parts = t.Split('>');
            if (parts.Length != 2 || parts.Any(p => string.IsNullOrWhiteSpace(p)))
                throw new ConfigException($"Sync:AllowedTransitions entry '{t}' must look like old>new (e.g. 4>0, *>4, NULL>2)");
        }
    }

    /// <summary>True when the (old → new) change is permitted by AllowedTransitions.</summary>
    public bool IsAllowed(string? oldValue, string newValue)
    {
        if (AllowedTransitions.Count == 0) return true;
        var old = oldValue ?? "NULL";
        foreach (var t in AllowedTransitions)
        {
            var parts = t.Split('>');
            var o = parts[0].Trim();
            var n = parts[1].Trim();
            bool oldOk = o == "*" || string.Equals(o, old, StringComparison.OrdinalIgnoreCase);
            bool newOk = n == "*" || string.Equals(n, newValue, StringComparison.OrdinalIgnoreCase);
            if (oldOk && newOk) return true;
        }
        return false;
    }
}

public sealed class TeamsSettings
{
    public bool Enabled { get; set; } = true;
    public string WebhookUrl { get; set; } = "";
    public string Title { get; set; } = "Mobile Status Sync";
    public int MaxListedRows { get; set; } = 20;
    public bool NotifyWhenNoChanges { get; set; } = false;
    public string OpenUrl { get; set; } = "";

    public void Validate()
    {
        if (Enabled && string.IsNullOrWhiteSpace(WebhookUrl))
            throw new ConfigException("Teams:Enabled is true but Teams:WebhookUrl is empty (set it, or Teams:Enabled=false / --no-teams)");
        if (Enabled && !(Uri.TryCreate(WebhookUrl, UriKind.Absolute, out var uri) && (uri.Scheme == "https" || uri.Scheme == "http")))
            throw new ConfigException("Teams:WebhookUrl must be an absolute http(s) URL — check for surrounding quotes or a missing https:// prefix");
        if (MaxListedRows < 0) throw new ConfigException("Teams:MaxListedRows must be >= 0");
    }
}

public sealed class ConfigException(string message) : Exception(message);
