using BillionaireKart.Server.Data;
using BillionaireKart.Server.Rating;
using BillionaireKart.Server.Rooms;
using BillionaireKart.Server.Settings;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace BillionaireKart.Server.Pages.Admin;

public sealed class PlayersModel(KartDb db, SettingsService settings, RoomManager rooms, ILogger<PlayersModel> log) : PageModel
{
    [BindProperty(SupportsGet = true)] public int? Number { get; set; }
    public List<Player> Rows { get; private set; } = [];

    public long Valuation(Player p) => settings.Current.Valuation(p.Mu, p.Sigma);

    public async Task OnGetAsync()
    {
        var q = db.Players.AsNoTracking();
        Rows = Number is int n
            ? await q.Where(p => p.HandleNumber == n).OrderByDescending(p => p.LastSeenAt).ToListAsync()
            : await q.OrderByDescending(p => p.LastSeenAt).Take(25).ToListAsync();
    }

    public async Task<IActionResult> OnPostResetAsync(Guid id)
    {
        if (await db.Players.FindAsync(id) is not { } p) return NotFound();
        p.Mu = OpenSkill.Mu;
        p.Sigma = OpenSkill.Sigma;
        await db.SaveChangesAsync();
        log.LogInformation("Admin reset the rating of player {PlayerId}", id);
        TempData["Notice"] = $"Reset the rating of {Fmt.Handle(p.HandleTitle, p.HandleNumber)}.";
        return Back();
    }

    public async Task<IActionResult> OnPostBanAsync(Guid id)
    {
        if (await db.Players.FindAsync(id) is not { } p) return NotFound();
        p.BannedAt ??= DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        rooms.Kick(id);
        log.LogInformation("Admin banned player {PlayerId}", id);
        TempData["Notice"] = $"Banned {Fmt.Handle(p.HandleTitle, p.HandleNumber)}.";
        return Back();
    }

    public async Task<IActionResult> OnPostUnbanAsync(Guid id)
    {
        if (await db.Players.FindAsync(id) is not { } p) return NotFound();
        p.BannedAt = null;
        await db.SaveChangesAsync();
        log.LogInformation("Admin unbanned player {PlayerId}", id);
        TempData["Notice"] = $"Unbanned {Fmt.Handle(p.HandleTitle, p.HandleNumber)}.";
        return Back();
    }

    IActionResult Back() => Redirect(Number is int n ? $"/admin/players?number={n}" : "/admin/players");
}
