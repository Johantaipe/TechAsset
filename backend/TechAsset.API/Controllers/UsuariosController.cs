using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TechAsset.API.Seguridad;
using TechAsset.Application;
using TechAsset.Domain;

namespace TechAsset.API.Controllers;

[ApiController, Route("api/usuarios")]
public sealed class UsuariosController(InventarioService servicio, CuentasAcceso acceso,
    IPasswordHasher<CuentaAcceso> hasher) : ControllerBase
{
    public sealed record AltaUsuario(
        [Required, StringLength(100)] string Nombres,
        [Required, StringLength(100)] string Apellidos,
        [Required, EmailAddress, StringLength(150)] string Correo,
        [Required] RolUsuario? Rol,
        [Required, StringLength(256, MinimumLength = 12)] string Contrasena,
        [Required, StringLength(256)] string ConfirmarContrasena,
        [StringLength(100)] string? Area = null);

    public sealed record ContrasenaInicial(
        [Required, StringLength(256, MinimumLength = 12)] string Contrasena,
        [Required, StringLength(256)] string ConfirmarContrasena);

    [HttpGet]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var cuentas = acceso.Configuradas;
        var conCredencial = (await acceso.UsuariosConCredencial(ct)).ToHashSet();
        var usuarios = await servicio.Listar<Usuario>(ct);
        return Ok(usuarios.Select(usuario => new
        {
            usuario.Id, usuario.Nombres, usuario.Apellidos, usuario.Correo, usuario.Area, usuario.Estado, usuario.NumeroDirectorio,
            PuedeEstablecerContrasena = usuario.Estado && usuario.Rol.HasValue &&
                !conCredencial.Contains(usuario.Id) && !cuentas.Any(c => c.UsuarioId == usuario.Id ||
                    string.Equals(c.Correo, usuario.Correo, StringComparison.OrdinalIgnoreCase)),
            Rol = Enum.TryParse<RolUsuario>(cuentas.FirstOrDefault(c => c.UsuarioId == usuario.Id)?.Rol, out var rol)
                && Enum.IsDefined(rol) ? rol : usuario.Rol
        }));
    }

    [HttpPost]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<ActionResult<Usuario>> Crear(AltaUsuario datos, CancellationToken ct)
    {
        if (CorreoConfigurado(datos.Correo))
            throw new ReglaDeNegocio("El correo electrónico ya está registrado.");

        var perfil = new DatosUsuario(datos.Nombres, datos.Apellidos, datos.Correo, datos.Area, datos.Rol);
        return StatusCode(201, await servicio.RegistrarUsuario(perfil, CrearHash(datos.Contrasena, datos.ConfirmarContrasena), ct));
    }

    [HttpPost("{id:guid}/contrasena-inicial")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<IActionResult> EstablecerContrasena(Guid id, ContrasenaInicial datos, CancellationToken ct)
    {
        var usuario = await servicio.BuscarUsuario(id, ct);
        if (acceso.Configuradas.Any(c => c.UsuarioId == id) || CorreoConfigurado(usuario.Correo))
            throw new ReglaDeNegocio("El usuario ya tiene credenciales de acceso.");

        await servicio.EstablecerContrasenaInicial(id, CrearHash(datos.Contrasena, datos.ConfirmarContrasena), ct);
        return NoContent();
    }

    private bool CorreoConfigurado(string correo) => acceso.Configuradas.Any(c =>
        string.Equals(c.Correo, correo.Trim(), StringComparison.OrdinalIgnoreCase));

    private string CrearHash(string contrasena, string confirmacion)
    {
        if (contrasena != confirmacion)
            throw new ValidationException("Las contraseñas deben coincidir.");

        return hasher.HashPassword(new CuentaAcceso(), contrasena);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.Administrador)]
    public Task<Usuario> Actualizar(Guid id, DatosUsuario datos, CancellationToken ct) =>
        CorreoConfigurado(datos.Correo) &&
        !acceso.Configuradas.Any(c => c.UsuarioId == id && string.Equals(c.Correo, datos.Correo.Trim(), StringComparison.OrdinalIgnoreCase))
            ? throw new ReglaDeNegocio("El correo electrónico ya está registrado.")
            : servicio.ActualizarUsuario(id, datos, ct);

    [HttpPatch("{id:guid}/deshabilitar")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<IActionResult> Deshabilitar(Guid id, CancellationToken ct)
    {
        await servicio.DeshabilitarUsuario(id, User.UsuarioId(), ct);
        return NoContent();
    }
}
