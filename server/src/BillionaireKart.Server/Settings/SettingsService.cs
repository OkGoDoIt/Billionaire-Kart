using BillionaireKart.Server.Data;
using Microsoft.EntityFrameworkCore;

namespace BillionaireKart.Server.Settings;

/// <summary>Typed business numbers, stored in the settings table and read live. One process, so the cache is the truth after a save.</summary>
public sealed class SettingsService(IServiceScopeFactory scopes, ILogger<SettingsService> log)
{
    volatile KartSettings _current = SettingDef.Build(new Dictionary<string, string>());
    Dictionary<string, string> _stored = new();
    readonly SemaphoreSlim _gate = new(1, 1);

    public KartSettings Current => _current;

    /// <summary>Stored values (only the ones that differ from the default are stored).</summary>
    public IReadOnlyDictionary<string, string> Stored => _stored;

    public string ValueOf(string key) => _stored.TryGetValue(key, out var v) ? v : SettingDef.ByKey[key].Default;

    public async Task LoadAsync(CancellationToken ct = default)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<KartDb>();
        var rows = await db.Settings.AsNoTracking().ToListAsync(ct);
        var stored = new Dictionary<string, string>();
        foreach (var r in rows)
        {
            if (!SettingDef.ByKey.TryGetValue(r.Key, out var def)) continue;
            var (v, err) = def.Normalize(r.Value);
            if (err != null) { log.LogWarning("Ignoring stored setting {Key}={Value}: {Error}", r.Key, r.Value, err); continue; }
            stored[r.Key] = v!;
        }
        _stored = stored;
        _current = SettingDef.Build(stored);
    }

    /// <summary>Validates and saves several settings at once. Returns errors by key; nothing is saved when there are any.</summary>
    public async Task<Dictionary<string, string>> SaveAsync(IReadOnlyDictionary<string, string> values, CancellationToken ct = default)
    {
        var errors = new Dictionary<string, string>();
        var normalized = new Dictionary<string, string>();
        foreach (var (key, raw) in values)
        {
            if (!SettingDef.ByKey.TryGetValue(key, out var def)) { errors[key] = "Unknown setting."; continue; }
            var (v, err) = def.Normalize(raw);
            if (err != null) errors[key] = err; else normalized[key] = v!;
        }
        if (errors.Count > 0) return errors;

        await _gate.WaitAsync(ct);
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<KartDb>();
            var now = DateTimeOffset.UtcNow;
            var keys = normalized.Keys.ToList();
            var rows = await db.Settings.Where(s => keys.Contains(s.Key)).ToDictionaryAsync(s => s.Key, ct);
            var stored = new Dictionary<string, string>(_stored);
            foreach (var (key, v) in normalized)
            {
                var isDefault = v == SettingDef.ByKey[key].Normalize(SettingDef.ByKey[key].Default).Value;
                rows.TryGetValue(key, out var row);
                if (isDefault)
                {
                    if (row != null) db.Settings.Remove(row);
                    stored.Remove(key);
                }
                else
                {
                    if (row == null) db.Settings.Add(new SettingRow { Key = key, Value = v, UpdatedAt = now });
                    else if (row.Value != v) { row.Value = v; row.UpdatedAt = now; }
                    stored[key] = v;
                }
            }
            await db.SaveChangesAsync(ct);
            _stored = stored;
            _current = SettingDef.Build(stored);
            log.LogInformation("Settings saved: {Keys}", string.Join(", ", keys));
        }
        finally { _gate.Release(); }
        return errors;
    }
}
