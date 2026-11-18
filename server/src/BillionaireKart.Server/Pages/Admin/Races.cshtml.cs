using BillionaireKart.Server.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace BillionaireKart.Server.Pages.Admin;

public sealed class RacesModel(KartDb db, ILogger<RacesModel> log) : PageModel
{
    public List<Race> Rows { get; private set; } = [];
    public Dictionary<Guid, Player> Players { get; private set; } = [];

    public async Task OnGetAsync()
    {
        Rows = await db.Races.AsNoTracking().Include(r => r.Results).OrderByDescending(r => r.Id).Take(100).ToListAsync();
        var ids = Rows.SelectMany(r => r.Results).Where(r => r.PlayerId != null).Select(r => r.PlayerId!.Value).Distinct().ToList();
        Players = await db.Players.AsNoTracking().Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
    }

    /// <summary>Marks the race void and, for each person whose latest rated race this was, puts their rating back.</summary>
    public async Task<IActionResult> OnPostVoidAsync(long id)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var race = await db.Races.Include(r => r.Results).FirstOrDefaultAsync(r => r.Id == id);
        if (race == null) return NotFound();
        if (race.VoidedAt != null) return Redirect("/admin/races");

        int restored = 0;
        foreach (var r in race.Results.Where(r => r.PlayerId != null && r.MuBefore != null && r.SigmaBefore != null))
        {
            var pid = r.PlayerId!.Value;
            var latest = await db.RaceResults
                .Where(x => x.PlayerId == pid && x.Race.VoidedAt == null)
                .MaxAsync(x => (long?)x.RaceId);
            if (latest != race.Id) continue;
            var p = await db.Players.FindAsync(pid);
            if (p == null) continue;
            p.Mu = r.MuBefore!.Value;
            p.Sigma = r.SigmaBefore!.Value;
            if (!r.Voided && p.Races > 0) p.Races--;
            restored++;
        }
        race.VoidedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        log.LogInformation("Admin voided race {RaceId}; restored {Count} rating(s)", id, restored);
        TempData["Notice"] = restored == 1 ? "Voided the race and restored 1 rating." : $"Voided the race and restored {restored} ratings.";
        return Redirect($"/admin/races#race-{id}");
    }
}
