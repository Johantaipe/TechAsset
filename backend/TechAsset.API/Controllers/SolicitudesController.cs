using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TechAsset.API.Seguridad;
using TechAsset.Application;
using TechAsset.Domain;

namespace TechAsset.API.Controllers;

[ApiController, Route("api/solicitudes")]
public sealed class SolicitudesController(InventarioService servicio) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<SolicitudPrestamo>> Listar(CancellationToken ct) =>
        (await servicio.Listar<SolicitudPrestamo>(ct))
            .Where(s => !User.IsInRole(Roles.Colaborador) || s.UsuarioId == User.UsuarioId())
            .OrderByDescending(s => s.FechaPrestamo);

    [HttpPost, Authorize(Roles = Roles.Colaborador)]
    public async Task<ActionResult<SolicitudPrestamo>> Solicitar(NuevaSolicitud datos, CancellationToken ct) =>
        StatusCode(201, await servicio.Solicitar(User.UsuarioId(), datos, ct));

    [HttpPost("{id:guid}/aprobacion"), Authorize(Roles = Roles.Tecnologia)]
    public async Task<ActionResult<Prestamo>> Aprobar(Guid id, CancellationToken ct) =>
        StatusCode(201, await servicio.Aprobar(id, User.UsuarioId(), ct));
}
