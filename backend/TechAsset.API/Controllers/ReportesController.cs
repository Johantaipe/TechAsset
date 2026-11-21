using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TechAsset.API.Seguridad;
using TechAsset.Application;

namespace TechAsset.API.Controllers;

[ApiController, Route("api/reportes")]
[Authorize(Roles = Roles.Administrador)]
public sealed class ReportesController(ReportesService servicio) : ControllerBase
{
    [HttpGet("dashboard")]
    public Task<Indicadores> Dashboard(CancellationToken ct) => servicio.Dashboard(ct);

    [HttpGet("por-area")]
    public Task<UsoArea[]> PorArea([FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta, CancellationToken ct) => servicio.PorArea(desde, hasta, ct);

    [HttpGet("equipos-mas-utilizados")]
    public Task<UsoEquipo[]> MasUtilizados([FromQuery] DateOnly? desde, [FromQuery] DateOnly? hasta, CancellationToken ct) => servicio.MasUtilizados(desde, hasta, ct);

    [HttpGet("movimientos")]
    public Task<Movimiento[]> Movimientos(CancellationToken ct) => servicio.Movimientos(ct);
}
