using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BillionaireKart.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerAppSeenAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "app_seen_at",
                table: "players",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "app_seen_at",
                table: "players");
        }
    }
}
