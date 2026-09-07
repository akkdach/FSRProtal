using System.Data;
using Microsoft.Data.SqlClient;

namespace MobileStatusSync;

public sealed record DiffRow(string Key, string? StageId, string? OldValue, string NewValue);

/// <summary>
/// One connection to the target SQL Server for the whole run:
///   1. bulk-load the source rows into a session temp table (#src)
///   2. set-based diff against the target table
///   3. optional set-based UPDATE inside a transaction (same #src, same predicate)
/// The temp table lives as long as this session, which is why diff + apply share one object.
/// </summary>
public sealed class TargetSession : IAsyncDisposable
{
    private readonly SqlConnection _conn;
    private readonly TargetSettings _t;

    private TargetSession(SqlConnection conn, TargetSettings t) { _conn = conn; _t = t; }

    public static async Task<TargetSession> OpenAsync(TargetSettings t, IReadOnlyList<SourceRow> rows, CancellationToken ct)
    {
        var conn = new SqlConnection(t.ConnectionString);
        await conn.OpenAsync(ct);
        var session = new TargetSession(conn, t);
        try
        {
            await session.LoadSourceAsync(rows, ct);
            return session;
        }
        catch
        {
            await session.DisposeAsync();
            throw;
        }
    }

    private async Task LoadSourceAsync(IReadOnlyList<SourceRow> rows, CancellationToken ct)
    {
        await using (var create = new SqlCommand(
            "CREATE TABLE #src (serviceorderid nvarchar(50) NOT NULL PRIMARY KEY, stageid nvarchar(20) NULL, mobilestatus nvarchar(40) NULL);",
            _conn) { CommandTimeout = _t.CommandTimeoutSeconds })
        {
            await create.ExecuteNonQueryAsync(ct);
        }

        var table = new DataTable();
        table.Columns.Add("serviceorderid", typeof(string));
        table.Columns.Add("stageid", typeof(string));
        table.Columns.Add("mobilestatus", typeof(string));
        foreach (var r in rows)
            table.Rows.Add(r.ServiceOrderId, (object?)r.StageId ?? DBNull.Value, (object?)r.MobileStatus ?? DBNull.Value);

        using var bulk = new SqlBulkCopy(_conn)
        {
            DestinationTableName = "#src",
            BulkCopyTimeout = _t.CommandTimeoutSeconds,
            BatchSize = 10_000,
        };
        bulk.ColumnMappings.Add("serviceorderid", "serviceorderid");
        bulk.ColumnMappings.Add("stageid", "stageid");
        bulk.ColumnMappings.Add("mobilestatus", "mobilestatus");
        await bulk.WriteToServerAsync(table, ct);
    }

    /// <summary>
    /// Rows where the target status differs from the source. NULL target counts as different.
    /// Source rows with NULL mobilestatus are ignored (nothing to set).
    /// </summary>
    private string DiffPredicate =>
        $"s.mobilestatus IS NOT NULL AND ISNULL(CAST(t.{_t.QuotedStatus} AS nvarchar(40)), N'') <> s.mobilestatus";

    public async Task<List<DiffRow>> FindDiffsAsync(CancellationToken ct)
    {
        var sql = $@"
SELECT t.{_t.QuotedKey} AS [key], s.stageid, CAST(t.{_t.QuotedStatus} AS nvarchar(40)) AS old_value, s.mobilestatus AS new_value
FROM {_t.QuotedTable} AS t
JOIN #src AS s ON s.serviceorderid = t.{_t.QuotedKey}
WHERE {DiffPredicate}
ORDER BY t.{_t.QuotedKey};";

        var list = new List<DiffRow>();
        await using var cmd = new SqlCommand(sql, _conn) { CommandTimeout = _t.CommandTimeoutSeconds };
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            list.Add(new DiffRow(
                Key: Convert.ToString(reader.GetValue(0))!.Trim(),
                StageId: reader.IsDBNull(1) ? null : reader.GetString(1),
                OldValue: reader.IsDBNull(2) ? null : reader.GetString(2),
                NewValue: reader.GetString(3)));
        }
        return list;
    }

    /// <summary>
    /// Updates exactly the given keys (the rows that were listed/notified), in one transaction.
    /// The diff predicate is re-checked so a row that changed between diff and apply is not blindly overwritten.
    /// Returns rows affected.
    /// </summary>
    public async Task<int> ApplyAsync(IReadOnlyCollection<string> keys, CancellationToken ct)
    {
        if (keys.Count == 0) return 0;

        await using (var create = new SqlCommand("CREATE TABLE #apply (serviceorderid nvarchar(50) NOT NULL PRIMARY KEY);", _conn)
            { CommandTimeout = _t.CommandTimeoutSeconds })
        {
            await create.ExecuteNonQueryAsync(ct);
        }
        var keyTable = new DataTable();
        keyTable.Columns.Add("serviceorderid", typeof(string));
        foreach (var k in keys.Distinct(StringComparer.OrdinalIgnoreCase)) keyTable.Rows.Add(k);
        using (var bulk = new SqlBulkCopy(_conn) { DestinationTableName = "#apply", BulkCopyTimeout = _t.CommandTimeoutSeconds })
        {
            bulk.ColumnMappings.Add("serviceorderid", "serviceorderid");
            await bulk.WriteToServerAsync(keyTable, ct);
        }

        var touch = _t.QuotedTouch is null ? "" : $", t.{_t.QuotedTouch} = SYSDATETIME()";
        var sql = $@"
UPDATE t SET t.{_t.QuotedStatus} = s.mobilestatus{touch}
FROM {_t.QuotedTable} AS t
JOIN #src AS s ON s.serviceorderid = t.{_t.QuotedKey}
JOIN #apply AS a ON a.serviceorderid = t.{_t.QuotedKey}
WHERE {DiffPredicate};";

        await using var tx = (SqlTransaction)await _conn.BeginTransactionAsync(ct);
        try
        {
            await using var cmd = new SqlCommand(sql, _conn, tx) { CommandTimeout = _t.CommandTimeoutSeconds };
            var affected = await cmd.ExecuteNonQueryAsync(ct);
            await tx.CommitAsync(ct);
            return affected;
        }
        catch
        {
            try { await tx.RollbackAsync(ct); } catch { /* connection may already be broken */ }
            throw;
        }
    }

    public async ValueTask DisposeAsync() => await _conn.DisposeAsync();
}
