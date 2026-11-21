using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TechAsset.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RolUsuarioDirectorio : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Rol",
                table: "Usuario",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_usuario_rol",
                table: "Usuario",
                sql: "\"Rol\" IS NULL OR \"Rol\" IN ('Administrador', 'Tecnologia', 'Colaborador')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_usuario_rol",
                table: "Usuario");

            migrationBuilder.DropColumn(
                name: "Rol",
                table: "Usuario");
        }
    }
}
