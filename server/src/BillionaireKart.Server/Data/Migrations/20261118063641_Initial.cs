using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BillionaireKart.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "players",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    handle_title = table.Column<int>(type: "integer", nullable: false),
                    handle_number = table.Column<int>(type: "integer", nullable: false),
                    mu = table.Column<double>(type: "double precision", nullable: false),
                    sigma = table.Column<double>(type: "double precision", nullable: false),
                    races = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_seen_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    banned_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_players", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "races",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    room_code = table.Column<string>(type: "text", nullable: false),
                    track_id = table.Column<string>(type: "text", nullable: false),
                    cc = table.Column<int>(type: "integer", nullable: false),
                    level = table.Column<string>(type: "text", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    voided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_races", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "settings",
                columns: table => new
                {
                    key = table.Column<string>(type: "text", nullable: false),
                    value = table.Column<string>(type: "text", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_settings", x => x.key);
                });

            migrationBuilder.CreateTable(
                name: "race_results",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    race_id = table.Column<long>(type: "bigint", nullable: false),
                    slot = table.Column<int>(type: "integer", nullable: false),
                    racer = table.Column<string>(type: "text", nullable: false),
                    player_id = table.Column<Guid>(type: "uuid", nullable: true),
                    cpu_level = table.Column<string>(type: "text", nullable: true),
                    rank = table.Column<int>(type: "integer", nullable: false),
                    time_seconds = table.Column<double>(type: "double precision", nullable: true),
                    estimated = table.Column<bool>(type: "boolean", nullable: false),
                    absent = table.Column<bool>(type: "boolean", nullable: false),
                    voided = table.Column<bool>(type: "boolean", nullable: false),
                    mu_before = table.Column<double>(type: "double precision", nullable: true),
                    sigma_before = table.Column<double>(type: "double precision", nullable: true),
                    mu_after = table.Column<double>(type: "double precision", nullable: true),
                    sigma_after = table.Column<double>(type: "double precision", nullable: true),
                    valuation_before = table.Column<long>(type: "bigint", nullable: true),
                    valuation_after = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_race_results", x => x.id);
                    table.ForeignKey(
                        name: "fk_race_results_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_race_results_races_race_id",
                        column: x => x.race_id,
                        principalTable: "races",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_players_handle_number",
                table: "players",
                column: "handle_number");

            migrationBuilder.CreateIndex(
                name: "ix_race_results_player_id_race_id",
                table: "race_results",
                columns: new[] { "player_id", "race_id" });

            migrationBuilder.CreateIndex(
                name: "ix_race_results_race_id",
                table: "race_results",
                column: "race_id");

            migrationBuilder.CreateIndex(
                name: "ix_races_ended_at",
                table: "races",
                column: "ended_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "race_results");

            migrationBuilder.DropTable(
                name: "settings");

            migrationBuilder.DropTable(
                name: "players");

            migrationBuilder.DropTable(
                name: "races");
        }
    }
}
