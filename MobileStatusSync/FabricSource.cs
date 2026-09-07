using System.Text.Json;
using Microsoft.Data.SqlClient;

namespace MobileStatusSync;

public sealed record SourceRow(string ServiceOrderId, string? StageId, string? MobileStatus);

/// <summary>
/// Reads the source rows from the Fabric SQL analytics endpoint using an Entra ID
/// service principal (OAuth2 client-credentials -> access token -> SqlConnection.AccessToken).
/// </summary>
public static class FabricSource
{
    public static async Task<string> GetAccessTokenAsync(FabricSettings s, HttpClient http, CancellationToken ct)
    {
        var url = $"https://login.microsoftonline.com/{s.TenantId}/oauth2/v2.0/token";
        using var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = s.ClientId,
            ["client_secret"] = s.ClientSecret,
            ["scope"] = "https://database.windows.net/.default",
        });

        using var res = await http.PostAsync(url, form, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"Entra token request failed ({(int)res.StatusCode}): {Truncate(body, 300)}");

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("access_token").GetString()
               ?? throw new InvalidOperationException("Entra token response had no access_token");
    }

    public static async Task<List<SourceRow>> ReadAsync(FabricSettings s, string accessToken, CancellationToken ct)
    {
        var csb = new SqlConnectionStringBuilder
        {
            DataSource = $"tcp:{s.Server},1433",
            InitialCatalog = s.Database,
            Encrypt = s.Encrypt switch
            {
                "Strict" => SqlConnectionEncryptOption.Strict,
                "Optional" => SqlConnectionEncryptOption.Optional,
                _ => SqlConnectionEncryptOption.Mandatory,
            },
            TrustServerCertificate = false,
            ConnectTimeout = 60,
            ApplicationName = "MobileStatusSync",
        };

        await using var conn = new SqlConnection(csb.ConnectionString) { AccessToken = accessToken };
        await conn.OpenAsync(ct);

        await using var cmd = new SqlCommand(s.SourceQuery, conn) { CommandTimeout = s.CommandTimeoutSeconds };
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        int idOrd = Ordinal(reader, "serviceorderid");
        int stageOrd = Ordinal(reader, "stageid");
        int statusOrd = Ordinal(reader, "mobilestatus");

        var rows = new List<SourceRow>(capacity: 4096);
        while (await reader.ReadAsync(ct))
        {
            if (reader.IsDBNull(idOrd)) continue;
            var id = Convert.ToString(reader.GetValue(idOrd))?.Trim();
            if (string.IsNullOrEmpty(id)) continue;

            var stage = reader.IsDBNull(stageOrd) ? null : Convert.ToString(reader.GetValue(stageOrd))?.Trim();
            var status = reader.IsDBNull(statusOrd) ? null : Convert.ToString(reader.GetValue(statusOrd))?.Trim();
            rows.Add(new SourceRow(id, stage, status));
        }
        return rows;
    }

    /// <summary>
    /// One row per service order. Rows whose duplicates disagree on mobilestatus are dropped (ambiguous) and reported.
    /// </summary>
    public static List<SourceRow> Deduplicate(List<SourceRow> rows, out int duplicateCount, out List<string> ambiguousIds)
    {
        var byId = new Dictionary<string, SourceRow>(StringComparer.OrdinalIgnoreCase);
        var conflicts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        duplicateCount = 0;

        foreach (var r in rows)
        {
            if (byId.TryGetValue(r.ServiceOrderId, out var existing))
            {
                duplicateCount++;
                if (!string.Equals(existing.MobileStatus, r.MobileStatus, StringComparison.Ordinal))
                    conflicts.Add(r.ServiceOrderId);
            }
            else
            {
                byId[r.ServiceOrderId] = r;
            }
        }

        foreach (var id in conflicts) byId.Remove(id);
        ambiguousIds = conflicts.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToList();
        return byId.Values.ToList();
    }

    private static int Ordinal(SqlDataReader reader, string column)
    {
        try { return reader.GetOrdinal(column); }
        catch (IndexOutOfRangeException)
        {
            var cols = string.Join(", ", Enumerable.Range(0, reader.FieldCount).Select(reader.GetName));
            throw new InvalidOperationException($"Fabric:SourceQuery must return a column named '{column}'. Columns returned: {cols}");
        }
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}
