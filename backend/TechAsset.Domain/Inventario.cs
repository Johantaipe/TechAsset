namespace TechAsset.Domain;

public enum EstadoEquipo { Disponible, Prestado, Mantenimiento, Baja }

public enum RolUsuario { Administrador, Tecnologia, Colaborador }

public sealed class Usuario
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Nombres { get; set; } = "";
    public string Apellidos { get; set; } = "";
    public string Correo { get; set; } = "";
    public string? Area { get; set; }
    public long NumeroDirectorio { get; private set; }
    public RolUsuario? Rol { get; init; }
    public bool Estado { get; private set; } = true;

    public void Deshabilitar() => Estado = false;
}

public sealed class CredencialUsuario
{
    public Guid UsuarioId { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public required string Hash { get; init; }
}

public sealed class Equipo
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string CodigoPatrimonial { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Categoria { get; set; } = "";
    public string Marca { get; set; } = "";
    public EstadoEquipo Estado { get; private set; } = EstadoEquipo.Disponible;

    public void CambiarEstado(EstadoEquipo estado)
    {
        if (Estado == EstadoEquipo.Prestado)
            throw new ReglaDeNegocio("Registra primero la devolución del equipo prestado.");
        if (estado is not (EstadoEquipo.Disponible or EstadoEquipo.Mantenimiento or EstadoEquipo.Baja))
            throw new ReglaDeNegocio("El estado Prestado se gestiona mediante préstamos y devoluciones.");
        if (estado == Estado)
            throw new ReglaDeNegocio("Selecciona un estado diferente al actual.");

        Estado = estado;
    }

    internal void Prestar()
    {
        if (Estado != EstadoEquipo.Disponible)
            throw new ReglaDeNegocio("Solo se pueden prestar equipos disponibles.");

        Estado = EstadoEquipo.Prestado;
    }

    internal void Liberar(EstadoEquipo estado)
    {
        if (estado is not (EstadoEquipo.Disponible or EstadoEquipo.Mantenimiento or EstadoEquipo.Baja))
            throw new ReglaDeNegocio("Selecciona la condición del equipo recibido.");

        Estado = estado;
    }
}

public sealed class MovimientoEstadoEquipo
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid EquipoId { get; init; }
    public Guid ResponsableId { get; init; }
    public EstadoEquipo EstadoAnterior { get; init; }
    public EstadoEquipo EstadoNuevo { get; init; }
    public DateTime FechaUtc { get; init; }
    public string Motivo { get; init; } = "";
}

public sealed class Prestamo
{
    private Prestamo() { }

    public Prestamo(Usuario usuario, Equipo equipo, Usuario responsable, DateOnly fecha)
    {
        if (!usuario.Estado || !responsable.Estado)
            throw new ReglaDeNegocio("El colaborador y el responsable deben estar habilitados.");
        UsuarioId = usuario.Id;
        EquipoId = equipo.Id;
        ResponsableId = responsable.Id;
        FechaPrestamo = fecha;
        equipo.Prestar();
    }

    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid UsuarioId { get; private set; }
    public Guid EquipoId { get; private set; }
    public Guid ResponsableId { get; private set; }
    public DateOnly FechaPrestamo { get; private set; }
    public DateOnly? FechaDevolucion { get; private set; }
    public string? Observacion { get; private set; }
    public DateTime? SolicitudDevolucionUtc { get; private set; }

    public void SolicitarDevolucion()
    {
        if (FechaDevolucion.HasValue)
            throw new ReglaDeNegocio("El préstamo ya fue devuelto.");
        if (SolicitudDevolucionUtc.HasValue)
            throw new ReglaDeNegocio("La devolución de este préstamo ya fue solicitada.");

        SolicitudDevolucionUtc = DateTime.UtcNow;
    }

    public void Devolver(Equipo equipo, DateOnly fecha, string observacion, EstadoEquipo estado)
    {
        if (equipo.Id != EquipoId || FechaDevolucion.HasValue || equipo.Estado != EstadoEquipo.Prestado)
            throw new ReglaDeNegocio("El préstamo se debe encontrar activo para registrar una devolución.");
        if (fecha <= FechaPrestamo)
            throw new ReglaDeNegocio("La devolución debe ser posterior al préstamo.");
        if (string.IsNullOrWhiteSpace(observacion))
            throw new ReglaDeNegocio("Registra una observación para la devolución.");

        FechaDevolucion = fecha;
        Observacion = observacion.Trim();
        equipo.Liberar(estado);
    }
}

public sealed class SolicitudPrestamo
{
    private SolicitudPrestamo() { }

    public SolicitudPrestamo(Usuario usuario, Equipo equipo, DateOnly fecha)
    {
        if (!usuario.Estado || equipo.Estado != EstadoEquipo.Disponible)
            throw new ReglaDeNegocio("La solicitud requiere un usuario habilitado y un equipo disponible.");
        UsuarioId = usuario.Id;
        EquipoId = equipo.Id;
        FechaPrestamo = fecha;
    }

    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid UsuarioId { get; private set; }
    public Guid EquipoId { get; private set; }
    public DateOnly FechaPrestamo { get; private set; }
    public Guid? PrestamoId { get; private set; }

    public Prestamo Aprobar(Usuario usuario, Equipo equipo, Usuario responsable)
    {
        if (PrestamoId.HasValue || UsuarioId != usuario.Id || EquipoId != equipo.Id)
            throw new ReglaDeNegocio("La solicitud ya se procesó o sus datos no coinciden.");
        var prestamo = new Prestamo(usuario, equipo, responsable, FechaPrestamo);
        PrestamoId = prestamo.Id;
        return prestamo;
    }
}

public sealed class ReglaDeNegocio(string mensaje) : Exception(mensaje);
