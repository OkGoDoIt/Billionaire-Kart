using System.Security.Cryptography;
using BillionaireKart.Server.Data;
using BillionaireKart.Server.Rating;
using BillionaireKart.Server.Rooms;
using BillionaireKart.Server.Settings;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace BillionaireKart.Server.Web;

/// <summary>The bk_player cookie: a Data-Protected player id.</summary>
public sealed class PlayerCookie(IDataProtectionProvider dp, IHostEnvironment env)
{
    public const string Name = "bk_player";
    readonly IDataProtector _protector = dp.CreateProtector("bk_player.v1");

    public Guid? Read(HttpRequest req)
    {
        if (!req.Cookies.TryGetValue(Name, out var raw) || string.IsNullOrEmpty(raw)) return null;
        try { return Guid.TryParse(_protector.Unprotect(raw), out var id) ? id : null; }
        catch (CryptographicException) { return null; }
    }

    public void Write(HttpContext ctx, Guid id) =>
        ctx.Response.Cookies.Append(Name, _protector.Protect(id.ToString()), new CookieOptions
        {
            HttpOnly = true,
            // Secure everywhere except plain-http local development.
            Secure = !env.IsDevelopment() || ctx.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromDays(400),
            Path = "/",
            IsEssential = true,
        });
}

/// <summary>Which browser origins may open /ws and call /api.</summary>
public sealed class OriginPolicy
{
    readonly HashSet<string> _allowed;
    readonly bool _allowLocal;

    public OriginPolicy(IConfiguration config, IHostEnvironment env)
    {
        _allowed = (config["Kart:AllowedOrigins"] ?? "")
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(o => o.TrimEnd('/'))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        _allowLocal = env.IsDevelopment();
    }

    public bool IsAllowed(string? origin)
    {
        if (string.IsNullOrEmpty(origin)) return false;
        if (_allowed.Contains(origin.TrimEnd('/'))) return true;
        return _allowLocal && Uri.TryCreate(origin, UriKind.Absolute, out var u) && u.Scheme == "http" &&
               u.Host is "localhost" or "127.0.0.1";
    }
}

public static class PlayerApi
{
    public static void Map(WebApplication app)
    {
        var api = app.MapGroup("/api");

        api.MapPost("/session", async (HttpContext ctx, KartDb db, PlayerCookie cookie, SettingsService settings, NewPlayerLimit limit) =>
        {
            var now = DateTimeOffset.UtcNow;
            Player? p = null;
            if (cookie.Read(ctx.Request) is Guid id) p = await db.Players.FindAsync(id);
            if (p?.BannedAt != null) return Results.StatusCode(StatusCodes.Status403Forbidden);
            if (p == null)
            {
                if (!limit.TryCount(ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown")) return Results.StatusCode(StatusCodes.Status429TooManyRequests);
                p = new Player
                {
                    Id = Guid.CreateVersion7(),
                    HandleTitle = Random.Shared.Next(0, 200),
                    HandleNumber = Random.Shared.Next(1, 10000),
                    Mu = OpenSkill.Mu, Sigma = OpenSkill.Sigma, CreatedAt = now, LastSeenAt = now,
                };
                db.Players.Add(p);
            }
            else p.LastSeenAt = now;
            await db.SaveChangesAsync();
            cookie.Write(ctx, p.Id);
            return Results.Json(SessionView(p, settings.Current));
        });

        api.MapPost("/handle", async (HttpContext ctx, HandleRequest body, KartDb db, PlayerCookie cookie, SettingsService settings, RoomManager rooms) =>
        {
            if (cookie.Read(ctx.Request) is not Guid id || await db.Players.FindAsync(id) is not { } p || p.BannedAt != null)
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            if (body.Title is not (>= 0 and <= 199)) return Results.BadRequest(new { error = "title must be 0 to 199" });
            p.HandleTitle = body.Title.Value;
            await db.SaveChangesAsync();
            await rooms.UpdateHandleAsync(id, p.HandleTitle);
            return Results.Json(SessionView(p, settings.Current));
        });

        api.MapGet("/leaderboard", async (HttpContext ctx, string? board, int? limit, KartDb db, PlayerCookie cookie, SettingsService settings) =>
        {
            var s = settings.Current;
            int take = Math.Clamp(limit ?? 50, 1, 200);
            var me = cookie.Read(ctx.Request);
            var players = await db.Players.AsNoTracking().Where(p => p.Races > 0 && p.BannedAt == null)
                .Select(p => new { p.Id, p.HandleTitle, p.HandleNumber, p.Mu, p.Sigma, p.Races }).ToListAsync();

            List<(Guid Id, int Title, int Number, long Value, int Races)> rows;
            if (board == "week")
            {
                // Gain = valuation now minus valuation before their first rated race of the last 7 days.
                var since = DateTimeOffset.UtcNow.AddDays(-7);
                var recent = await db.RaceResults.AsNoTracking()
                    .Where(r => r.PlayerId != null && r.ValuationBefore != null && r.Race.EndedAt >= since && r.Race.VoidedAt == null && !r.Voided)
                    .Select(r => new { Id = r.PlayerId!.Value, r.RaceId, Before = r.ValuationBefore!.Value })
                    .ToListAsync();
                var firsts = recent.GroupBy(r => r.Id).ToDictionary(g => g.Key, g => g.MinBy(r => r.RaceId)!.Before);
                rows = players.Where(p => firsts.ContainsKey(p.Id))
                    .Select(p => (p.Id, p.HandleTitle, p.HandleNumber, s.Valuation(p.Mu, p.Sigma) - firsts[p.Id], p.Races))
                    .ToList();
            }
            else
            {
                rows = players.Select(p => (p.Id, p.HandleTitle, p.HandleNumber, s.Valuation(p.Mu, p.Sigma), p.Races)).ToList();
            }
            rows = rows.OrderByDescending(r => r.Value).ThenBy(r => r.Number).ToList();

            object? mine = null;
            if (me is Guid mid)
            {
                int i = rows.FindIndex(r => r.Id == mid);
                if (i >= 0) mine = new { rank = i + 1, valuation = rows[i].Value };
                else if (board != "week" && await db.Players.FindAsync(mid) is { } mp)
                    mine = new { rank = (int?)null, valuation = s.Valuation(mp.Mu, mp.Sigma) };
                else if (board == "week") mine = new { rank = (int?)null, valuation = 0L };
            }
            return Results.Json(new
            {
                rows = rows.Take(take).Select((r, i) => new
                {
                    rank = i + 1,
                    handle = new { title = r.Title, number = r.Number },
                    valuation = r.Value,
                    races = r.Races,
                    me = r.Id == me,
                }),
                me = mine,
            });
        });
    }

    static object SessionView(Player p, KartSettings s) => new
    {
        id = p.Id,
        handle = new { title = p.HandleTitle, number = p.HandleNumber },
        rating = new { valuation = s.Valuation(p.Mu, p.Sigma), races = p.Races },
    };

    public sealed record HandleRequest(int? Title);

    /// <summary>The WebSocket handshake: an allowed origin, a valid player cookie, and no ban.</summary>
    public static async Task HandleSocket(HttpContext ctx, KartDb db, PlayerCookie cookie, OriginPolicy origins, RoomManager rooms)
    {
        if (!ctx.WebSockets.IsWebSocketRequest) { ctx.Response.StatusCode = 400; return; }
        if (!origins.IsAllowed(ctx.Request.Headers.Origin)) { ctx.Response.StatusCode = 403; return; }
        if (cookie.Read(ctx.Request) is not Guid id || await db.Players.FindAsync(id) is not { } p || p.BannedAt != null)
        {
            ctx.Response.StatusCode = 403;
            return;
        }
        p.LastSeenAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        var info = new PlayerInfo { Id = p.Id, HandleTitle = p.HandleTitle, HandleNumber = p.HandleNumber, Mu = p.Mu, Sigma = p.Sigma };
        using var ws = await ctx.WebSockets.AcceptWebSocketAsync();
        await rooms.RunAsync(ws, info, ctx.RequestAborted);
    }
}
