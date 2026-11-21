import type { Equipo, EstadoEquipo, Movimiento, Prestamo, SolicitudPrestamo, Usuario } from '../types/inventario'
import { nombresRoles, type Rol, type Sesion } from './sesion'
import { dominioCorporativo, patronAlias, type UsuarioDirectorio } from './usuarios'

const usuarios: UsuarioDirectorio[] = [
  { id: 'demo-u1', numeroDirectorio: 1, rol: 'Colaborador', nombres: 'Lucía', apellidos: 'Torres', correo: 'lucia@example.invalid', area: 'Operaciones', estado: true },
  { id: 'demo-u2', numeroDirectorio: 2, rol: 'Tecnologia', nombres: 'Mateo', apellidos: 'Rojas', correo: 'mateo@example.invalid', area: 'Tecnología', estado: true },
  { id: 'demo-u3', numeroDirectorio: 3, rol: 'Administrador', nombres: 'Elena', apellidos: 'Vega', correo: 'elena@example.invalid', area: 'Administración', estado: true },
]

const equipos: Equipo[] = [
  { id: 'demo-e1', codigoPatrimonial: 'DEMO-001', nombre: 'Laptop', categoria: 'Portátiles', marca: 'Marca demo', estado: 'Prestado' },
  { id: 'demo-e2', codigoPatrimonial: 'DEMO-002', nombre: 'Proyector', categoria: 'Multimedia', marca: 'Marca demo', estado: 'Disponible' },
  { id: 'demo-e3', codigoPatrimonial: 'DEMO-003', nombre: 'Monitor', categoria: 'Pantallas', marca: 'Marca demo', estado: 'Mantenimiento' },
]

const prestamos: Prestamo[] = [
  { id: 'demo-p1', usuarioId: 'demo-u1', equipoId: 'demo-e1', responsableId: 'demo-u2',
    fechaPrestamo: '2026-11-10', fechaDevolucion: null, observacion: null },
]

const solicitudes: SolicitudPrestamo[] = []
const identidades: Record<Rol, string> = { Administrador: 'demo-u3', Tecnologia: 'demo-u2', Colaborador: 'demo-u1' }
function puedeRecibirPrestamo(usuario: Usuario) {
  return usuario.estado && usuario.id !== identidades.Administrador && usuario.id !== identidades.Tecnologia
}

let sesion: Sesion = { rol: 'Administrador', usuarioId: identidades.Administrador }

function problema(detail: string, status: number) {
  return Response.json({ detail }, { status })
}

function sinContenido() {
  return new Response(null, { status: 204 })
}

function fechaValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith('0000')) return false
  const fecha = new Date(valor + 'T00:00:00Z')
  return Number.isFinite(fecha.valueOf()) && fecha.toISOString().slice(0, 10) === valor
}

function agrupar<T>(clasificar: (prestamo: Prestamo) => T) {
  const conteos = new Map<T, number>()
  for (const prestamo of prestamos) {
    const clave = clasificar(prestamo)
    conteos.set(clave, (conteos.get(clave) ?? 0) + 1)
  }
  return [...conteos].sort((a, b) => b[1] - a[1])
}

function reporte(tipo: string) {
  const areas = agrupar(p => usuarios.find(u => u.id === p.usuarioId)?.area ?? '').filter(([area]) => area !== '')
  const contarEstado = (estado: EstadoEquipo) => equipos.filter(e => e.estado === estado).length

  switch (tipo) {
    case 'dashboard':
      return Response.json({
        totalEquipos: equipos.length,
        disponibles: contarEstado('Disponible'),
        prestados: contarEstado('Prestado'),
        mantenimiento: contarEstado('Mantenimiento'),
        totalPrestamos: prestamos.length,
        areasConMayorUso: areas.filter(([, total]) => total === areas[0]?.[1]).map(([area]) => area),
      })
    case 'por-area':
      return Response.json(areas.map(([area, total]) => ({ area, total })))
    case 'equipos-mas-utilizados':
      return Response.json(agrupar(p => p.equipoId).map(([equipoId, total]) => ({
        equipoId, total, equipo: equipos.find(e => e.id === equipoId)?.nombre ?? equipoId,
      })))
    case 'movimientos': {
      const movimientos = prestamos.flatMap(p => {
        const base = { prestamoId: p.id, equipoId: p.equipoId }
        const eventos: Movimiento[] = [{ ...base, fecha: p.fechaPrestamo, tipo: 'Préstamo' }]
        if (p.fechaDevolucion) eventos.push({ ...base, fecha: p.fechaDevolucion, tipo: 'Devolución' })
        return eventos
      })
      return Response.json(movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha)))
    }
    default:
      return problema('Reporte de demostración desconocido.', 404)
  }
}

export function responderDemo(ruta: string, metodo: string, body?: object): Response {
  const [camino, consulta] = ruta.split('?')
  const [recurso, id, accion] = camino.split('/')
  const parametros = new URLSearchParams(consulta)
  const campos = new Map(Object.entries(body ?? {}))
  const campo = (nombre: string): string => {
    const valor: unknown = campos.get(nombre)
    return typeof valor === 'string' ? valor.trim() : ''
  }
  if (recurso === 'sesion') {
    if (metodo === 'GET') return Response.json(sesion)
    if (metodo === 'POST') {
      const rol = campo('rol')
      if (rol !== 'Administrador' && rol !== 'Tecnologia' && rol !== 'Colaborador') {
        return problema('Selecciona un rol de demostración.', 400)
      }
      const usuarioId = identidades[rol]
      if (!usuarios.some(u => u.id === usuarioId && u.estado)) return problema('La cuenta ficticia está deshabilitada.', 403)
      sesion = { rol, usuarioId }
      return Response.json(sesion)
    }
  }
  const admin = sesion.rol === 'Administrador'
  const tecnologia = sesion.rol === 'Tecnologia'
  const colaborador = sesion.rol === 'Colaborador'
  const prohibido = () => problema('Tu rol no tiene permiso para esta operación.', 403)

  if (recurso === 'usuarios') {
    if (!admin) return prohibido()
    if (metodo === 'GET' && !id) return Response.json(usuarios)
    if (metodo === 'PATCH' && accion === 'deshabilitar') {
      if (sesion.usuarioId === id) return problema('No puedes deshabilitar tu propia cuenta.', 409)
      const usuario = usuarios.find(u => u.id === id)
      if (!usuario) return problema('Usuario desconocido.', 404)
      usuario.estado = false
      return sinContenido()
    }
    if (metodo === 'POST' || metodo === 'PUT') {
      const anterior = usuarios.find(u => u.id === id)
      if (metodo === 'PUT' && !anterior) return problema('Usuario desconocido.', 404)

      const correo = campo('correo').toLowerCase()
      const datos = { nombres: campo('nombres'), apellidos: campo('apellidos'), correo }
      if (!Object.values(datos).every(Boolean)) return problema('Completa los datos del usuario.', 400)
      if (usuarios.some(u => u.id !== id && u.correo === correo)) return problema('El correo ya está registrado.', 409)

      if (anterior) return Response.json(Object.assign(anterior, datos))
      const rol = campo('rol')
      const alias = correo.slice(0, -dominioCorporativo.length)
      if (!Object.hasOwn(nombresRoles, rol)) return problema('Selecciona un rol de TechAsset.', 400)
      if (alias.length > 64 || !correo.endsWith(dominioCorporativo) || !new RegExp('^(?:' + patronAlias + ')$').test(alias))
        return problema('Usa un correo corporativo válido de @innovatech.com.pe.', 400)
      const usuario = { id: crypto.randomUUID(), ...datos, area: null, numeroDirectorio: usuarios.length + 1, rol: rol as Rol, estado: true }
      usuarios.push(usuario)
      return Response.json(usuario, { status: 201 })
    }
  }

  if (recurso === 'equipos') {
    if (metodo === 'POST' && colaborador) return prohibido()
    if ((metodo === 'PUT' || metodo === 'PATCH') && !admin) return prohibido()
    if (metodo === 'GET' && !id) {
      const estado = parametros.get('estado')
      const propios = new Set(prestamos.filter(p => p.usuarioId === sesion.usuarioId).map(p => p.equipoId))
      for (const solicitud of solicitudes.filter(s => s.usuarioId === sesion.usuarioId)) propios.add(solicitud.equipoId)
      return Response.json(equipos.filter(e => !estado || e.estado === estado)
        .filter(e => !colaborador || e.estado === 'Disponible' || propios.has(e.id)))
    }

    const anterior = equipos.find(e => e.id === id)
    if (metodo === 'PATCH' && accion === 'estado') {
      if (!anterior) return problema('Equipo desconocido.', 404)
      const estado = campo('estado')
      if (anterior.estado === 'Prestado') return problema('El equipo tiene un préstamo activo.', 409)
      if (estado !== 'Disponible' && estado !== 'Mantenimiento' && estado !== 'Baja') {
        return problema('Selecciona un estado válido.', 400)
      }
      anterior.estado = estado
      return sinContenido()
    }

    if (metodo === 'POST' || metodo === 'PUT') {
      if (metodo === 'PUT' && !anterior) return problema('Equipo desconocido.', 404)

      const codigoPatrimonial = campo('codigoPatrimonial').toUpperCase()
      const datos = { codigoPatrimonial, nombre: campo('nombre'), categoria: campo('categoria'), marca: campo('marca') }
      if (!Object.values(datos).every(Boolean)) return problema('Completa los datos del equipo.', 400)
      if (equipos.some(e => e.id !== id && e.codigoPatrimonial === codigoPatrimonial)) {
        return problema('El código patrimonial ya está registrado.', 409)
      }

      if (anterior) return Response.json(Object.assign(anterior, datos))
      const equipo: Equipo = { id: crypto.randomUUID(), ...datos, estado: 'Disponible' }
      equipos.push(equipo)
      return Response.json(equipo, { status: 201 })
    }
  }

  if (recurso === 'prestamos') {
    if (metodo === 'GET' && id === 'participantes') {
      if (colaborador) return prohibido()
      return Response.json(usuarios.map(usuario => ({
        id: usuario.id, nombres: usuario.nombres, apellidos: usuario.apellidos,
        puedeRecibirPrestamo: puedeRecibirPrestamo(usuario),
      })))
    }
    if (metodo === 'GET' && !id) {
      const activos = parametros.get('activos') === 'true'
      return Response.json(prestamos.filter(p => !activos || p.fechaDevolucion === null)
        .filter(p => !colaborador || p.usuarioId === sesion.usuarioId)
        .sort((a, b) => b.fechaPrestamo.localeCompare(a.fechaPrestamo)))
    }

    if (metodo === 'POST' && !id) {
      if (!tecnologia) return prohibido()
      const usuarioId = campo('usuarioId')
      const responsableId = sesion.usuarioId
      const equipo = equipos.find(e => e.id === campo('equipoId'))
      const usuario = usuarios.find(u => u.id === usuarioId)
      if (!equipo || !usuario) return problema('Registro no encontrado.', 404)
      if (!puedeRecibirPrestamo(usuario)) {
        return problema('Selecciona un colaborador habilitado para el préstamo.', 409)
      }
      if (equipo.estado !== 'Disponible') return problema('El equipo no está disponible.', 409)
      const fechaPrestamo = campo('fechaPrestamo')
      if (!fechaValida(fechaPrestamo)) return problema('Indica una fecha de préstamo válida.', 400)
      const prestamo: Prestamo = {
        id: crypto.randomUUID(), equipoId: equipo.id, usuarioId, responsableId,
        fechaPrestamo, fechaDevolucion: null, observacion: null,
      }
      prestamos.push(prestamo)
      equipo.estado = 'Prestado'
      return Response.json(prestamo, { status: 201 })
    }

    if (metodo === 'POST' && accion === 'devolucion') {
      if (!tecnologia) return prohibido()
      const prestamo = prestamos.find(p => p.id === id)
      const equipo = equipos.find(e => e.id === prestamo?.equipoId)
      if (!prestamo || !equipo) return problema('Préstamo desconocido.', 404)
      if (prestamo.fechaDevolucion) return problema('El préstamo ya fue devuelto.', 409)
      const fecha = campo('fechaDevolucion')
      const observacion = campo('observacion')
      if (!fechaValida(fecha) || fecha <= prestamo.fechaPrestamo || !observacion) {
        return problema('Indica una fecha posterior al préstamo y registra observaciones.', 400)
      }
      prestamo.fechaDevolucion = fecha
      prestamo.observacion = observacion
      equipo.estado = 'Disponible'
      return sinContenido()
    }
  }

  if (recurso === 'solicitudes') {
    if (metodo === 'GET') return Response.json(solicitudes.filter(s => !colaborador || s.usuarioId === sesion.usuarioId))
    if (metodo === 'POST' && !id) {
      if (!colaborador) return prohibido()
      const equipo = equipos.find(e => e.id === campo('equipoId'))
      const fechaPrestamo = campo('fechaPrestamo')
      if (!equipo || !fechaValida(fechaPrestamo)) return problema('Indica el equipo y una fecha válida.', 400)
      if (equipo.estado !== 'Disponible') return problema('El equipo no está disponible.', 409)
      if (solicitudes.some(s => s.equipoId === equipo.id && s.usuarioId === sesion.usuarioId && !s.prestamoId)) {
        return problema('Ya tienes una solicitud pendiente para este equipo.', 409)
      }
      const solicitud = { id: crypto.randomUUID(), equipoId: equipo.id, usuarioId: sesion.usuarioId,
        fechaPrestamo, prestamoId: null }
      solicitudes.push(solicitud)
      return Response.json(solicitud, { status: 201 })
    }
    if (metodo === 'POST' && accion === 'aprobacion') {
      if (!tecnologia) return prohibido()
      const solicitud = solicitudes.find(s => s.id === id)
      if (!solicitud) return problema('Solicitud desconocida.', 404)
      if (solicitud.prestamoId) return problema('La solicitud ya fue aprobada.', 409)
      const resultado = responderDemo('prestamos', 'POST', solicitud)
      if (resultado.ok) solicitud.prestamoId = prestamos.at(-1)!.id
      return resultado
    }
  }

  if (recurso === 'reportes' && metodo === 'GET') return admin ? reporte(id) : prohibido()
  return problema('Operación de demostración desconocida.', 404)
}
