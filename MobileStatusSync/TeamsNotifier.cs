using System.Text;
using System.Text.Json;

namespace MobileStatusSync;

/// <summary>
/// Posts an Adaptive Card (v1.5, with a Table) to an MS Teams webhook — works with both the Power Automate
/// "Workflows" webhook and the legacy Incoming Webhook (same payload shape as
/// onelake-middleware/src/services/teamsNotificationService.js).
/// </summary>
public static class TeamsNotifier
{
    /// <param name="color">Adaptive Card colour: Default | Accent | Good | Warning | Attention</param>
    /// <param name="headers">Column headers of the table (null/empty = no table)</param>
    /// <param name="rows">One string per cell, same length as headers</param>
    public static async Task<bool> SendAsync(
        TeamsSettings t, HttpClient http, Log log,
        string title, string summary, string[]? headers, IReadOnlyList<string[]> rows, string color, string? footer,
        CancellationToken ct)
    {
        if (!t.Enabled) { log.Info("[teams] disabled — not sending"); return false; }

        var body = new List<object>
        {
            new Dictionary<string, object> { ["type"] = "TextBlock", ["text"] = title, ["weight"] = "Bolder", ["size"] = "Large", ["color"] = color, ["wrap"] = true },
            new Dictionary<string, object> { ["type"] = "TextBlock", ["text"] = summary, ["wrap"] = true },
        };
        if (headers is { Length: > 0 } && rows.Count > 0)
            body.Add(BuildTable(headers, rows));
        if (!string.IsNullOrWhiteSpace(footer))
            body.Add(new Dictionary<string, object> { ["type"] = "TextBlock", ["text"] = footer, ["size"] = "Small", ["isSubtle"] = true, ["wrap"] = true });

        var card = new Dictionary<string, object>
        {
            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
            ["type"] = "AdaptiveCard",
            ["version"] = "1.5",
            ["body"] = body,
        };
        if (!string.IsNullOrWhiteSpace(t.OpenUrl))
            card["actions"] = new List<object>
            {
                new Dictionary<string, object> { ["type"] = "Action.OpenUrl", ["title"] = "เปิดระบบ Smart Field Service", ["url"] = t.OpenUrl },
            };

        var payload = new Dictionary<string, object>
        {
            ["type"] = "message",
            ["attachments"] = new List<object>
            {
                new Dictionary<string, object?> { ["contentType"] = "application/vnd.microsoft.card.adaptive", ["contentUrl"] = null, ["content"] = card },
            },
        };

        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        try
        {
            using var res = await http.PostAsync(t.WebhookUrl, content, ct);
            if (res.IsSuccessStatusCode)
            {
                log.Info($"[teams] sent ({(int)res.StatusCode})");
                return true;
            }
            var text = await res.Content.ReadAsStringAsync(ct);
            log.Error($"[teams] webhook returned {(int)res.StatusCode}: {(text.Length > 300 ? text[..300] : text)}");
            return false;
        }
        catch (Exception ex)
        {
            log.Error($"[teams] send failed: {ex.Message}");
            return false;
        }
    }

    /// <summary>Adaptive Card 1.5 Table: header row in bold, first column wider (the service order id).</summary>
    private static Dictionary<string, object> BuildTable(string[] headers, IReadOnlyList<string[]> rows)
    {
        static Dictionary<string, object> Cell(string text, bool bold, string? color = null)
        {
            var tb = new Dictionary<string, object> { ["type"] = "TextBlock", ["text"] = text, ["wrap"] = true, ["size"] = "Small" };
            if (bold) tb["weight"] = "Bolder";
            if (color is not null) tb["color"] = color;
            return new Dictionary<string, object> { ["type"] = "TableCell", ["items"] = new List<object> { tb } };
        }

        var tableRows = new List<object>
        {
            new Dictionary<string, object> { ["type"] = "TableRow", ["cells"] = headers.Select(h => Cell(h, bold: true)).ToList<object>(), ["style"] = "accent" },
        };
        foreach (var r in rows)
            tableRows.Add(new Dictionary<string, object>
            {
                ["type"] = "TableRow",
                ["cells"] = r.Select((c, i) => Cell(c, bold: i == 0)).ToList<object>(),
            });

        var columns = headers.Select((_, i) => new Dictionary<string, object> { ["width"] = i == 0 ? 2 : 1 }).ToList<object>();
        return new Dictionary<string, object>
        {
            ["type"] = "Table",
            ["firstRowAsHeader"] = true,
            ["showGridLines"] = true,
            ["columns"] = columns,
            ["rows"] = tableRows,
        };
    }
}
