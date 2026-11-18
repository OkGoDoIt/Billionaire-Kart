using System.Globalization;
using BillionaireKart.Server.Settings;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace BillionaireKart.Server.Pages.Admin;

public sealed class SettingsModel(SettingsService settings) : PageModel
{
    public Dictionary<string, string> Errors { get; } = [];
    public string? Attempt { get; private set; }
    public IReadOnlyList<string> Tracks => settings.Current.Tracks;

    public string Current(string key) => settings.ValueOf(key);

    public string DefaultText(SettingDef d) => d.Kind switch
    {
        SettingKind.Integer or SettingKind.Number => d.Unit == "" ? d.Default : $"{d.Default} {d.Unit}",
        SettingKind.Choice => ChoiceText(d, d.Default),
        SettingKind.List => d.Default,
        SettingKind.Map => "the three standard cups",
        SettingKind.TrackSeconds => "no checks",
        _ => throw new ArgumentOutOfRangeException(nameof(d)),
    };

    public string ChoiceText(SettingDef d, string choice) =>
        d.Unit != "" ? $"{choice} {d.Unit}" : CultureInfo.InvariantCulture.TextInfo.ToTitleCase(choice);

    public Dictionary<string, double> TrackSeconds(string stored) =>
        SettingDef.ParseMap(stored, out _).ToDictionary(kv => kv.Key, kv => double.Parse(kv.Value[0], CultureInfo.InvariantCulture));

    public void OnGet() { }

    public async Task<IActionResult> OnPostAsync(string key)
    {
        if (!SettingDef.ByKey.TryGetValue(key ?? "", out var def)) return BadRequest();
        string value;
        if (def.Kind == SettingKind.TrackSeconds)
        {
            // Keep entries for tracks not listed any more; replace the ones on the form.
            var map = TrackSeconds(settings.ValueOf(key!));
            foreach (var field in Request.Form.Where(f => f.Key.StartsWith("track:", StringComparison.Ordinal)))
            {
                var track = field.Key["track:".Length..];
                var text = field.Value.ToString().Trim();
                if (text == "") map.Remove(track);
                else if (double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var s)) map[track] = s;
                else { Errors[key!] = $"Enter seconds for {track}, or leave it empty."; return Page(); }
            }
            value = string.Join("\n", map.Select(kv => $"{kv.Key}: {kv.Value.ToString("R", CultureInfo.InvariantCulture)}"));
        }
        else value = Request.Form["value"].ToString();

        var errors = await settings.SaveAsync(new Dictionary<string, string> { [key!] = value });
        if (errors.Count > 0)
        {
            foreach (var (k, v) in errors) Errors[k] = v;
            Attempt = value;
            return Page();
        }
        TempData["Notice"] = $"Saved {def.Label.ToLowerInvariant()}.";
        return Redirect($"/admin/settings#{key}");
    }
}
