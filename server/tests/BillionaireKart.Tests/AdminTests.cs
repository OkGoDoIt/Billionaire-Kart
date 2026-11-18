using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace BillionaireKart.Tests;

[Collection("app")]
public sealed partial class AdminTests(TestApp app)
{
    [GeneratedRegex("name=\"__RequestVerificationToken\" type=\"hidden\" value=\"([^\"]+)\"")]
    private static partial Regex AntiforgeryField();

    static async Task<string> FormToken(HttpClient http, string path)
    {
        var html = await http.GetStringAsync(path);
        return AntiforgeryField().Match(html).Groups[1].Value;
    }

    async Task<HttpClient> SignedIn()
    {
        var http = app.Http(cookies: true);
        var token = await FormToken(http, "/admin/signin");
        var res = await http.PostAsync("/admin/signin", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["token"] = TestApp.AdminToken, ["__RequestVerificationToken"] = token,
        }));
        Assert.Equal(HttpStatusCode.Redirect, res.StatusCode);
        return http;
    }

    [Fact]
    public async Task Admin_is_missing_without_a_token_and_needs_sign_in_with_one()
    {
        await using (var noToken = app.Factory.WithWebHostBuilder(b =>
            b.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(new Dictionary<string, string?> { ["Kart:AdminToken"] = "" }))))
        {
            var r = await noToken.CreateClient().GetAsync("/admin");
            Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await noToken.CreateClient().GetAsync("/admin/signin")).StatusCode);
        }

        var anon = app.Http();
        var redirect = await anon.GetAsync("/admin/settings");
        Assert.Equal(HttpStatusCode.Redirect, redirect.StatusCode);
        Assert.Contains("/admin/signin", redirect.Headers.Location!.ToString());

        // A wrong token does not sign in.
        var http = app.Http(cookies: true);
        var token = await FormToken(http, "/admin/signin");
        var wrong = await http.PostAsync("/admin/signin", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["token"] = "nope", ["__RequestVerificationToken"] = token,
        }));
        Assert.Equal(HttpStatusCode.OK, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.Redirect, (await http.GetAsync("/admin")).StatusCode);

        var admin = await SignedIn();
        foreach (var page in new[] { "/admin", "/admin/players", "/admin/races", "/admin/settings" })
        {
            var res = await admin.GetAsync(page);
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }

    [Fact]
    public async Task A_settings_edit_takes_effect_without_a_restart()
    {
        await app.UseSettings();
        var admin = await SignedIn();
        var token = await FormToken(admin, "/admin/settings");

        var bad = await admin.PostAsync("/admin/settings", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["key"] = "MaxMembersPerRoom", ["value"] = "99", ["__RequestVerificationToken"] = token,
        }));
        Assert.Equal(HttpStatusCode.OK, bad.StatusCode);
        Assert.Contains("Enter a number from 1 to 8", await bad.Content.ReadAsStringAsync());

        var ok = await admin.PostAsync("/admin/settings", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["key"] = "MaxMembersPerRoom", ["value"] = "1", ["__RequestVerificationToken"] = token,
        }));
        Assert.Equal(HttpStatusCode.Redirect, ok.StatusCode);
        Assert.Equal(1, app.Settings.Current.MaxMembersPerRoom);

        try
        {
            await using var a = await app.NewGamer();
            await using var b = await app.NewGamer();
            await a.Send(new { t = "create" });
            var room = await a.Room(_ => true);
            await b.Send(new { t = "join", code = room.Str("code") });
            Assert.Equal("full", (await b.Next("err")).Str("code"));
        }
        finally { await app.UseSettings(); }
    }
}
