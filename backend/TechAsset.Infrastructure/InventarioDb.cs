using Microsoft.EntityFrameworkCore;
using Npgsql;
using TechAsset.Application;
using TechAsset.Domain;

namespace TechAsset.Infrastructure;

public sealed class InventarioDb(DbContextOptions<InventarioDb> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder model)
    {
        var usuario = model.Entity<Usuario>();
        usuario.Property(x => x.Nombres).HasMaxLength(100);
        usuario.Property(x => x.Apellidos).HasMaxLength(100);
        usuario.Property(x => x.Correo).HasMaxLength(150);
        usuario.Property(x => x.Area).HasMaxLength(100);
        usuario.Property(x => x.NumeroDirectorio).UseIdentityByDefaultColumn();
        usuario.HasIndex(x => x.NumeroDirectorio).IsUnique();
        usuario.Property(x => x.Rol).HasConversion<string>().HasMaxLength(30);
        usuario.ToTable(tabla => tabla.HasCheckConstraint("ck_usuario_rol",
            "\"Rol\" IS NULL OR \"Rol\" IN ('Administrador', 'Tecnologia', 'Colaborador')"));
        usuario.HasIndex(x => x.Correo).IsUnique().HasDatabaseName("ux_usuario_correo");

        var credencial = model.Entity<CredencialUsuario>();
        credencial.HasKey(x => x.UsuarioId);
        credencial.Property(x => x.Hash).HasMaxLength(256).IsRequired();
        credencial.HasOne<Usuario>().WithOne().HasForeignKey<CredencialUsuario>(x => x.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        var equipo = model.Entity<Equipo>();
        equipo.Property(x => x.CodigoPatrimonial).HasMaxLength(50);
        equipo.Property(x => x.Nombre).HasMaxLength(100);
        equipo.Property(x => x.Categoria).HasMaxLength(50);
        equipo.Property(x => x.Marca).HasMaxLength(50);
        equipo.Property(x => x.Estado).HasConversion<string>().HasMaxLength(30);
        equipo.Property<uint>("Version").IsRowVersion();
        equipo.HasIndex(x => x.CodigoPatrimonial).IsUnique().HasDatabaseName("ux_equipo_codigo");

        var movimiento = model.Entity<MovimientoEstadoEquipo>();
        movimiento.Property(x => x.EstadoAnterior).HasConversion<string>().HasMaxLength(30);
        movimiento.Property(x => x.EstadoNuevo).HasConversion<string>().HasMaxLength(30);
        movimiento.Property(x => x.Motivo).HasMaxLength(500).IsRequired();
        movimiento.HasOne<Equipo>().WithMany().HasForeignKey(x => x.EquipoId).OnDelete(DeleteBehavior.Restrict);
        movimiento.HasOne<Usuario>().WithMany().HasForeignKey(x => x.ResponsableId).OnDelete(DeleteBehavior.Restrict);
        movimiento.ToTable(tabla =>
        {
            tabla.HasCheckConstraint("ck_movimiento_estado_distinto", "\"EstadoAnterior\" <> \"EstadoNuevo\"");
            tabla.HasCheckConstraint("ck_movimiento_estado_motivo", "length(btrim(\"Motivo\")) > 0");
        });

        var prestamo = model.Entity<Prestamo>();
        prestamo.Property<uint>("Version").IsRowVersion();
        prestamo.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        prestamo.HasOne<Usuario>().WithMany().HasForeignKey(x => x.ResponsableId).OnDelete(DeleteBehavior.Restrict);
        prestamo.HasOne<Equipo>().WithMany().HasForeignKey(x => x.EquipoId).OnDelete(DeleteBehavior.Restrict);
        prestamo.HasIndex(x => x.EquipoId).IsUnique()
            .HasFilter("\"FechaDevolucion\" IS NULL").HasDatabaseName("ux_prestamo_activo");
        prestamo.ToTable(t =>
        {
            t.HasCheckConstraint("ck_devolucion_fecha", "\"FechaDevolucion\" IS NULL OR \"FechaDevolucion\" > \"FechaPrestamo\"");
            t.HasCheckConstraint("ck_devolucion_observacion",
                "\"FechaDevolucion\" IS NULL OR COALESCE(length(btrim(\"Observacion\")), 0) > 0");
        });

        var solicitud = model.Entity<SolicitudPrestamo>();
        solicitud.Property<uint>("Version").IsRowVersion();
        solicitud.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        solicitud.HasOne<Equipo>().WithMany().HasForeignKey(x => x.EquipoId).OnDelete(DeleteBehavior.Restrict);
        solicitud.HasOne<Prestamo>().WithMany().HasForeignKey(x => x.PrestamoId).OnDelete(DeleteBehavior.Restrict);
        solicitud.HasIndex(x => new { x.UsuarioId, x.EquipoId }).IsUnique()
            .HasFilter("\"PrestamoId\" IS NULL").HasDatabaseName("ux_solicitud_pendiente");
    }
}

public sealed class InventarioRepository(InventarioDb db) : IInventario
{
    public Task<List<T>> Listar<T>(CancellationToken ct) where T : class =>
        db.Set<T>().AsNoTracking().ToListAsync(ct);

    public async Task<T?> Buscar<T>(Guid id, CancellationToken ct) where T : class =>
        await db.Set<T>().FindAsync(new object[] { id }, ct);

    public Task<bool> TienePrestamoActivo(Guid equipoId, CancellationToken ct) =>
        db.Set<Prestamo>().AnyAsync(p => p.EquipoId == equipoId && p.FechaDevolucion == null, ct);

    public void Agregar<T>(T entidad) where T : class => db.Set<T>().Add(entidad);

    public async Task Guardar(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ReglaDeNegocio("Otro cambio actualizó los datos. Vuelve a consultar el módulo.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } pg)
        {
            throw new ReglaDeNegocio(pg.ConstraintName switch
            {
                "PK_CredencialUsuario" => "El usuario ya tiene credenciales de acceso.",
                "ux_usuario_correo" => "El correo electrónico ya está registrado.",
                "ux_equipo_codigo" => "El código patrimonial ya está registrado.",
                "ux_prestamo_activo" => "El equipo ya tiene un préstamo activo.",
                "ux_solicitud_pendiente" => "Ya tienes una solicitud pendiente para este equipo.",
                _ => "El registro entra en conflicto con otro existente."
            });
        }
    }
}
