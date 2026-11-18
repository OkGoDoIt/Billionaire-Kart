using BillionaireKart.Server.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace BillionaireKart.Server.Pages.Admin;

public sealed class SharesModel(KartDb db, ILogger<SharesModel> log) : PageModel
{
    public sealed record Row(string Id, DateTimeOffset CreatedAt, ShareMode Mode, string Racer, string? TrackId, string? CupId, int Cc, string Title, string Description, int Bytes, Guid PlayerId);

    public List<Row> Rows { get; private set; } = [];
    public Dictionary<Guid, Player> Players { get; private set; } = [];
    public int Total { get; private set; }

    public async Task OnGetAsync()
    {
        Total = await db.Shares.CountAsync();
        Rows = await db.Shares.AsNoTracking().OrderByDescending(s => s.CreatedAt).Take(100)
            .Select(s => new Row(s.Id, s.CreatedAt, s.Mode, s.Racer, s.TrackId, s.CupId, s.Cc, s.Title, s.Description, s.Image.Length, s.PlayerId))
            .ToListAsync();
        var ids = Rows.Select(r => r.PlayerId).Distinct().ToList();
        Players = await db.Players.AsNoTracking().Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
    }

    public async Task<IActionResult> OnPostDeleteAsync(string id)
    {
        int n = await db.Shares.Where(s => s.Id == id).ExecuteDeleteAsync();
        if (n > 0) log.LogInformation("Admin deleted share {ShareId}", id);
        TempData["Notice"] = n > 0 ? "Deleted the share. Its link now opens the game's home." : "That share was already gone.";
        return Redirect("/admin/shares");
    }
}
