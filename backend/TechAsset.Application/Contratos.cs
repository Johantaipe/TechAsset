using System.ComponentModel.DataAnnotations;
using TechAsset.Domain;

namespace TechAsset.Application;

public sealed record DatosUsuario(
    [Required, StringLength(100)] string Nombres,
    [Required, StringLength(100)] string Apellidos,
    [Required, EmailAddress, StringLength(150)] string Correo,
    [StringLength(100)] string? Area = null,
    RolUsuario? Rol = null);

public sealed record DatosEquipo(
    [Required, StringLength(50)] string CodigoPatrimonial,
    [Required, StringLength(100)] string Nombre,
    [Required, StringLength(50)] string Categoria,
    [Required, StringLength(50)] string Marca);

public sealed record CambioEstado([Required] EstadoEquipo? Estado, [Required, StringLength(500)] string Motivo);
public sealed record NuevoPrestamo(Guid UsuarioId, Guid EquipoId, DateOnly FechaPrestamo);
public sealed record NuevaSolicitud(Guid EquipoId, DateOnly FechaPrestamo);
public sealed record Devolucion(DateOnly FechaDevolucion, [Required] string Observacion, EstadoEquipo EstadoEquipo = EstadoEquipo.Disponible);

public interface IInventario
{
    Task<List<T>> Listar<T>(CancellationToken ct) where T : class;
    Task<T?> Buscar<T>(Guid id, CancellationToken ct) where T : class;
    Task<bool> TienePrestamoActivo(Guid equipoId, CancellationToken ct);
    void Agregar<T>(T entidad) where T : class;
    Task Guardar(CancellationToken ct);
}

public sealed class RegistroNoEncontrado : Exception { }
