namespace MobileStatusSync;

/// <summary>Minimal logger: console + one file per day under LogDirectory (relative to the exe folder).</summary>
public sealed class Log : IDisposable
{
    private readonly StreamWriter? _file;
    private readonly object _gate = new();

    public Log(string directory)
    {
        try
        {
            var dir = Path.IsPathRooted(directory) ? directory : Path.Combine(AppContext.BaseDirectory, directory);
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, $"mobile-status-sync-{DateTime.Now:yyyyMMdd}.log");
            _file = new StreamWriter(path, append: true) { AutoFlush = true };
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[log] cannot open log file: {ex.Message}");
        }
    }

    public void Info(string message) => Write("INFO ", message);
    public void Warn(string message) => Write("WARN ", message);
    public void Error(string message) => Write("ERROR", message);

    private void Write(string level, string message)
    {
        var line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} [{level}] {message}";
        lock (_gate)
        {
            Console.WriteLine(line);
            _file?.WriteLine(line);
        }
    }

    public void Dispose() => _file?.Dispose();
}
