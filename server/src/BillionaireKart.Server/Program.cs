using BillionaireKart.Server.Data;
using BillionaireKart.Server.Rating;
using BillionaireKart.Server.Rooms;
using BillionaireKart.Server.Settings;
using BillionaireKart.Server.Web;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

bool migrateOnly = args.Length > 0 && args[0] == "migrate";
var builder = WebApplication.CreateBuilder(args.Where(a => a != "migrate").ToArray());
var config = builder.Configuration;
var env = builder.Environment;

// ---------- configuration (fail fast) ----------

var connectionString = config.GetConnectionString("Kart");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("ConnectionStrings__Kart is not set. Point it at the Postgres database, for example \"Host=localhost;Database=billionaire_kart_dev\".");

var keyDirectory = config["Kart:KeyDirectory"];
if (string.IsNullOrWhiteSpace(keyDirectory) && env.IsProduction() && !migrateOnly)
    throw new InvalidOperationException("Kart__KeyDirectory is not set. Production needs a directory for Data Protection keys so cookies survive restarts.");

// ---------- logging ----------

builder.Logging.ClearProviders();
if (env.IsDevelopment()) builder.Logging.AddSimpleConsole(o => { o.SingleLine = true; o.TimestampFormat = "HH:mm:ss "; });
else builder.Logging.AddJsonConsole(o => o.IncludeScopes = false);

// ---------- services ----------

builder.Services.AddDbContext<KartDb>(o => o.UseNpgsql(connectionString));

var dp = builder.Services.AddDataProtection().SetApplicationName("BillionaireKart");
if (!string.IsNullOrWhiteSpace(keyDirectory)) dp.PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));

builder.Services.AddAuthentication(AdminAuth.Scheme).AddCookie(AdminAuth.Scheme, o =>
{
    o.Cookie.Name = "bk_admin";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = env.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    o.Cookie.Path = "/admin";
    o.ExpireTimeSpan = TimeSpan.FromDays(30);
    o.SlidingExpiration = true;
    o.LoginPath = "/admin/signin";
    o.LogoutPath = "/admin/signout";
    o.AccessDeniedPath = "/admin/signin";
});
builder.Services.AddAuthorization();
builder.Services.AddRazorPages(o =>
{
    o.Conventions.AuthorizeFolder("/Admin");
    o.Conventions.AllowAnonymousToPage("/Admin/SignIn");
});
builder.Services.Configure<RouteOptions>(o => o.LowercaseUrls = true);
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    // nginx on the same machine; KnownProxies defaults to loopback.
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

builder.Services.AddSingleton<SettingsService>();
builder.Services.AddSingleton<RatingService>();
builder.Services.AddSingleton<RoomManager>();
builder.Services.AddSingleton<PlayerCookie>();
builder.Services.AddSingleton<OriginPolicy>();
builder.Services.AddSingleton<AdminAuth>();
builder.Services.AddSingleton<NewPlayerLimit>();
builder.Services.AddSingleton<RoomHandoff>();
builder.Services.AddSingleton<InstalledApp>();
builder.Services.AddHostedService<RoomTicker>();
// After the ticker, so it stops first (see ShutdownDrain). The host's own stop budget covers the longest drain
// plus closing sockets, and stays under systemd's TimeoutStopSec=30.
builder.Services.AddHostedService<ShutdownDrain>();
builder.Services.Configure<HostOptions>(o => o.ShutdownTimeout = TimeSpan.FromSeconds(SettingDef.MaxShutdownDrainSeconds + 3));

var app = builder.Build();

// ---------- database ----------

if (migrateOnly)
{
    using var scope = app.Services.CreateScope();
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<KartDb>();
    var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
    log.LogInformation("Applying {Count} migration(s): {Names}", pending.Count, string.Join(", ", pending));
    await db.Database.MigrateAsync();
    log.LogInformation("Database is up to date");
    return;
}

if (env.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<KartDb>().Database.MigrateAsync();
}
await app.Services.GetRequiredService<SettingsService>().LoadAsync();

// ---------- pipeline ----------

app.UseForwardedHeaders();

var adminAuth = app.Services.GetRequiredService<AdminAuth>();
var origins = app.Services.GetRequiredService<OriginPolicy>();
app.Use(async (ctx, next) =>
{
    var path = ctx.Request.Path;
    // No admin token configured: the admin does not exist.
    if (path.StartsWithSegments("/admin") && !adminAuth.Enabled) { ctx.Response.StatusCode = 404; return; }
    // Cross-site calls to the API are refused; same-origin requests without an Origin header are fine.
    if (path.StartsWithSegments("/api") && ctx.Request.Headers.Origin.Count > 0 && !origins.IsAllowed(ctx.Request.Headers.Origin))
    {
        ctx.Response.StatusCode = 403;
        return;
    }
    await next();
});

var staticRoot = config["Kart:StaticRoot"];
if (!string.IsNullOrWhiteSpace(staticRoot))
{
    var files = new PhysicalFileProvider(Path.GetFullPath(staticRoot, env.ContentRootPath));
    var types = new FileExtensionContentTypeProvider();
    types.Mappings[".webmanifest"] = "application/manifest+json";
    types.Mappings[".glb"] = "model/gltf-binary";
    types.Mappings[".mjs"] = "text/javascript";
    app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = files });
    app.UseStaticFiles(new StaticFileOptions { FileProvider = files, ContentTypeProvider = types });
}
app.UseStaticFiles();

app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(20) });
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/healthz", (RoomManager rooms, IConfiguration c) =>
    Results.Json(new { ok = true, sha = c["Kart:Sha"], protocol = Wire.Proto, minProtocol = Wire.MinProto, rooms = rooms.Rooms.Count, players = rooms.ConnectedCount }));
PlayerApi.Map(app);
app.Map("/ws", PlayerApi.HandleSocket);
app.MapRazorPages();

app.Run();

public partial class Program;
