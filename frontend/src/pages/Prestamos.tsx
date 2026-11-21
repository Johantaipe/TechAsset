import { useEffect, useState } from 'react'
import { SupervisionPrestamos } from './SupervisionPrestamos'
import { Boton, Busqueda, coincide, Dialogo, EstadoConsulta, Etiqueta, Filtros, Formulario, Mensaje, Panel, Tabla, type Campo } from '../components/Controles'
import { api, useConsulta } from '../services/api'
import { useSesion } from '../services/sesion'
import type { Equipo, Prestamo, SolicitudPrestamo } from '../types/inventario'
import '../styles/supervision.css'

interface Participante {
  id: string
  nombres: string
  apellidos: string
}

function fechaSiguiente(fecha: string) {
  const dia = new Date(fecha + 'T00:00:00Z')
  dia.setUTCDate(dia.getUTCDate() + 1)
  return dia.toISOString().slice(0, 10)
}

export function Prestamos() {
  return useSesion().rol === 'Administrador' ? <SupervisionPrestamos /> : <PrestamosOperativos />
}

export function DevolucionesTecnologia() {
  return <PrestamosOperativos mostrarDevoluciones />
}

function PrestamosOperativos({ mostrarDevoluciones = false }: { mostrarDevoluciones?: boolean }) {
  const sesion = useSesion()
  const colaborador = sesion.rol === 'Colaborador'
  const tecnologia = sesion.rol === 'Tecnologia'
  const [soloActivos, filtrar] = useState(false)
  const [busqueda, buscar] = useState('')
  const [detalle, verDetalle] = useState<Prestamo>()
  const [devolucion, devolver] = useState<Prestamo>()
  const [estadoSolicitud, filtrarSolicitudes] = useState('pendiente')
  const [paginaSolicitudes, paginarSolicitudes] = useState(1)
  const [aprobacion, aprobar] = useState<SolicitudPrestamo>()
  const prestamos = useConsulta<Prestamo[]>('prestamos?activos=' + soloActivos)
  const equipos = useConsulta<Equipo[]>('equipos')
  const usuarios = useConsulta<Participante[]>(colaborador ? null : 'prestamos/participantes')
  const solicitudes = useConsulta<SolicitudPrestamo[]>('solicitudes')
  const prestamosTecnologia = tecnologia && !mostrarDevoluciones
  const pantallaBaja = '(min-width: 900px) and (max-height: 699px)'
  const [compacta, ajustarAltura] = useState(() => window.matchMedia(pantallaBaja).matches)
  useEffect(() => {
    if (!prestamosTecnologia) return
    const consultaAltura = window.matchMedia(pantallaBaja)
    const ajustar = () => {
      ajustarAltura(consultaAltura.matches)
      paginarSolicitudes(1)
    }
    consultaAltura.addEventListener('change', ajustar)
    return () => consultaAltura.removeEventListener('change', ajustar)
  }, [prestamosTecnologia, pantallaBaja])
  const porPagina = compacta ? 7 : 9
  const solicitudesFiltradas = solicitudes.datos?.filter(s => !tecnologia ||
    Boolean(s.prestamoId) === (estadoSolicitud === 'aprobada'))
  const totalSolicitudes = solicitudesFiltradas?.length ?? 0
  const paginasSolicitudes = Math.max(1, Math.ceil(totalSolicitudes / porPagina))
  const paginaVisible = Math.min(paginaSolicitudes, paginasSolicitudes)
  const inicio = (paginaVisible - 1) * porPagina
  const solicitudesVisibles = tecnologia ? solicitudesFiltradas?.slice(inicio, inicio + porPagina) : solicitudesFiltradas
  const nombres = new Map(usuarios.datos?.map(u => [u.id, u.nombres + ' ' + u.apellidos]))
  const nombresEquipos = new Map(equipos.datos?.map(e => [e.id, e.codigoPatrimonial + ' · ' + e.nombre]))
  const opcionesEquipos = (equipos.datos ?? []).filter(e => e.estado === 'Disponible')
    .map(e => ({ valor: e.id, texto: nombresEquipos.get(e.id) ?? e.id }))

  const camposSolicitud: Campo[] = [
    { nombre: 'equipoId', etiqueta: 'Equipo disponible', opciones: opcionesEquipos },
    { nombre: 'fechaPrestamo', etiqueta: 'Fecha de préstamo', tipo: 'date' },
  ]
  const [confirmacion, confirmar] = useState('')
  const pendientes = prestamos.datos?.filter(p => p.fechaDevolucion === null && !!p.solicitudDevolucionUtc)
    .sort((a, b) => a.solicitudDevolucionUtc!.localeCompare(b.solicitudDevolucionUtc!))
  const fechaSolicitud = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' })

  function verEquipo(prestamo: Prestamo) {
    return <Boton variante="secundario" className="fila-consulta-detalle" onClick={() => verDetalle(prestamo)}>
      {nombresEquipos.get(prestamo.equipoId) ?? 'Equipo sin detalle'}
    </Boton>
  }

  function actualizar() {
    prestamos.recargar()
    equipos.recargar()
    solicitudes.recargar()
  }

  return <div className={prestamosTecnologia ? "operaciones-tecnologia prestamos-tecnologia" : "operaciones-tecnologia"}>
    <Mensaje texto={confirmacion} tipo="confirmacion" />
    {colaborador ? <Panel titulo="Solicitar préstamo">
      <EstadoConsulta {...equipos} />
      {equipos.datos && (opcionesEquipos.length > 0
        ? <Formulario accion="Enviar solicitud" campos={camposSolicitud} guardar={async datos => { await api('solicitudes', 'POST', datos); solicitudes.recargar() }} />
        : <p className="vacio">No hay equipos disponibles.</p>)}
    </Panel> : null}
    {aprobacion && <Dialogo titulo="Aprobar préstamo" cerrar={() => aprobar(undefined)}>
      <p>{nombresEquipos.get(aprobacion.equipoId) ?? aprobacion.equipoId} · {aprobacion.fechaPrestamo}</p>
      <Formulario key={aprobacion.id} campos={[]} accion="Confirmar aprobación" variante="positivo"
        cancelar={() => aprobar(undefined)} guardar={async () => {
          await api('solicitudes/' + aprobacion.id + '/aprobacion', 'POST')
          aprobar(undefined)
          confirmar('Solicitud aprobada y préstamo registrado.')
          actualizar()
        }} />
    </Dialogo>}
    {!mostrarDevoluciones && <Panel titulo={colaborador ? 'Mis solicitudes' : 'Solicitudes de préstamo'}>
      {tecnologia && <Filtros>
        <div className="campo">
          <label htmlFor="estado-solicitudes-tecnologia">Estado</label>
          <select id="estado-solicitudes-tecnologia" value={estadoSolicitud} onChange={evento => {
            filtrarSolicitudes(evento.currentTarget.value)
            paginarSolicitudes(1)
          }}>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
          </select>
        </div>
      </Filtros>}
      <EstadoConsulta {...solicitudes} />
      {solicitudesVisibles && <Tabla desplazamientoInterno={!tecnologia} titulo="Solicitudes" vacio={tecnologia ? "No hay solicitudes con el estado seleccionado." : undefined} columnas={['Equipo', ...(!colaborador ? ['Colaborador'] : []), 'Fecha', 'Estado',
        ...(tecnologia ? ['Acciones'] : [])]}
        filas={solicitudesVisibles.map(s => ({ id: s.id, celdas: [
          nombresEquipos.get(s.equipoId) ?? s.equipoId,
          ...(!colaborador ? [nombres.get(s.usuarioId) ?? s.usuarioId] : []),
          s.fechaPrestamo, <Etiqueta tono={s.prestamoId ? 'positivo' : 'aviso'}>{s.prestamoId ? 'Aprobada' : 'Pendiente'}</Etiqueta>,
          ...(tecnologia ? [s.prestamoId ? '—' : <Boton variante="positivo" onClick={() => aprobar(s)}>Aprobar</Boton>] : []),
        ] }))} />}
      {tecnologia && solicitudesVisibles && <nav className="usuarios-paginacion" aria-label="Paginación de solicitudes">
        <span role="status">Página {paginaVisible} de {paginasSolicitudes} · Total: {totalSolicitudes} · {porPagina} por página</span>
        <div className="acciones">
          <Boton variante="secundario" disabled={paginaVisible === 1}
            onClick={() => paginarSolicitudes(paginaVisible - 1)}>Anterior</Boton>
          <Boton variante="secundario" disabled={paginaVisible === paginasSolicitudes}
            onClick={() => paginarSolicitudes(paginaVisible + 1)}>Siguiente</Boton>
        </div>
      </nav>}
    </Panel>}
    {tecnologia && mostrarDevoluciones && <Panel titulo="Devoluciones pendientes">
      <Boton variante="secundario" disabled={prestamos.cargando} onClick={actualizar}>Actualizar devoluciones</Boton>
      <EstadoConsulta {...prestamos} />
      {pendientes && <Tabla desplazamientoInterno titulo="Solicitudes de devolución" vacio="No hay devoluciones pendientes."
        columnas={['Equipo', 'Colaborador', 'Fecha de préstamo', 'Solicitud de devolución', 'Estado', 'Acción']}
        filas={pendientes.map(prestamo => ({ id: prestamo.id, celdas: [
          verEquipo(prestamo),
          nombres.get(prestamo.usuarioId) ?? 'Colaborador sin detalle',
          prestamo.fechaPrestamo,
          fechaSolicitud.format(new Date(prestamo.solicitudDevolucionUtc!)),
          <Etiqueta tono="aviso">Devolución solicitada</Etiqueta>,
          <Boton variante="positivo" onClick={() => devolver(prestamo)}>Registrar devolución</Boton>,
        ] }))} />}
    </Panel>}
    {detalle && <Dialogo titulo="Detalle del préstamo" cerrar={() => verDetalle(undefined)}>
      <div className="detalle-supervision">
        <dl>
          <div><dt>Equipo</dt><dd>{nombresEquipos.get(detalle.equipoId) ?? 'Equipo sin detalle'}</dd></div>
          <div><dt>Colaborador</dt><dd>{nombres.get(detalle.usuarioId) ?? 'Sin detalle'}</dd></div>
          <div><dt>Responsable</dt><dd>{nombres.get(detalle.responsableId) ?? 'Sin detalle'}</dd></div>
          <div><dt>Estado</dt><dd>{detalle.fechaDevolucion ? 'Devuelto' : detalle.solicitudDevolucionUtc ? 'Devolución solicitada' : 'Activo'}</dd></div>
          <div><dt>Fecha de préstamo</dt><dd>{detalle.fechaPrestamo}</dd></div>
          <div><dt>Fecha de devolución</dt><dd>{detalle.fechaDevolucion ?? '—'}</dd></div>
          <div><dt>Observaciones</dt><dd>{detalle.observacion ?? '—'}</dd></div>
        </dl>
        <Boton variante="secundario" autoFocus onClick={() => verDetalle(undefined)}>Cerrar</Boton>
      </div>
    </Dialogo>}
    {devolucion && <Dialogo titulo={'Devolver ' + (nombresEquipos.get(devolucion.equipoId) ?? 'equipo')}
      cerrar={() => devolver(undefined)}>
      <p>{nombres.get(devolucion.usuarioId) ?? 'Colaborador'} · Préstamo del {devolucion.fechaPrestamo}</p>
      <Formulario key={devolucion.id} valores={{ estadoEquipo: 'Disponible' }} accion="Confirmar devolución" variante="positivo" cancelar={() => devolver(undefined)}
        campos={[
          { nombre: 'fechaDevolucion', etiqueta: 'Fecha de devolución', tipo: 'date',
            min: fechaSiguiente(devolucion.fechaPrestamo) },
          { nombre: 'observacion', etiqueta: 'Observaciones', tipo: 'textarea' },
          { nombre: 'estadoEquipo', etiqueta: 'Estado del equipo al recibirlo',
            opciones: ['Disponible', 'Mantenimiento', 'Baja'].map(estado => ({ valor: estado, texto: estado })) },
        ]} guardar={async datos => {
          await api('prestamos/' + devolucion.id + '/devolucion', 'POST', datos)
          devolver(undefined)
          confirmar('Devolución registrada. Estado del equipo: ' + datos.estadoEquipo + '.')
          actualizar()
        }} />
    </Dialogo>}
    {mostrarDevoluciones && <Panel titulo="Historial">
      <Filtros>
        <Busqueda etiqueta={colaborador ? 'Buscar por equipo' : 'Buscar por equipo o persona'} valor={busqueda} cambiar={buscar} />
        <label className="check"><input type="checkbox" checked={soloActivos}
          onChange={e => filtrar(e.target.checked)} /> Solo préstamos activos</label>
      </Filtros>
      <EstadoConsulta {...prestamos} />
      {!colaborador && !tecnologia && <EstadoConsulta {...usuarios} />}
      {prestamos.datos && <Tabla desplazamientoInterno titulo="Historial de préstamos" columnas={['Equipo', 'Colaborador', 'Responsable', 'Préstamo', 'Devolución', 'Observaciones']}
        filas={prestamos.datos.filter(p => coincide(busqueda, nombresEquipos.get(p.equipoId) ?? p.equipoId,
            nombres.get(p.usuarioId) ?? p.usuarioId, nombres.get(p.responsableId) ?? p.responsableId))
          .map(p => ({ id: p.id, celdas: [
            tecnologia ? verEquipo(p) : nombresEquipos.get(p.equipoId) ?? p.equipoId,
            nombres.get(p.usuarioId) ?? (colaborador ? 'Mi cuenta' : p.usuarioId),
            nombres.get(p.responsableId) ?? (colaborador ? 'Tecnología' : p.responsableId), p.fechaPrestamo,
            p.fechaDevolucion ?? (tecnologia ? '—' : <Etiqueta tono="informativo">Activo</Etiqueta>),
            p.observacion ?? '—',
          ] }))} />}
    </Panel>}
  </div>
}
