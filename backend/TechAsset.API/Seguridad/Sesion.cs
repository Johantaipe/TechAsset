using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using TechAsset.Domain;
using TechAsset.Infrastructure;

namespace TechAsset.API.Seguridad;

public static class Roles
{
    public const string Administrador = "Administrador";
    public const string Tecnologia = "Tecnologia";
    public const string Colaborador = "Colaborador";
    public const string Personal = Administrador + "," + Tecnologia;
}

public sealed record CuentaAcceso
{
    public Guid UsuarioId { get; init; }
    public string Correo { get; init; } = "";
    public string Hash { get; init; } = "";
    public string Rol { get; init; } = "";
}

public sealed record SesionActual(Guid UsuarioId, string Rol);

public static class Identidad
{
    public static Guid UsuarioId(this ClaimsPrincipal usuario) =>
        Guid.Parse(usuario.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

public sealed class CuentasAcceso(IConfiguration configuracion, InventarioDb db)
{
    public CuentaAcceso[] Configuradas =>
        configuracion.GetSection("Acceso:Cuentas").Get<CuentaAcceso[]>() ?? [];

    public Task<CuentaAcceso?> BuscarPorCorreo(string correo, CancellationToken ct)
    {
        var configuradas = Configuradas;
        var cuenta = configuradas.FirstOrDefault(c => string.Equals(c.Correo, correo, StringComparison.OrdinalIgnoreCase));
        return cuenta is not null ? Task.FromResult<CuentaAcceso?>(cuenta)
            : BuscarRegistradas(configuradas).SingleOrDefaultAsync(c => c.Correo == correo.ToLowerInvariant(), ct);
    }

    public async Task<bool> SesionVigente(Guid id, string? rol, string? correo, CancellationToken ct)
    {
        var configuradas = Configuradas;
        var cuenta = configuradas.FirstOrDefault(c => c.UsuarioId == id && c.Rol == rol && c.Correo == correo);
        if (cuenta is not null)
            return await db.Set<Usuario>().AnyAsync(u => u.Id == id && u.Estado, ct);

        var registrada = await BuscarRegistradas(configuradas).SingleOrDefaultAsync(c => c.UsuarioId == id, ct);
        return registrada is not null && registrada.Rol == rol && registrada.Correo == correo;
    }

    private IQueryable<CuentaAcceso> BuscarRegistradas(CuentaAcceso[] configuradas)
    {
        var idsConfigurados = configuradas.Select(c => c.UsuarioId).ToArray();
        return from usuario in db.Set<Usuario>()
               join credencial in db.Set<CredencialUsuario>() on usuario.Id equals credencial.UsuarioId
               where usuario.Estado && usuario.Rol != null && !idsConfigurados.Contains(usuario.Id)
               select new CuentaAcceso
               {
                   UsuarioId = usuario.Id, Correo = usuario.Correo, Rol = usuario.Rol!.Value.ToString(),
                   Hash = credencial.Hash
               };
    }

    public async Task<HashSet<Guid>> CuentasDelPersonal(CancellationToken ct)
    {
        var configuradas = Configuradas;
        var idsConfigurados = configuradas.Select(c => c.UsuarioId).ToArray();
        var personal = await (from usuario in db.Set<Usuario>()
                              join credencial in db.Set<CredencialUsuario>() on usuario.Id equals credencial.UsuarioId
                              where !idsConfigurados.Contains(usuario.Id) &&
                                  (usuario.Rol == RolUsuario.Administrador || usuario.Rol == RolUsuario.Tecnologia)
                              select usuario.Id).ToListAsync(ct);
        personal.AddRange(configuradas.Where(c => c.Rol is Roles.Administrador or Roles.Tecnologia).Select(c => c.UsuarioId));
        return personal.ToHashSet();
    }

    public Task<List<Guid>> UsuariosConCredencial(CancellationToken ct) =>
        db.Set<CredencialUsuario>().Select(c => c.UsuarioId).ToListAsync(ct);
}

public sealed class ValidarSesion(CuentasAcceso cuentas) : CookieAuthenticationEvents
{
    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        var usuario = context.Principal!;
        var id = usuario.UsuarioId();
        var rol = usuario.FindFirstValue(ClaimTypes.Role);
        var correo = usuario.FindFirstValue(ClaimTypes.Email);
        if (await cuentas.SesionVigente(id, rol, correo, context.HttpContext.RequestAborted))
            return;

        context.RejectPrincipal();
        await context.HttpContext.SignOutAsync();
    }

    public override Task RedirectToLogin(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    }

    public override Task RedirectToAccessDenied(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    }
}
