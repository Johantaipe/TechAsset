using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TechAsset.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EsquemaInicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Equipo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CodigoPatrimonial = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Categoria = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Marca = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Estado = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipo", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Usuario",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombres = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Apellidos = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Correo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Area = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Estado = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuario", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Prestamo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    EquipoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ResponsableId = table.Column<Guid>(type: "uuid", nullable: false),
                    FechaPrestamo = table.Column<DateOnly>(type: "date", nullable: false),
                    FechaDevolucion = table.Column<DateOnly>(type: "date", nullable: true),
                    Observacion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Prestamo", x => x.Id);
                    table.CheckConstraint("ck_devolucion_fecha", "\"FechaDevolucion\" IS NULL OR \"FechaDevolucion\" > \"FechaPrestamo\"");
                    table.CheckConstraint("ck_devolucion_observacion", "\"FechaDevolucion\" IS NULL OR COALESCE(length(btrim(\"Observacion\")), 0) > 0");
                    table.ForeignKey(
                        name: "FK_Prestamo_Equipo_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "Equipo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Prestamo_Usuario_ResponsableId",
                        column: x => x.ResponsableId,
                        principalTable: "Usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Prestamo_Usuario_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SolicitudPrestamo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    EquipoId = table.Column<Guid>(type: "uuid", nullable: false),
                    FechaPrestamo = table.Column<DateOnly>(type: "date", nullable: false),
                    PrestamoId = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolicitudPrestamo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SolicitudPrestamo_Equipo_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "Equipo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SolicitudPrestamo_Prestamo_PrestamoId",
                        column: x => x.PrestamoId,
                        principalTable: "Prestamo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SolicitudPrestamo_Usuario_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ux_equipo_codigo",
                table: "Equipo",
                column: "CodigoPatrimonial",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Prestamo_ResponsableId",
                table: "Prestamo",
                column: "ResponsableId");

            migrationBuilder.CreateIndex(
                name: "IX_Prestamo_UsuarioId",
                table: "Prestamo",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "ux_prestamo_activo",
                table: "Prestamo",
                column: "EquipoId",
                unique: true,
                filter: "\"FechaDevolucion\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudPrestamo_EquipoId",
                table: "SolicitudPrestamo",
                column: "EquipoId");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudPrestamo_PrestamoId",
                table: "SolicitudPrestamo",
                column: "PrestamoId");

            migrationBuilder.CreateIndex(
                name: "ux_solicitud_pendiente",
                table: "SolicitudPrestamo",
                columns: new[] { "UsuarioId", "EquipoId" },
                unique: true,
                filter: "\"PrestamoId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "ux_usuario_correo",
                table: "Usuario",
                column: "Correo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SolicitudPrestamo");

            migrationBuilder.DropTable(
                name: "Prestamo");

            migrationBuilder.DropTable(
                name: "Equipo");

            migrationBuilder.DropTable(
                name: "Usuario");
        }
    }
}
