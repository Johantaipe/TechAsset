using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TechAsset.API.Seguridad;
using TechAsset.Application;
using TechAsset.Domain;

namespace TechAsset.API.Controllers;

[ApiController, Route("api/prestamos")]
public sealed class PrestamosController(InventarioService servicio, CuentasAcceso cuentas) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<Prestamo>> Listar([FromQuery] bool activos, CancellationToken ct) =>
        (await servicio.Listar<Prestamo>(ct))
            .Where(prestamo => !activos || prestamo.FechaDevolucion is null)
            .Where(prestamo => !User.IsInRole(Roles.Colaborador) || prestamo.UsuarioId == User.UsuarioId())
            .OrderByDescending(prestamo => prestamo.FechaPrestamo);

    [HttpGet("participantes")]
    [Authorize(Roles = Roles.Personal)]
    public async Task<IEnumerable<Participante>> Participantes(CancellationToken ct)
    {
        var personal = await cuentas.CuentasDelPersonal(ct);
        return (await servicio.Listar<Usuario>(ct))
            .Select(usuario => new Participante(usuario.Id, usuario.Nombres, usuario.Apellidos,
                usuario.Estado && !personal.Contains(usuario.Id)));
    }

    [HttpPost]
    [Authorize(Roles = Roles.Tecnologia)]
    public async Task<ActionResult<Prestamo>> Crear(NuevoPrestamo datos, CancellationToken ct)
    {
        if ((await cuentas.CuentasDelPersonal(ct)).Contains(datos.UsuarioId))
            throw new ReglaDeNegocio("Selecciona un colaborador habilitado para el préstamo.");

        return StatusCode(201, await servicio.Prestar(datos, User.UsuarioId(), ct));
    }

    public sealed record Participante(Guid Id, string Nombres, string Apellidos, bool PuedeRecibirPrestamo);

    [HttpPost("{id:guid}/solicitud-devolucion")]
    [Authorize(Roles = Roles.Colaborador)]
    public async Task<IActionResult> SolicitarDevolucion(Guid id, CancellationToken ct)
    {
        await servicio.SolicitarDevolucion(id, User.UsuarioId(), ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/devolucion")]
    [Authorize(Roles = Roles.Tecnologia)]
    public async Task<IActionResult> Devolver(Guid id, Devolucion datos, CancellationToken ct)
    {
        await servicio.Devolver(id, datos, ct);
        return NoContent();
    }
}
