using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TechAsset.API.Seguridad;
using TechAsset.Application;

namespace TechAsset.API.Controllers;

[ApiController, Route("api/sesion")]
public sealed class SesionController(CuentasAcceso cuentas, InventarioService inventario,
    IPasswordHasher<CuentaAcceso> hasher) : ControllerBase
{
    public sealed record Credenciales([Required, EmailAddress, StringLength(150)] string Correo,
        [Required, StringLength(256)] string Contrasena);

    [HttpPost, AllowAnonymous, EnableRateLimiting("inicio-sesion")]
    public async Task<ActionResult<SesionActual>> Entrar(Credenciales datos, CancellationToken ct)
    {
        var cuenta = await cuentas.BuscarPorCorreo(datos.Correo, ct);
        if (cuenta is null || cuenta.UsuarioId == Guid.Empty ||
            cuenta.Rol is not (Roles.Administrador or Roles.Tecnologia or Roles.Colaborador) ||
            !Coincide(cuenta, datos.Contrasena) || !await inventario.UsuarioHabilitado(cuenta.UsuarioId, ct))
            return Unauthorized();

        var identidad = new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, cuenta.UsuarioId.ToString()),
            new Claim(ClaimTypes.Email, cuenta.Correo),
            new Claim(ClaimTypes.Role, cuenta.Rol)
        ], CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(new ClaimsPrincipal(identidad));
        return new SesionActual(cuenta.UsuarioId, cuenta.Rol);
    }

    [HttpGet]
    public SesionActual Actual() => new(User.UsuarioId(), User.FindFirstValue(ClaimTypes.Role)!);

    [HttpDelete, AllowAnonymous]
    public async Task<IActionResult> Salir()
    {
        await HttpContext.SignOutAsync();
        return NoContent();
    }

    private bool Coincide(CuentaAcceso cuenta, string contrasena)
    {
        if (string.IsNullOrWhiteSpace(cuenta.Hash)) return false;
        try { return hasher.VerifyHashedPassword(cuenta, cuenta.Hash, contrasena) != PasswordVerificationResult.Failed; }
        catch (FormatException) { return false; }
    }
}
