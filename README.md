# TechAsset

Sistema de gestión de inventario y préstamo de equipos tecnológicos para Innovatech Solutions S.A.C.

## Estructura

- `backend/TechAsset.sln` agrupa la API REST y las capas Application, Domain e Infrastructure.
- `frontend/` contiene la aplicación Vite con React y TypeScript.
- La API depende de Application e Infrastructure. Infrastructure depende de Application y Application depende de Domain.
- EF Core usa Npgsql para PostgreSQL. La configuración del modelo incluye claves foráneas, unicidad de correo y código patrimonial, un índice único para préstamos activos y restricciones de devolución.

## Ejecutar en tu computadora personal

Abre PowerShell en la raíz de TechAsset, donde están las carpetas `frontend` y `backend`.

- Para el frontend, necesitas Node.js 22 o 24 con npm y acceso al registro de paquetes.
- Para compilar y ejecutar el backend, necesitas el SDK de .NET 8.
- PostgreSQL se necesita únicamente para usar el modo conectado con la API real.

### Demostración sin API ni base de datos

Desde la raíz del proyecto, instala las dependencias, comprueba la compilación e inicia Vite en modo de demostración.

```powershell
cd frontend
npm.cmd install
npm.cmd run build
npm.cmd run demo
```

Abre en Chrome la URL local que imprime Vite, normalmente [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Mantén abierta la terminal mientras usas la aplicación. Busca el aviso **Modo demostración**. Los registros son ficticios y las operaciones se resuelven en el navegador. Los cambios se pierden al recargar la página. Puedes detener Vite con `Ctrl+C`.

Usa el selector **Rol de demostración** para probar los tres actores. Como **Colaborador**, solicita un equipo desde **Préstamos y devoluciones**. Sin recargar la página, cambia a **Responsable de Tecnología**, aprueba la solicitud y registra la devolución con una fecha posterior y observaciones. Como **Administrador**, puedes supervisar los préstamos, consultar reportes y deshabilitar usuarios.

`npm.cmd run build` comprueba el tipado y genera la distribución normal en `frontend/dist/`. La demostración se inicia con `npm.cmd run demo`.

### Compilar el backend sin base de datos

Desde la raíz de TechAsset:

```powershell
dotnet build backend/TechAsset.sln -m:1
```

Este comando compila las cuatro capas. La restauración de paquetes puede requerir acceso a NuGet.

### Ejecutar con PostgreSQL local

La base de esta instalación se llama `TechAsset`. El esquema inicial está versionado en
`backend/TechAsset.Infrastructure/Migrations/`. La API exige ese nombre de base y
usa el rol PostgreSQL `techasset_app` para leer y guardar datos. Las migraciones se
aplican por separado con una cuenta autorizada para cambios de esquema.

Desde la raíz del proyecto, inicia la API con su configuración privada:

```powershell
$env:TechAsset__ArchivoPrivado = (Resolve-Path .local/privado/secrets.json).Path
dotnet run --project backend/TechAsset.API --launch-profile http
```

Usa el runtime ASP.NET Core 8. Si solo tienes ASP.NET Core 10, puedes probar
localmente configurando `$env:DOTNET_ROLL_FORWARD = 'Major'` en esa sesión.

En una segunda terminal, inicia el frontend:

```powershell
cd frontend
npm.cmd run dev
```

Abre la URL que imprime Vite. El frontend reenvía `/api` a `127.0.0.1:5106`.
Las cuentas de prueba de esta instalación están en `.local/privado/cuentas-prueba.json`.
Ambos archivos de `.local/privado/` son privados y están excluidos del repositorio.
Para otra instalación, configura `ConnectionStrings__TechAsset` y los datos de
`Acceso:Cuentas` por variables privadas o por un archivo local de desarrollo.
Cada cuenta requiere un usuario habilitado, un rol válido y un hash compatible con
`PasswordHasher<T>` de ASP.NET Core Identity.

## Registrar usuarios y habilitar acceso

En **Usuarios → Registrar usuario**, ingresa nombres, apellidos, rol, alias del correo
corporativo y una contraseña de 12 a 256 caracteres. Confirma la contraseña y pulsa
**Guardar → Sí, registrar**. El perfil y el hash se guardan juntos en PostgreSQL con
`PasswordHasher<T>` de ASP.NET Core Identity. El usuario puede entrar con su correo
completo y su contraseña. **Editar usuario** conserva la contraseña y el rol.

Para un perfil previo habilitado con rol asignado, entra como Administrador y busca
el usuario en **Usuarios → Directorio**. Selecciona **Establecer contraseña inicial**,
ingresa y confirma una contraseña acordada con el usuario, y pulsa **Habilitar acceso**.
La credencial queda vinculada al mismo ID. La acción solo está disponible para
perfiles que aún carecen de credenciales. Comunica la contraseña de forma privada.

La migración `CredencialesUsuario` crea la tabla del mismo nombre sin actualizar los
perfiles existentes. Las cuentas de `Acceso:Cuentas` conservan sus credenciales y roles.
Antes de aplicar la migración, genera y verifica un respaldo privado de la base
`TechAsset`. Aplícala con la cuenta autorizada para cambios de esquema. La migración
otorga permisos de lectura e inserción sobre la nueva tabla a `techasset_app` si el
rol existe. Luego vuelve a iniciar la API con su conexión habitual.

## Alcance de esta versión

- Usuarios: registro, edición, consulta, búsqueda y deshabilitación por el administrador.
- Inventario: registro, edición, filtros por texto y estado, y actualización del estado.
- Préstamos: registro con colaborador, equipo y responsable, historial y filtro de activos.
- Solicitudes: el colaborador consulta y solicita sus propios préstamos. El Responsable de Tecnología aprueba la solicitud y el sistema registra el préstamo si el equipo sigue disponible.
- Devoluciones: registro desde un préstamo activo con fecha posterior y observación obligatoria.
- Reportes: seis indicadores, préstamos por área, equipos más utilizados e historial de préstamos y devoluciones.

El modelo añade un identificador del usuario responsable para satisfacer RN-05. Los reportes por área usan el área actual del colaborador. El historial de movimientos se deriva de las fechas del préstamo y la devolución.

El caso práctico no especifica rechazo ni cancelación de solicitudes. La aprobación conserva la fecha solicitada y toma al usuario autenticado de Tecnología como responsable. La instalación local usa un esquema propio y cuentas de prueba aprovisionadas en la configuración privada.
