using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TechAsset.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class HistorialEstadoEquipo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MovimientoEstadoEquipo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EquipoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ResponsableId = table.Column<Guid>(type: "uuid", nullable: false),
                    EstadoAnterior = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    EstadoNuevo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    FechaUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Motivo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MovimientoEstadoEquipo", x => x.Id);
                    table.CheckConstraint("ck_movimiento_estado_distinto", "\"EstadoAnterior\" <> \"EstadoNuevo\"");
                    table.CheckConstraint("ck_movimiento_estado_motivo", "length(btrim(\"Motivo\")) > 0");
                    table.ForeignKey(
                        name: "FK_MovimientoEstadoEquipo_Equipo_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "Equipo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MovimientoEstadoEquipo_Usuario_ResponsableId",
                        column: x => x.ResponsableId,
                        principalTable: "Usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'techasset_app') THEN
                        GRANT SELECT, INSERT ON TABLE "MovimientoEstadoEquipo" TO techasset_app;
                    END IF;
                END;
                $$;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_MovimientoEstadoEquipo_EquipoId",
                table: "MovimientoEstadoEquipo",
                column: "EquipoId");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientoEstadoEquipo_ResponsableId",
                table: "MovimientoEstadoEquipo",
                column: "ResponsableId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MovimientoEstadoEquipo");
        }
    }
}
