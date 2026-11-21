using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TechAsset.Application;
using Npgsql;
using TechAsset.API.Seguridad;
using TechAsset.Domain;
using TechAsset.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
if (builder.Environment.IsDevelopment() && builder.Configuration["TechAsset:ArchivoPrivado"] is { Length: > 0 } archivoPrivado)
{
    archivoPrivado = Path.GetFullPath(archivoPrivado);
    builder.Configuration.AddJsonFile(archivoPrivado, optional: false).AddEnvironmentVariables().AddCommandLine(args);
    var claves = new DirectoryInfo(Path.Combine(Path.GetDirectoryName(archivoPrivado)!, "claves-sesion"));
    claves.Create();
    var proteccion = builder.Services.AddDataProtection().PersistKeysToFileSystem(claves);
    if (OperatingSystem.IsWindows())
        proteccion.ProtectKeysWithDpapi();
}
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false)));
var conexion = builder.Configuration.GetConnectionString("TechAsset")
    ?? throw new InvalidOperationException("Configura ConnectionStrings__TechAsset.");
if (!string.Equals(new NpgsqlConnectionStringBuilder(conexion).Database, "TechAsset", StringComparison.Ordinal))
    throw new InvalidOperationException("La conexión debe apuntar a la base TechAsset.");
builder.Services.AddDbContext<InventarioDb>(options => options.UseNpgsql(conexion));
builder.Services.AddScoped<IInventario, InventarioRepository>();
builder.Services.AddScoped<InventarioService>();
builder.Services.AddScoped<ReportesService>();
builder.Services.AddScoped<CuentasAcceso>();
builder.Services.AddScoped<ValidarSesion>();
builder.Services.AddScoped<IPasswordHasher<CuentaAcceso>, PasswordHasher<CuentaAcceso>>();
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
{
    options.EventsType = typeof(ValidarSesion);
    options.Cookie.Name = "TechAsset.Session";
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromHours(2);
    options.SlidingExpiration = false;
});
builder.Services.AddAuthorization(options =>
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("inicio-sesion", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "local",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 12, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();
app.UseExceptionHandler(new ExceptionHandlerOptions { AllowStatusCode404Response = true, ExceptionHandler = async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var (status, detail) = error switch
    {
        RegistroNoEncontrado => (404, "El registro solicitado no existe."),
        ReglaDeNegocio => (409, error.Message),
        ValidationException => (400, error.Message),
        _ => (500, "No se pudo completar la operación.")
    };
    await Results.Problem(detail, statusCode: status).ExecuteAsync(context);
}});
app.UseRouting();
app.UseRateLimiter();
app.Use(async (context, next) =>
{
    if (!HttpMethods.IsGet(context.Request.Method) &&
        !HttpMethods.IsHead(context.Request.Method) &&
        context.Request.Headers["X-TechAsset-Request"] != "1")
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return;
    }
    await next(context);
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
