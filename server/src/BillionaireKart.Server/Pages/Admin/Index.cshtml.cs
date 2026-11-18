using BillionaireKart.Server.Data;
using BillionaireKart.Server.Rooms;
using BillionaireKart.Server.Settings;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace BillionaireKart.Server.Pages.Admin;

public sealed class IndexModel(KartDb db, RoomManager rooms, SettingsService settings) : PageModel
{
    public sealed record RoomRow(string Code, bool Public, string Phase, int Members, int Connected);

    public int RoomCount { get; private set; }
    public int Online { get; private set; }
    public int RacesDay { get; private set; }
    public int RacesWeek { get; private set; }
    public List<RoomRow> Rooms { get; } = [];
    public List<Player> Newest { get; private set; } = [];

    public long Valuation(Player p) => settings.Current.Valuation(p.Mu, p.Sigma);

    public async Task OnGetAsync()
    {
        Online = rooms.ConnectedCount;
        foreach (var room in rooms.Rooms.Values.OrderBy(r => r.Code))
        {
            await RoomManager.WithRoom(room, r =>
            {
                if (!r.Closed)
                    Rooms.Add(new RoomRow(r.Code, r.IsPublic, Fmt.Phase(r.Phase), r.Members.Count, r.Members.Count(m => m.Connected)));
                return Task.CompletedTask;
            });
        }
        RoomCount = Rooms.Count;
        var now = DateTimeOffset.UtcNow;
        var day = now.AddDays(-1);
        var week = now.AddDays(-7);
        RacesDay = await db.Races.CountAsync(r => r.EndedAt >= day && r.VoidedAt == null);
        RacesWeek = await db.Races.CountAsync(r => r.EndedAt >= week && r.VoidedAt == null);
        Newest = await db.Players.AsNoTracking().OrderByDescending(p => p.CreatedAt).Take(15).ToListAsync();
    }
}
