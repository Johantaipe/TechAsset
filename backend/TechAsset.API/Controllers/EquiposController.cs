using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TechAsset.API.Seguridad;
using TechAsset.Application;
using TechAsset.Domain;

namespace TechAsset.API.Controllers;

[ApiController, Route("api/equipos")]
public sealed class EquiposController(InventarioService servicio) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<Equipo>> Listar([FromQuery] EstadoEquipo? estado, [FromQuery] bool incluirEstados, CancellationToken ct)
    {
        var equipos = (await servicio.Listar<Equipo>(ct)).Where(e => estado is null || e.Estado == estado);
        if (incluirEstados || !User.IsInRole(Roles.Colaborador)) return equipos;

        var propios = (await servicio.Listar<Prestamo>(ct)).Where(p => p.UsuarioId == User.UsuarioId())
            .Select(p => p.EquipoId).ToHashSet();
        propios.UnionWith((await servicio.Listar<SolicitudPrestamo>(ct)).Where(s => s.UsuarioId == User.UsuarioId())
            .Select(s => s.EquipoId));
        return equipos.Where(e => e.Estado == EstadoEquipo.Disponible || propios.Contains(e.Id));
    }

    [HttpPost]
    [Authorize(Roles = Roles.Tecnologia)]
    public async Task<ActionResult<Equipo>> Crear(DatosEquipo datos, CancellationToken ct) =>
        StatusCode(201, await servicio.GuardarEquipo(null, datos, ct));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.Administrador)]
    public Task<Equipo> Actualizar(Guid id, DatosEquipo datos, CancellationToken ct) =>
        servicio.GuardarEquipo(id, datos, ct);

    [HttpPatch("{id:guid}/estado")]
    [Authorize(Roles = Roles.Personal)]
    public async Task<IActionResult> CambiarEstado(Guid id, CambioEstado datos, CancellationToken ct)
    {
        await servicio.CambiarEstado(id, datos.Estado!.Value, datos.Motivo, User.UsuarioId(), ct);
        return NoContent();
    }
}
