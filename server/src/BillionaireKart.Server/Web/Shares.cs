using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using BillionaireKart.Server.Data;
using BillionaireKart.Server.Settings;
using Microsoft.EntityFrameworkCore;

namespace BillionaireKart.Server.Web;

/// <summary>
/// Shared results. The game uploads its card with the words around it; the link it shares, /s/{id}, answers link
/// previewers (Messages, WhatsApp, Slack, Discord) with that card as the preview picture, and sends a person who
/// opens it into the game with the challenge (/?c={id}). The design is on issue #366.
/// </summary>
public static partial class ShareApi
{
    /// <summary>The game shares the link the moment the player taps, and uploads at the same time, so a previewer can
    /// ask for the page before the upload lands. It waits this long for it.</summary>
    static readonly TimeSpan ArrivalWait = TimeSpan.FromSeconds(8);
    static readonly TimeSpan ArrivalPoll = TimeSpan.FromMilliseconds(250);

    [GeneratedRegex("^[A-Za-z0-9]{10,16}$")]
    private static partial Regex IdPattern();

    /// <summary>Link previewers. They get the page without the redirect, so one that runs scripts still reads this
    /// page's preview instead of the game's. Apple's previewer says facebookexternalhit and Twitterbot.</summary>
    [GeneratedRegex("bot|crawl|spider|facebookexternalhit|facebot|whatsapp|slack|discord|telegram|skype|embedly|iframely|vkshare|pinterest|preview", RegexOptions.IgnoreCase)]
    private static partial Regex Previewer();

    public static void Map(WebApplication app)
    {
        app.MapPost("/api/shares", Create);
        app.MapGet("/api/shares/{id}", Get);
        app.MapGet("/s/{key}", Page);
    }

    static async Task<IResult> Create(HttpContext ctx, KartDb db, PlayerCookie cookie, SettingsService settings, ILogger<Share> log)
    {
        if (cookie.Read(ctx.Request) is not Guid pid || await db.Players.FindAsync(pid) is not { } player || player.BannedAt != null)
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        if (!ctx.Request.HasFormContentType) return Bad("Send the share as a form.");
        var s = settings.Current;
        var form = await ctx.Request.ReadFormAsync(ctx.RequestAborted);

        var file = form.Files["image"];
        if (file == null || file.Length == 0) return Bad("The picture is missing.");
        if (file.Length > s.ShareMaxKilobytes * 1024L) return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);
        var image = new byte[file.Length];
        await using (var stream = file.OpenReadStream()) await stream.ReadExactlyAsync(image, ctx.RequestAborted);
        if (image.Length < 4 || image[0] != 0xFF || image[1] != 0xD8 || image[2] != 0xFF) return Bad("The picture must be a JPEG.");

        string? F(string k) => form.TryGetValue(k, out var v) && v.Count > 0 && !string.IsNullOrWhiteSpace(v[0]) ? v[0]!.Trim() : null;
        int? N(string k) => int.TryParse(F(k), out var n) ? n : null;

        var id = F("id");
        if (id == null || !IdPattern().IsMatch(id)) return Bad("The id must be 10 to 16 letters and digits.");
        if (!Enum.TryParse<ShareMode>(F("mode"), ignoreCase: true, out var mode) || !Enum.IsDefined(mode)) return Bad("Unknown mode.");
        var racer = F("racer");
        if (racer == null || !SettingDef.IsId(racer)) return Bad("Unknown racer.");
        var track = F("track");
        if (track != null && !SettingDef.IsId(track)) return Bad("Unknown track.");
        var cup = F("cup");
        if (cup != null && !SettingDef.IsId(cup)) return Bad("Unknown cup.");
        if (mode == ShareMode.Cup ? cup == null : track == null) return Bad(mode == ShareMode.Cup ? "A cup share needs its cup." : "A race share needs its track.");
        var cc = N("cc");
        if (cc is not (50 or 100 or 150 or 200)) return Bad("Unknown engine class.");
        var rank = N("rank");
        if (rank is not null and not (>= 1 and <= 8)) return Bad("Place must be 1 to 8.");
        var field = N("fieldSize");
        if (field is not null and not (>= 1 and <= 8)) return Bad("Field size must be 1 to 8.");
        var timeMs = N("timeMs");
        if (timeMs is not null and not (> 0 and <= 3_600_000)) return Bad("Time must be under an hour.");
        var points = N("points");
        if (points is not null and not (>= 0 and <= 1000)) return Bad("Points must be 0 to 1000.");
        var title = Words(F("title"), 140);
        var description = Words(F("description"), 240);
        if (title == null || description == null) return Bad("The title and description are needed, in plain text.");

        var now = DateTimeOffset.UtcNow;
        var hourAgo = now.AddHours(-1);
        if (await db.Shares.CountAsync(x => x.PlayerId == pid && x.CreatedAt > hourAgo) >= s.SharesPerHour)
            return Results.StatusCode(StatusCodes.Status429TooManyRequests);
        if (await db.Shares.AnyAsync(x => x.Id == id)) return Results.Conflict(new { error = "That id is taken." });

        // Old shares go as new ones arrive: no timer to run, and the table never holds more than the lifetime's worth.
        var expiry = now.AddDays(-s.ShareKeepDays);
        await db.Shares.Where(x => x.CreatedAt < expiry).ExecuteDeleteAsync(ctx.RequestAborted);

        db.Shares.Add(new Share
        {
            Id = id, PlayerId = pid, CreatedAt = now, Mode = mode, Racer = racer, TrackId = track, CupId = cup, Cc = cc.Value,
            Rank = rank, FieldSize = field, TimeMs = timeMs, Points = points, Title = title, Description = description, Image = image,
        });
        await db.SaveChangesAsync(ctx.RequestAborted);
        log.LogInformation("Share {ShareId} by player {PlayerId}: {Mode} {Where}, {Bytes} bytes", id, pid, mode, track ?? cup, image.Length);
        return Results.Created($"/s/{id}", new { id, url = $"/s/{id}" });
    }

    /// <summary>The challenge a shared link carries, for the game.</summary>
    static async Task<IResult> Get(string id, KartDb db, SettingsService settings)
    {
        if (!IdPattern().IsMatch(id)) return Results.NotFound();
        var since = DateTimeOffset.UtcNow.AddDays(-settings.Current.ShareKeepDays);
        var x = await db.Shares.AsNoTracking().Where(x => x.Id == id && x.CreatedAt >= since)
            .Select(x => new { x.Id, x.Mode, x.Racer, x.TrackId, x.CupId, x.Cc, x.Rank, x.FieldSize, x.TimeMs, x.Points, x.Title })
            .FirstOrDefaultAsync();
        if (x == null) return Results.NotFound();
        return Results.Json(new
        {
            id = x.Id, mode = x.Mode.ToString().ToLowerInvariant(), racer = x.Racer, track = x.TrackId, cup = x.CupId, cc = x.Cc,
            rank = x.Rank, fieldSize = x.FieldSize, timeMs = x.TimeMs, points = x.Points, title = x.Title,
        });
    }

    /// <summary>/s/{id}: the preview page, and /s/{id}.jpg: its picture. Unknown and expired links open the game's home.</summary>
    static async Task<IResult> Page(string key, HttpContext ctx, KartDb db, SettingsService settings)
    {
        bool picture = key.EndsWith(".jpg", StringComparison.Ordinal);
        var id = picture ? key[..^4] : key;
        if (!IdPattern().IsMatch(id)) return picture ? Results.NotFound() : Results.Redirect("/");
        var since = DateTimeOffset.UtcNow.AddDays(-settings.Current.ShareKeepDays);
        var deadline = DateTimeOffset.UtcNow + ArrivalWait;

        if (picture)
        {
            var image = db.Shares.AsNoTracking().Where(x => x.Id == id && x.CreatedAt >= since).Select(x => x.Image);
            var bytes = await image.FirstOrDefaultAsync();
            while (bytes == null && DateTimeOffset.UtcNow < deadline)
            {
                await Task.Delay(ArrivalPoll, ctx.RequestAborted);
                bytes = await image.FirstOrDefaultAsync();
            }
            if (bytes == null) return Results.NotFound();
            ctx.Response.Headers.CacheControl = "public, max-age=86400";
            return Results.File(bytes, "image/jpeg");
        }

        var live = db.Shares.AsNoTracking().Where(x => x.Id == id && x.CreatedAt >= since);
        var row = await live.Select(x => new { x.Title, x.Description }).FirstOrDefaultAsync();
        while (row == null && DateTimeOffset.UtcNow < deadline)
        {
            await Task.Delay(ArrivalPoll, ctx.RequestAborted);
            row = await live.Select(x => new { x.Title, x.Description }).FirstOrDefaultAsync();
        }
        if (row == null) return Results.Redirect("/");

        var origin = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
        bool previewer = Previewer().IsMatch(ctx.Request.Headers.UserAgent.ToString());
        ctx.Response.Headers.CacheControl = "no-cache";
        return Results.Content(Html(origin, id, row.Title, row.Description, redirect: !previewer), "text/html; charset=utf-8");
    }

    static string Html(string origin, string id, string title, string description, bool redirect)
    {
        var e = HtmlEncoder.Default;
        string T = e.Encode(title), D = e.Encode(description);
        string url = $"{origin}/s/{id}", image = $"{origin}/s/{id}.jpg", game = $"/?c={id}";
        // The page a person sees for a moment (or for good, without scripts): the card, the challenge, and one way in.
        return $$"""
            <!doctype html>
            <html lang="en">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>{{T}}</title>
            {{(redirect ? $"<script>location.replace({System.Text.Json.JsonSerializer.Serialize(game)})</script>" : "")}}
            <meta name="description" content="{{D}}">
            <meta name="robots" content="noindex">
            <meta name="theme-color" content="#0b1026">
            <meta property="og:type" content="website">
            <meta property="og:site_name" content="Billionaire Kart">
            <meta property="og:title" content="{{T}}">
            <meta property="og:description" content="{{D}}">
            <meta property="og:url" content="{{url}}">
            <meta property="og:image" content="{{image}}">
            <meta property="og:image:type" content="image/jpeg">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">
            <meta property="og:image:alt" content="{{D}}">
            <meta name="twitter:card" content="summary_large_image">
            <link rel="icon" href="/assets/icons/icon-192.png">
            <link rel="apple-touch-icon" href="/assets/icons/icon-180.png">
            <style>
              @font-face { font-family: "Luckiest Guy"; src: url("/assets/fonts/luckiestguy-latin.woff2") format("woff2"); font-display: swap; }
              @font-face { font-family: "Fredoka"; src: url("/assets/fonts/fredoka-latin.woff2") format("woff2"); font-weight: 300 700; font-display: swap; }
              body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(ellipse at 50% 40%, #1b2350, #0b1026); color: #fffdf5; font: 600 18px/1.4 "Fredoka", "Trebuchet MS", sans-serif; }
              main { width: min(640px, 100% - 32px); text-align: center; padding: 24px 0; }
              img { width: 100%; height: auto; border-radius: 16px; border: 4px solid #12142b; box-shadow: 0 10px 30px rgba(0,0,0,.5); }
              h1 { font: 28px/1.15 "Luckiest Guy", "Arial Black", sans-serif; letter-spacing: .02em; margin: 22px 0 6px; }
              p { margin: 0 0 24px; opacity: .85; }
              a { display: inline-block; padding: 14px 40px 10px; border-radius: 18px; background: linear-gradient(180deg, #7dffc9, #2ee6a6); color: #12142b; text-decoration: none; font: 24px "Luckiest Guy", "Arial Black", sans-serif; letter-spacing: .02em; border: 4px solid #12142b; box-shadow: 0 6px 0 rgba(0,0,0,.42); }
            </style>
            </head>
            <body>
            <main>
            <img src="{{image}}" width="1200" height="630" alt="{{D}}">
            <h1>{{T}}</h1>
            <p>{{D}}</p>
            <a href="{{game}}">Race it</a>
            </main>
            </body>
            </html>
            """;
    }

    /// <summary>One line of plain text, at most <paramref name="max"/> characters, or null.</summary>
    static string? Words(string? s, int max)
    {
        if (s == null) return null;
        s = string.Join(' ', s.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (s.Length == 0 || s.Length > max || s.Any(char.IsControl)) return null;
        return s;
    }

    static IResult Bad(string error) => Results.BadRequest(new { error });
}
