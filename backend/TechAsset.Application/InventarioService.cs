using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using TechAsset.Domain;

namespace TechAsset.Application;

public sealed class InventarioService(IInventario inventario)
{
    public Task<List<T>> Listar<T>(CancellationToken ct) where T : class => inventario.Listar<T>(ct);

    public Task<Usuario> BuscarUsuario(Guid id, CancellationToken ct) => Buscar<Usuario>(id, ct);

    public async Task<bool> UsuarioHabilitado(Guid id, CancellationToken ct) =>
        (await inventario.Buscar<Usuario>(id, ct))?.Estado == true;

    public async Task DeshabilitarUsuario(Guid id, Guid administradorId, CancellationToken ct)
    {
        if (id == administradorId)
            throw new ReglaDeNegocio("No puedes deshabilitar tu propia cuenta.");
        var usuario = await Buscar<Usuario>(id, ct);
        usuario.Deshabilitar();
        await inventario.Guardar(ct);
    }

    public Task<Usuario> RegistrarUsuario(DatosUsuario datos, string hash, CancellationToken ct) =>
        GuardarUsuario(null, datos, hash, ct);

    public Task<Usuario> ActualizarUsuario(Guid id, DatosUsuario datos, CancellationToken ct) =>
        GuardarUsuario(id, datos, null, ct);

    public async Task EstablecerContrasenaInicial(Guid id, string hash, CancellationToken ct)
    {
        var usuario = await Buscar<Usuario>(id, ct);
        if (!usuario.Estado || usuario.Rol is not { } rol || !Enum.IsDefined(rol))
            throw new ReglaDeNegocio("El usuario debe estar habilitado y tener un rol válido.");
        if (await inventario.Buscar<CredencialUsuario>(id, ct) is not null)
            throw new ReglaDeNegocio("El usuario ya tiene credenciales de acceso.");

        inventario.Agregar(new CredencialUsuario { UsuarioId = id, Hash = hash });
        await inventario.Guardar(ct);
    }

    private async Task<Usuario> GuardarUsuario(Guid? id, DatosUsuario datos, string? hash, CancellationToken ct)
    {
        var correo = datos.Correo.Trim().ToLowerInvariant();
        if (!id.HasValue)
        {
            if (datos.Rol is not { } rol || !Enum.IsDefined(rol))
                throw new ValidationException("Selecciona un rol de TechAsset.");
            if (!Regex.IsMatch(correo, @"\A(?=[^@]{1,64}@)[a-z0-9]+(?:[._+-][a-z0-9]+)*@innovatech\.com\.pe\z"))
                throw new ValidationException("Usa un correo corporativo válido de @innovatech.com.pe.");
        }
        var usuario = id.HasValue ? await Buscar<Usuario>(id.Value, ct) : new Usuario { Rol = datos.Rol };
        usuario.Nombres = datos.Nombres.Trim();
        usuario.Apellidos = datos.Apellidos.Trim();
        usuario.Correo = correo;
        if (datos.Area is { } area)
        {
            var normalizada = ReportesService.AreaOficial(area)
                ?? throw new ValidationException("Selecciona Sistemas, Operaciones o Contabilidad.");
            usuario.Area = normalizada;
        }
        if (!id.HasValue)
        {
            inventario.Agregar(usuario);
            inventario.Agregar(new CredencialUsuario { UsuarioId = usuario.Id, Hash = hash! });
        }
        await inventario.Guardar(ct);
        return usuario;
    }

    public async Task<Equipo> GuardarEquipo(Guid? id, DatosEquipo datos, CancellationToken ct)
    {
        var equipo = id.HasValue ? await Buscar<Equipo>(id.Value, ct) : new Equipo();
        if (id.HasValue && (equipo.Estado == EstadoEquipo.Prestado || await inventario.TienePrestamoActivo(equipo.Id, ct)))
            throw new ReglaDeNegocio("Registra primero la devolución antes de editar este equipo.");

        equipo.CodigoPatrimonial = datos.CodigoPatrimonial.Trim().ToUpperInvariant();
        equipo.Nombre = datos.Nombre.Trim();
        equipo.Categoria = datos.Categoria.Trim();
        equipo.Marca = datos.Marca.Trim();
        if (!id.HasValue) inventario.Agregar(equipo);
        await inventario.Guardar(ct);
        return equipo;
    }

    public async Task CambiarEstado(Guid id, EstadoEquipo estado, string motivo, Guid responsableId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(motivo) || motivo.Length > 500)
            throw new ValidationException("Indica un motivo de hasta 500 caracteres.");

        var equipo = await Buscar<Equipo>(id, ct);
        if (await inventario.TienePrestamoActivo(id, ct))
            throw new ReglaDeNegocio("Registra primero la devolución del préstamo activo de este equipo.");

        var estadoAnterior = equipo.Estado;
        equipo.CambiarEstado(estado);
        inventario.Agregar(new MovimientoEstadoEquipo
        {
            EquipoId = id, ResponsableId = responsableId, EstadoAnterior = estadoAnterior,
            EstadoNuevo = estado, FechaUtc = DateTime.UtcNow, Motivo = motivo.Trim()
        });
        await inventario.Guardar(ct);
    }

    public async Task<Prestamo> Prestar(NuevoPrestamo datos, Guid responsableId, CancellationToken ct)
    {
        if (datos.FechaPrestamo == default)
            throw new ValidationException("Indica la fecha de préstamo.");
        var usuario = await Buscar<Usuario>(datos.UsuarioId, ct);
        var responsable = await Buscar<Usuario>(responsableId, ct);
        var equipo = await Buscar<Equipo>(datos.EquipoId, ct);
        var prestamo = new Prestamo(usuario, equipo, responsable, datos.FechaPrestamo);
        inventario.Agregar(prestamo);
        await inventario.Guardar(ct);
        return prestamo;
    }

    public async Task<SolicitudPrestamo> Solicitar(Guid usuarioId, NuevaSolicitud datos, CancellationToken ct)
    {
        if (datos.FechaPrestamo == default)
            throw new ValidationException("Indica la fecha de préstamo.");
        var usuario = await Buscar<Usuario>(usuarioId, ct);
        var equipo = await Buscar<Equipo>(datos.EquipoId, ct);
        if (await inventario.TienePrestamoActivo(equipo.Id, ct))
            throw new ReglaDeNegocio("El equipo tiene un préstamo activo.");
        var solicitud = new SolicitudPrestamo(usuario, equipo, datos.FechaPrestamo);
        inventario.Agregar(solicitud);
        await inventario.Guardar(ct);
        return solicitud;
    }

    public async Task<Prestamo> Aprobar(Guid solicitudId, Guid responsableId, CancellationToken ct)
    {
        var solicitud = await Buscar<SolicitudPrestamo>(solicitudId, ct);
        var usuario = await Buscar<Usuario>(solicitud.UsuarioId, ct);
        var equipo = await Buscar<Equipo>(solicitud.EquipoId, ct);
        var responsable = await Buscar<Usuario>(responsableId, ct);
        var prestamo = solicitud.Aprobar(usuario, equipo, responsable);
        inventario.Agregar(prestamo);
        await inventario.Guardar(ct);
        return prestamo;
    }

    public async Task SolicitarDevolucion(Guid id, Guid usuarioId, CancellationToken ct)
    {
        var prestamo = await Buscar<Prestamo>(id, ct);
        if (prestamo.UsuarioId != usuarioId) throw new RegistroNoEncontrado();
        prestamo.SolicitarDevolucion();
        await inventario.Guardar(ct);
    }

    public async Task Devolver(Guid id, Devolucion datos, CancellationToken ct)
    {
        var prestamo = await Buscar<Prestamo>(id, ct);
        var equipo = await Buscar<Equipo>(prestamo.EquipoId, ct);
        prestamo.Devolver(equipo, datos.FechaDevolucion, datos.Observacion, datos.EstadoEquipo);
        await inventario.Guardar(ct);
    }

    private async Task<T> Buscar<T>(Guid id, CancellationToken ct) where T : class =>
        await inventario.Buscar<T>(id, ct) ?? throw new RegistroNoEncontrado();
}
