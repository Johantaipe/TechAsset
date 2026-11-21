import { IndicadoresDashboard, type IndicadorDashboard } from '../components/IndicadoresDashboard'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { enRango, opciones, rangoVacio, RangoFechas, SelectorConsulta } from '../components/FiltrosConsulta'
import { Boton, Dialogo, EstadoConsulta, Etiqueta, Filtros, Panel, Tabla } from '../components/Controles'
import { Icono } from '../components/Icono'
import { useConsulta } from '../services/api'
import type { Equipo, Indicadores, Movimiento, Prestamo, SolicitudPrestamo, UsoArea, UsoEquipo, Usuario } from '../types/inventario'
import '../styles/dashboard-admin.css'

const descripcion = (m: Movimiento) => m.idCambio ? m.tipo + ': ' + m.estadoAnterior + ' → ' + m.estadoNuevo : m.tipo
const iconosMovimiento: Record<string, string> = {
  Préstamo: 'prestamos', 'Solicitud de devolución': 'pending', Devolución: 'approved', 'Cambio de estado': 'inventario',
}

function DetalleMovimiento({ detalle, equipo, cerrar }: { detalle: Movimiento; equipo: string; cerrar: () => void }) {
  return <Dialogo titulo="Detalle del movimiento" cerrar={cerrar}>
      <div className="detalle-supervision"><dl>
        <div><dt>Fecha</dt><dd>{detalle.fecha}</dd></div>
        <div><dt>Equipo</dt><dd>{equipo}</dd></div>
        <div><dt>Movimiento</dt><dd>{descripcion(detalle)}</dd></div>
        {detalle.motivo && <div><dt>Motivo</dt><dd>{detalle.motivo}</dd></div>}
        {detalle.prestamoId && <div><dt>Identificador del préstamo</dt><dd>{detalle.prestamoId}</dd></div>}
      </dl></div>
      <Boton variante="secundario" onClick={cerrar}>Cerrar</Boton>
  </Dialogo>
}

export function Dashboard() {
  const consulta = useConsulta<Indicadores>('reportes/dashboard')
  const inventario = useConsulta<Equipo[]>('equipos')
  const prestamos = useConsulta<Prestamo[]>('prestamos')
  const usuarios = useConsulta<Usuario[]>('usuarios')
  const solicitudes = useConsulta<SolicitudPrestamo[]>('solicitudes')
  const movimientos = useConsulta<Movimiento[]>('reportes/movimientos')
  const [detalle, abrirDetalle] = useState<Movimiento>()
  const consultas = [consulta, inventario, prestamos, usuarios, solicitudes, movimientos]
  const cargando = consultas.some(item => item.cargando)
  const equiposPorId = new Map(inventario.datos?.map(equipo => [equipo.id, equipo]))
  const personasPorId = new Map(usuarios.datos?.map(usuario => [usuario.id, usuario.nombres + ' ' + usuario.apellidos]))
  const etiquetaEquipo = (id: string) => {
    const equipo = equiposPorId.get(id)
    return equipo ? equipo.codigoPatrimonial + ' · ' + equipo.nombre : 'Equipo sin detalle'
  }
  const activos = prestamos.datos?.filter(prestamo => prestamo.fechaDevolucion === null)
  const actividad: IndicadorDashboard[] = [
    { concepto: 'bajas', etiqueta: 'Equipos de baja', valor: inventario.datos?.filter(equipo => equipo.estado === 'Baja').length },
    { concepto: 'finalizados', etiqueta: 'Devoluciones registradas', valor: prestamos.datos?.filter(prestamo => prestamo.fechaDevolucion !== null).length },
    { concepto: 'pendientes', etiqueta: 'Solicitudes de préstamo pendientes', valor: solicitudes.datos?.filter(solicitud => solicitud.prestamoId === null).length },
  ]
  const resumen = consulta.datos
  const indicadores: IndicadorDashboard[] | undefined = resumen && [
    { etiqueta: 'Total de equipos', concepto: 'totalEquipos', valor: resumen.totalEquipos },
    { etiqueta: 'Equipos disponibles', concepto: 'disponibles', valor: resumen.disponibles, enlace: '#/inventario?estado=Disponible' },
    { etiqueta: 'Equipos prestados', concepto: 'activos', valor: resumen.prestados, enlace: '#/inventario?estado=Prestado' },
    { etiqueta: 'En mantenimiento', concepto: 'mantenimiento', valor: resumen.mantenimiento, enlace: '#/inventario?estado=Mantenimiento' },
    { etiqueta: 'Total de préstamos', concepto: 'totalPrestamos', valor: resumen.totalPrestamos, enlace: '#/prestamos' },
    { etiqueta: 'Área con mayor uso', concepto: 'area', valor: resumen.areasConMayorUso.join(', ') || 'Sin préstamos', enlace: '#/reportes' },
  ]

  return <div className="dash-panel dashboard-admin">
    <section className="welcome dash-welcome">
      <div><h2>Inventario tecnológico</h2><p>Consulta la disponibilidad de los equipos y los movimientos de préstamo.</p></div>
      <Boton variante="secundario" disabled={cargando} onClick={() => consultas.forEach(item => item.recargar())}>
        {cargando ? 'Actualizando…' : 'Actualizar panel'}
      </Boton>
    </section>
    <section aria-label="Resumen de inventario y préstamos">
      <EstadoConsulta {...consulta} />
      {indicadores && <IndicadoresDashboard items={indicadores} />}
    </section>

    <div className="dash-grid dashboard-admin-listas">
      <section className="dash-card" aria-labelledby="admin-activos">
        <div className="dash-card-heading">
          <h2 id="admin-activos">Préstamos activos</h2>
          {activos && activos.length > 3 && <a href="#/prestamos?estado=Activos">Ver todos</a>}
        </div>
        <EstadoConsulta {...prestamos} />
        {usuarios.error && <EstadoConsulta {...usuarios} />}
        {activos && (activos.length ? <ul className="dash-list">
          {activos.slice(0, 3).map(prestamo => <li key={prestamo.id}>
            <div><strong>{etiquetaEquipo(prestamo.equipoId)}</strong>
              <small>{personasPorId.get(prestamo.usuarioId) ?? 'Colaborador sin detalle'} · {prestamo.fechaPrestamo}</small></div>
            <Etiqueta tono="informativo">Activo</Etiqueta>
          </li>)}
        </ul> : <p className="dash-muted">No hay préstamos activos.</p>)}
      </section>

      <section className="dash-card" aria-labelledby="admin-movimientos">
        <div className="dash-card-heading">
          <h2 id="admin-movimientos">Últimos movimientos</h2>
          <a href="#/reportes?seccion=movimientos">Ver historial</a>
        </div>
        <EstadoConsulta {...movimientos} />
        {movimientos.datos && (movimientos.datos.length ? <ul className="dash-list dashboard-admin-movimientos">
          {movimientos.datos.slice(0, 3).map(movimiento => <li key={movimiento.idCambio ?? (movimiento.prestamoId + movimiento.tipo)}>
            <button type="button" onClick={() => abrirDetalle(movimiento)}>
              <Icono nombre={iconosMovimiento[movimiento.tipo] ?? 'agenda'} />
              <span><strong>{movimiento.tipo}</strong><small>{etiquetaEquipo(movimiento.equipoId)}</small></span>
              <time dateTime={movimiento.fecha}>{movimiento.fecha}</time>
            </button>
          </li>)}
        </ul> : <p className="dash-muted">No hay movimientos registrados.</p>)}
      </section>
    </div>

    <section className="dash-card dashboard-admin-actividad" aria-labelledby="admin-actividad">
      <h2 id="admin-actividad">Actividad del inventario</h2>
      {inventario.error && <EstadoConsulta {...inventario} />}
      {solicitudes.error && <EstadoConsulta {...solicitudes} />}
      <IndicadoresDashboard items={actividad} compactos />
    </section>
    {detalle && <DetalleMovimiento detalle={detalle} equipo={etiquetaEquipo(detalle.equipoId)} cerrar={() => abrirDetalle(undefined)} />}
  </div>
}

const escritorioBajo = '(min-width: 1101px) and (max-height: 800px)'

function suscribirAltura(actualizar: () => void) {
  const pantalla = window.matchMedia(escritorioBajo)
  pantalla.addEventListener('change', actualizar)
  return () => pantalla.removeEventListener('change', actualizar)
}

function leerMovimientosPorPagina() {
  return window.matchMedia(escritorioBajo).matches ? 3 : 5
}

export function Reportes() {
  const historial = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (new URLSearchParams(window.location.hash.split('?')[1]).get('seccion') === 'movimientos') {
      historial.current?.scrollIntoView({ block: 'start' })
      historial.current?.focus({ preventScroll: true })
    }
  }, [])
  const movimientosPorPagina = useSyncExternalStore(suscribirAltura, leerMovimientosPorPagina)
  const [rangoPrestamos, cambiarRangoPrestamos] = useState(rangoVacio)
  const [rangoMovimientos, cambiarRangoMovimientos] = useState(rangoVacio)
  const [area, elegirArea] = useState('')
  const [equipo, elegirEquipo] = useState('')
  const [equipoMovimiento, elegirEquipoMovimiento] = useState('')
  const [tipo, elegirTipo] = useState('')
  const [paginaSolicitada, paginar] = useState(1)
  const [detalle, abrirDetalle] = useState<Movimiento>()
  const params = new URLSearchParams()
  if (rangoPrestamos.desde) params.set('desde', rangoPrestamos.desde)
  if (rangoPrestamos.hasta) params.set('hasta', rangoPrestamos.hasta)
  const filtroFechas = params.size ? '?' + params.toString() : ''
  const areas = useConsulta<UsoArea[]>('reportes/por-area' + filtroFechas)
  const usoEquipos = useConsulta<UsoEquipo[]>('reportes/equipos-mas-utilizados' + filtroFechas)
  const movimientos = useConsulta<Movimiento[]>('reportes/movimientos')
  const inventario = useConsulta<Equipo[]>('equipos')
  const porId = new Map(inventario.datos?.map(e => [e.id, e]))
  const etiquetas = (id: string) => {
    const e = porId.get(id)
    return e ? e.codigoPatrimonial + ' · ' + e.nombre : 'Equipo sin detalle'
  }
  const equipos = [...porId.keys()].map(id => ({ id, texto: etiquetas(id) }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { numeric: true }))
  const idMovimiento = (m: Movimiento) => m.idCambio ?? (m.prestamoId + m.tipo)

  const filtrados = movimientos.datos?.filter(m => enRango(m.fecha, rangoMovimientos) &&
    (!tipo || m.tipo === tipo) && (!equipoMovimiento || m.equipoId === equipoMovimiento))
  const total = filtrados?.length ?? 0
  const paginas = Math.max(1, Math.ceil(total / movimientosPorPagina))
  const pagina = Math.min(paginaSolicitada, paginas)
  const inicio = (pagina - 1) * movimientosPorPagina

  return <div className="reportes-consulta">
    <div className="reportes-periodo">
      <Panel titulo="Período de los reportes de préstamos">
        <Filtros>
          <RangoFechas rango={rangoPrestamos} cambiar={cambiarRangoPrestamos} />
          <Boton variante="secundario" onClick={() => cambiarRangoPrestamos(rangoVacio)}>Limpiar fechas</Boton>
        </Filtros>
      </Panel>
    </div>
    <div className="reportes">
      <Panel titulo="Préstamos por área">
        <Filtros><SelectorConsulta etiqueta="Área" valor={area} cambiar={elegirArea} todos="Todas"
          opciones={opciones([...new Set(['Sistemas', 'Operaciones', 'Contabilidad', ...(areas.datos?.map(a => a.area) ?? [])])])} /></Filtros>
        <EstadoConsulta {...areas} />
        {areas.datos && <Tabla titulo="Préstamos por área" desplazamientoInterno columnas={['Área', 'Préstamos']}
          filas={areas.datos.filter(a => !area || a.area === area).map(a => ({ id: a.area, celdas: [a.area, a.total] }))} />}
        {areas.datos?.some(a => a.area.startsWith('Área histórica:') || a.area === 'Sin área registrada') &&
          <p>Los préstamos de áreas históricas o sin área registrada se muestran por separado.</p>}
      </Panel>
      <Panel titulo="Equipos más utilizados">
        <Filtros><SelectorConsulta etiqueta="Equipo" valor={equipo} cambiar={elegirEquipo} opciones={equipos} /></Filtros>
        <EstadoConsulta {...usoEquipos} />
        {usoEquipos.datos && inventario.datos && <Tabla titulo="Equipos más utilizados" desplazamientoInterno columnas={['Código', 'Equipo', 'Préstamos']}
          filas={usoEquipos.datos.filter(e => !equipo || e.equipoId === equipo).map(e => ({
            id: e.equipoId, celdas: [porId.get(e.equipoId)?.codigoPatrimonial ?? '—', e.equipo, e.total],
          }))} />}
      </Panel>
    </div>
    <div className="reportes-movimientos" ref={historial} tabIndex={-1}>
      <Panel titulo="Historial de movimientos">
        <Filtros>
          <SelectorConsulta etiqueta="Equipo" valor={equipoMovimiento} cambiar={valor => { elegirEquipoMovimiento(valor); paginar(1) }} opciones={equipos} />
          <SelectorConsulta etiqueta="Tipo de movimiento" valor={tipo} cambiar={valor => { elegirTipo(valor); paginar(1) }}
            opciones={opciones([...new Set(movimientos.datos?.map(m => m.tipo))])} />
          <RangoFechas rango={rangoMovimientos} cambiar={valor => { cambiarRangoMovimientos(valor); paginar(1) }} />
          <Boton variante="secundario" onClick={() => {
            elegirEquipoMovimiento(''); elegirTipo(''); cambiarRangoMovimientos(rangoVacio); paginar(1)
          }}>Limpiar filtros</Boton>
        </Filtros>
        <EstadoConsulta {...movimientos} />
        {filtrados && inventario.datos && <>
          <Tabla titulo="Historial de movimientos" columnas={['Fecha', 'Movimiento', 'Equipo']}
            vacio="No hay movimientos que coincidan con los filtros."
            seleccionar={id => abrirDetalle(filtrados.find(m => idMovimiento(m) === id))}
            filas={filtrados.slice(inicio, inicio + movimientosPorPagina).map(m => ({
              id: idMovimiento(m), celdas: [m.fecha, descripcion(m), etiquetas(m.equipoId)],
            }))} />
          <nav className="usuarios-paginacion" aria-label="Paginación de movimientos">
            <span role="status">Página {pagina} de {paginas} · Total: {total}</span>
            <div className="acciones">
              <Boton variante="secundario" disabled={pagina === 1} onClick={() => paginar(pagina - 1)}>Anterior</Boton>
              <Boton variante="secundario" disabled={pagina === paginas} onClick={() => paginar(pagina + 1)}>Siguiente</Boton>
            </div>
          </nav>
        </>}
      </Panel>
    </div>
    {detalle && <DetalleMovimiento detalle={detalle} equipo={etiquetas(detalle.equipoId)}
      cerrar={() => abrirDetalle(undefined)} />}
  </div>
}