using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BillionaireKart.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class Shares : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "shares",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    player_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    mode = table.Column<string>(type: "text", nullable: false),
                    racer = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    track_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    cup_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    cc = table.Column<int>(type: "integer", nullable: false),
                    rank = table.Column<int>(type: "integer", nullable: true),
                    field_size = table.Column<int>(type: "integer", nullable: true),
                    time_ms = table.Column<int>(type: "integer", nullable: true),
                    points = table.Column<int>(type: "integer", nullable: true),
                    title = table.Column<string>(type: "character varying(140)", maxLength: 140, nullable: false),
                    description = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    image = table.Column<byte[]>(type: "bytea", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_shares", x => x.id);
                    table.ForeignKey(
                        name: "fk_shares_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_shares_created_at",
                table: "shares",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_shares_player_id_created_at",
                table: "shares",
                columns: new[] { "player_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "shares");
        }
    }
}
