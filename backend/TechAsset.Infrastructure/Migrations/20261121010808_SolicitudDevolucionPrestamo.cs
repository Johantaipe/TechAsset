using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TechAsset.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SolicitudDevolucionPrestamo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SolicitudDevolucionUtc",
                table: "Prestamo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "Prestamo",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SolicitudDevolucionUtc",
                table: "Prestamo");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "Prestamo");
        }
    }
}
