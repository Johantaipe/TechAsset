using TechAsset.Domain;

namespace TechAsset.Application;

public sealed record Indicadores(int TotalEquipos, int Disponibles, int Prestados, int Mantenimiento,
    int TotalPrestamos, string[] AreasConMayorUso);
public sealed record UsoEquipo(Guid EquipoId, string Equipo, int Total);
public sealed record UsoArea(string Area, int Total);
public sealed record Movimiento(Guid? PrestamoId, Guid EquipoId, DateOnly Fecha, string Tipo,
    Guid? IdCambio = null, Guid? ResponsableId = null, string? Motivo = null, DateTime? FechaUtc = null,
    EstadoEquipo? EstadoAnterior = null, EstadoEquipo? EstadoNuevo = null);

public sealed class ReportesService(IInventario inventario)
{
    public async Task<Indicadores> Dashboard(CancellationToken ct)
    {
        var equipos = await inventario.Listar<Equipo>(ct);
        var prestamos = await inventario.Listar<Prestamo>(ct);
        var areas = AgruparAreas(prestamos, await inventario.Listar<Usuario>(ct));
        string[] mayorUso = areas.Length == 0 ? [] : areas.Where(area => area.Total == areas[0].Total)
            .Select(area => area.Area).ToArray();

        return new(equipos.Count, equipos.Count(e => e.Estado == EstadoEquipo.Disponible),
            equipos.Count(e => e.Estado == EstadoEquipo.Prestado),
            equipos.Count(e => e.Estado == EstadoEquipo.Mantenimiento), prestamos.Count, mayorUso);
    }

    private static readonly string[] Areas = ["Sistemas", "Operaciones", "Contabilidad"];

    internal static string? AreaOficial(string? area) =>
        Areas.FirstOrDefault(nombre => string.Equals(nombre, area?.Trim(), StringComparison.OrdinalIgnoreCase));

    public async Task<UsoArea[]> PorArea(DateOnly? desde, DateOnly? hasta, CancellationToken ct)
    {
        var prestamos = EnRango(await inventario.Listar<Prestamo>(ct), desde, hasta);
        var usuarios = await inventario.Listar<Usuario>(ct);
        var grupos = prestamos.Join(usuarios, p => p.UsuarioId, u => u.Id, (_, u) => u.Area)
            .GroupBy(area => AreaOficial(area) ?? (string.IsNullOrWhiteSpace(area) ? "Sin área registrada" : "Área histórica: " + area.Trim()),
                StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);
        return Areas.Select(area => new UsoArea(area, grupos.GetValueOrDefault(area)))
            .Concat(grupos.Where(g => !Areas.Contains(g.Key)).OrderBy(g => g.Key).Select(g => new UsoArea(g.Key, g.Value)))
            .ToArray();
    }

    private static IEnumerable<Prestamo> EnRango(IEnumerable<Prestamo> prestamos, DateOnly? desde, DateOnly? hasta) =>
        prestamos.Where(p => (!desde.HasValue || p.FechaPrestamo >= desde.Value)
            && (!hasta.HasValue || p.FechaPrestamo <= hasta.Value));

    public async Task<UsoEquipo[]> MasUtilizados(DateOnly? desde, DateOnly? hasta, CancellationToken ct)
    {
        var prestamos = await inventario.Listar<Prestamo>(ct);
        var equipos = await inventario.Listar<Equipo>(ct);
        return EnRango(prestamos, desde, hasta).GroupBy(p => p.EquipoId)
            .Join(equipos, grupo => grupo.Key, equipo => equipo.Id,
                (grupo, equipo) => new UsoEquipo(equipo.Id, equipo.Nombre, grupo.Count()))
            .OrderByDescending(uso => uso.Total).ThenBy(uso => uso.Equipo).ToArray();
    }

    public async Task<Movimiento[]> Movimientos(CancellationToken ct)
    {
        var prestamos = await inventario.Listar<Prestamo>(ct);
        var cambios = await inventario.Listar<MovimientoEstadoEquipo>(ct);
        return prestamos.SelectMany(p => p.FechaDevolucion is { } fecha
                ? new[] { new Movimiento(p.Id, p.EquipoId, p.FechaPrestamo, "Préstamo"),
                          new Movimiento(p.Id, p.EquipoId, fecha, "Devolución") }
                : new[] { new Movimiento(p.Id, p.EquipoId, p.FechaPrestamo, "Préstamo") })
            .Concat(prestamos.Where(p => p.SolicitudDevolucionUtc.HasValue).Select(p =>
                new Movimiento(p.Id, p.EquipoId, DateOnly.FromDateTime(p.SolicitudDevolucionUtc!.Value),
                    "Solicitud de devolución", FechaUtc: p.SolicitudDevolucionUtc)))
            .Concat(cambios.Select(c => new Movimiento(null, c.EquipoId, DateOnly.FromDateTime(c.FechaUtc),
                "Cambio de estado", c.Id, c.ResponsableId, c.Motivo, c.FechaUtc, c.EstadoAnterior, c.EstadoNuevo)))
            .OrderByDescending(m => m.Fecha).ThenByDescending(m => m.FechaUtc).ToArray();
    }

    private static UsoArea[] AgruparAreas(List<Prestamo> prestamos, List<Usuario> usuarios) =>
        prestamos.Join(usuarios, p => p.UsuarioId, u => u.Id, (_, u) => u.Area)
            .OfType<string>()
            .GroupBy(area => area, StringComparer.OrdinalIgnoreCase)
            .Select(grupo => new UsoArea(grupo.Key, grupo.Count()))
            .OrderByDescending(uso => uso.Total).ThenBy(uso => uso.Area).ToArray();
}
