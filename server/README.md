# Billionaire Kart server

Rooms, the shared clock, kart ownership, finishing order, ratings, and the admin for online play.
The wire contract is `docs/online-protocol.md`. ASP.NET Core (.NET 10) with Postgres; rooms live in memory.

## Run locally

```sh
createdb billionaire_kart_dev                         # once
cd server/src/BillionaireKart.Server
Kart__AdminToken=pick-one dotnet run                  # http://localhost:5105
```

Development migrates on start, serves the game from the repo root (`Kart:StaticRoot` in
`appsettings.Development.json`), and allows `http://localhost:*` origins. The admin is at `/admin`
and exists only when `Kart__AdminToken` is set. Set `Kart__KeyDirectory` if you want cookies to
survive restarts locally.

Production settings: `ConnectionStrings__Kart`, `Kart__KeyDirectory`, `Kart__AllowedOrigins`
(semicolon-separated), `Kart__AdminToken`, and optionally `Kart__Sha`. Apply migrations with
`dotnet BillionaireKart.Server.dll migrate` as the database owner; the app never migrates in Production.

## Test

From the repo root (needs local Postgres; the run drops and recreates `billionaire_kart_test`):

```sh
node tools/with-slot.mjs dotnet test server
```

## Add a migration

```sh
cd server
dotnet tool restore
ConnectionStrings__Kart="Host=localhost;Database=billionaire_kart_dev" \
  node ../tools/with-slot.mjs dotnet dotnet-ef migrations add <Name> \
  --project src/BillionaireKart.Server --output-dir Data/Migrations
```

Business numbers are typed settings (`Settings/KartSettings.cs`), edited in `/admin/settings`.
