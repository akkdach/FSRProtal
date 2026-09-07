using System.Text;
using System.Text.Json;

namespace MobileStatusSync;

/// <summary>
/// Posts an Adaptive Card to an MS Teams incoming webhook (same payload shape as
/// onelake-middleware/src/services/teamsNotificationService.js, so the existing channel works unchanged).
/// </summary>
public static class TeamsNotifier
{
    public sealed record Fact(string Title, string Value);

    /// <param name="color">Adaptive Card colour: Default | Accent | Good | Warning | Attention</param>
    public static async Task<bool> SendAsync(
        TeamsSettings t, HttpClient http, Log log,
        string title, string summary, IReadOnlyList<Fact> facts, string color, string? footer,
        CancellationToken ct)
    {
        if (!t.Enabled) { log.Info("[teams] disabled — not sending"); return false; }

        var body = new List<object>
        {
            new Dictionary<string, object> { ["type"] = "TextBlock", ["text"] = title, ["weight"] = "Bolder", ["size"] = "Large", ["color"] = color, ["wrap"] = true },
            new Dictionary<string, object> { ["type"] = "TextBlock", ["text"] = summary, ["wrap"] = true },
        };
        if (facts.Count > 0)
            body.Add(new Dictionary<string, object>
            {
                ["type"] = "FactSet",
                ["facts"] = facts.Select(f => new Dictionary<string, string> { ["title"] = f.Title, ["value"] = f.Value }).ToList(),
            });
        if (!string.IsNullOrWhiteSpace(footer))
            body.Add(new Dictionary<string, object> { ["type"] = "TextBlock", ["text"] = footer, ["size"] = "Small", ["isSubtle"] = true, ["wrap"] = true });

        var card = new Dictionary<string, object>
        {
            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
            ["type"] = "AdaptiveCard",
            ["version"] = "1.4",
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
}
