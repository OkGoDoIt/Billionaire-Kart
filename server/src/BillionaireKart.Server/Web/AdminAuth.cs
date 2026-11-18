using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace BillionaireKart.Server.Web;

/// <summary>The admin sign-in secret (Kart__AdminToken) and a small per-address limit on attempts.</summary>
public sealed class AdminAuth(IConfiguration config)
{
    public const string Scheme = "Admin";
    const int AttemptsPerWindow = 10;
    static readonly TimeSpan Window = TimeSpan.FromMinutes(10);

    readonly ConcurrentDictionary<string, (DateTimeOffset Start, int Count)> _attempts = new();

    string? Token => string.IsNullOrEmpty(config["Kart:AdminToken"]) ? null : config["Kart:AdminToken"];

    public bool Enabled => Token != null;

    /// <summary>False when this address has tried too often lately.</summary>
    public bool TryCountAttempt(string address)
    {
        var now = DateTimeOffset.UtcNow;
        var entry = _attempts.AddOrUpdate(address, _ => (now, 1),
            (_, e) => now - e.Start > Window ? (now, 1) : (e.Start, e.Count + 1));
        if (_attempts.Count > 10_000)
            foreach (var (k, v) in _attempts) if (now - v.Start > Window) _attempts.TryRemove(k, out _);
        return entry.Count <= AttemptsPerWindow;
    }

    public bool Check(string? given)
    {
        var token = Token;
        if (token == null || given == null) return false;
        var a = SHA256.HashData(Encoding.UTF8.GetBytes(given));
        var b = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return CryptographicOperations.FixedTimeEquals(a, b);
    }
}

/// <summary>A generous cap on how many new guest players one address can create, so a script cannot fill the players table.</summary>
public sealed class NewPlayerLimit
{
    const int PerWindow = 40;
    static readonly TimeSpan Window = TimeSpan.FromMinutes(10);
    readonly ConcurrentDictionary<string, (DateTimeOffset Start, int Count)> _made = new();

    public bool TryCount(string address)
    {
        var now = DateTimeOffset.UtcNow;
        var entry = _made.AddOrUpdate(address, _ => (now, 1),
            (_, e) => now - e.Start > Window ? (now, 1) : (e.Start, e.Count + 1));
        if (_made.Count > 10_000)
            foreach (var (k, v) in _made) if (now - v.Start > Window) _made.TryRemove(k, out _);
        return entry.Count <= PerWindow;
    }
}
