import { IndicadoresDashboard, type IndicadorDashboard } from '../components/IndicadoresDashboard'
import { useRef, useState, type ComponentProps, type FormEvent } from 'react'
import { Boton, Busqueda, coincide, Dialogo, EstadoConsulta, Etiqueta, Filtros, Formulario, Mensaje, Panel, Tabla } from '../components/Controles'
import { Icono } from '../components/Icono'
import { api, mensaje, useConsulta } from '../services/api'
import type { Equipo, Prestamo, SolicitudPrestamo } from '../types/inventario'
import '../styles/dashboard-colaborador.css'

const tituloEquipo = (equipo: Equipo) => equipo.codigoPatrimonial + ' · ' + equipo.nombre
const estaPendiente = (solicitud: SolicitudPrestamo) => solicitud.prestamoId === null
const estaActivo = (prestamo: Prestamo) => prestamo.fechaDevolucion === null
const fecha = (valor: string) => valor.split('-').reverse().join('/')

function useSolicitudesPropias() {
  return useConsulta<SolicitudPrestamo[]>('solicitudes')
}

function MisSolicitudes({ solicitudes, equipos, recientes = false }: {
  solicitudes: ReturnType<typeof useSolicitudesPropias>
  equipos: ReturnType<typeof useConsulta<Equipo[]>>
  recientes?: boolean
}) {
  const porId = new Map(equipos.datos?.map(equipo => [equipo.id, tituloEquipo(equipo)]))
  const [paginaSolicitada, paginar] = useState(1)
  const porPagina = 5
  const total = solicitudes.datos?.length ?? 0
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const pagina = recientes ? 1 : Math.min(paginaSolicitada, paginas)
  const inicio = (pagina - 1) * porPagina
  const datos = solicitudes.datos?.slice(inicio, inicio + porPagina)
  return <Panel titulo={recientes ? 'Mis solicitudes recientes' : 'Mis solicitudes'}>
    {!recientes && <Boton variante="secundario" disabled={solicitudes.cargando} onClick={() => {
      solicitudes.recargar()
      equipos.recargar()
    }}>{solicitudes.cargando ? 'Actualizando…' : 'Actualizar solicitudes'}</Boton>}
    <EstadoConsulta {...solicitudes} />
    {Boolean(datos?.length) && <EstadoConsulta {...equipos} />}
    {datos && <Tabla titulo={recientes ? 'Solicitudes recientes' : 'Mis solicitudes'} columnas={['Equipo', 'Fecha', 'Estado']}
      vacio="Todavía no tienes solicitudes registradas." filas={datos.map(solicitud => ({
        id: solicitud.id,
        celdas: [
          porId.get(solicitud.equipoId) ?? 'Equipo sin detalle',
          fecha(solicitud.fechaPrestamo),
          <Etiqueta tono={estaPendiente(solicitud) ? 'aviso' : 'positivo'}>
            {estaPendiente(solicitud) ? 'Pendiente' : 'Aprobado'}
          </Etiqueta>,
        ],
      }))} />}
    {!recientes && datos && <nav className="usuarios-paginacion" aria-label="Paginación de mis solicitudes">
      <span role="status">Página {pagina} de {paginas} · Total: {total} · {porPagina} por página</span>
      <div className="acciones">
        <Boton variante="secundario" disabled={pagina === 1} onClick={() => paginar(pagina - 1)}>Anterior</Boton>
        <Boton variante="secundario" disabled={pagina === paginas} onClick={() => paginar(pagina + 1)}>Siguiente</Boton>
      </div>
    </nav>}
  </Panel>
}

export function DashboardColaborador() {
  const solicitudes = useSolicitudesPropias()
  const prestamos = useConsulta<Prestamo[]>('prestamos')
  const equipos = useConsulta<Equipo[]>('equipos')
  const [devolucion, elegirDevolucion] = useState<Prestamo>()
  const [resultado, informar] = useState('')
  const porEquipo = new Map(equipos.datos?.map(equipo => [equipo.id, tituloEquipo(equipo)]))
  const activos = prestamos.datos?.filter(estaActivo)
  const pendientes = solicitudes.datos?.filter(estaPendiente).length
  const indicadores: IndicadorDashboard[] = [
    { etiqueta: 'Mis solicitudes pendientes', valor: pendientes, concepto: 'pendientes' },
    { etiqueta: 'Mis préstamos activos', valor: activos?.length, concepto: 'activos' },
    { etiqueta: 'Mis préstamos finalizados', valor: prestamos.datos?.filter(prestamo => !estaActivo(prestamo)).length, concepto: 'finalizados' },
    { etiqueta: 'Total de mis solicitudes', valor: solicitudes.datos?.length, concepto: 'totalSolicitudes' },
  ]
  return <div className="dash-panel dashboard-colaborador">
    <section className="welcome dash-welcome cabecera-colaborador">
      <div><h2>Mis solicitudes y préstamos</h2><p>Revisa el estado de tus solicitudes y consulta tus préstamos.</p></div>
      <a className="button-primary" href="#/solicitar-prestamo?nueva=1"><Icono nombre="nueva" />Nueva solicitud</a>
    </section>
    <IndicadoresDashboard items={indicadores} />
    <Panel titulo="Estado de mis solicitudes">
      <div className="estado-solicitudes-colaborador">
        <Etiqueta tono="aviso">Pendientes</Etiqueta><strong>{pendientes ?? '—'}</strong>
      </div>
      <EstadoConsulta {...solicitudes} />
    </Panel>
    <div className="dashboard-colaborador-detalles">
      <Panel titulo="Mis préstamos activos">
        <Mensaje texto={resultado} tipo="confirmacion" />
        <EstadoConsulta {...prestamos} />
        {Boolean(activos?.length) && <EstadoConsulta {...equipos}/>}
        {activos && <Tabla titulo="Equipos prestados" columnas={['Equipo', 'Fecha de préstamo', 'Estado', 'Acción']}
          vacio="No tienes préstamos activos." filas={activos.map(prestamo => ({ id: prestamo.id, celdas: [
            porEquipo.get(prestamo.equipoId) ?? 'Equipo sin detalle',
            fecha(prestamo.fechaPrestamo),
            <Etiqueta tono="informativo">Activo</Etiqueta>,
            prestamo.solicitudDevolucionUtc ? <Etiqueta tono="aviso">Devolución solicitada</Etiqueta> :
              <Boton variante="secundario" onClick={() => { informar(''); elegirDevolucion(prestamo) }}>Solicitar devolución</Boton>,
          ] }))} />}
      </Panel>
      <MisSolicitudes solicitudes={solicitudes} equipos={equipos} recientes />
    </div>
    {devolucion && <Dialogo titulo="¿Confirmas la solicitud de devolución?" cerrar={() => elegirDevolucion(undefined)}>
      <p>{porEquipo.get(devolucion.equipoId) ?? 'Equipo sin detalle'} · Préstamo del {fecha(devolucion.fechaPrestamo)}</p>
      <p>El préstamo seguirá activo hasta que Tecnología registre la recepción del equipo.</p>
      <Formulario campos={[]} variante="positivo" accion="Confirmar solicitud" cancelar={() => elegirDevolucion(undefined)}
        guardar={async () => {
          await api('prestamos/' + devolucion.id + '/solicitud-devolucion', 'POST')
          elegirDevolucion(undefined)
          informar('Devolución solicitada correctamente.')
          prestamos.recargar()
        }} />
    </Dialogo>}
  </div>
}

const categoriasSolicitud = [
  'Laptops', 'Computadoras de escritorio', 'Monitores', 'Impresoras', 'Tablets',
  'Proyectores multimedia', 'Equipos de red',
]
const normalizarCategoria = (valor: string) => valor.trim().toLocaleLowerCase('es')
const categoriasPrincipales = new Set(categoriasSolicitud.map(normalizarCategoria))

export function SolicitarPrestamoColaborador() {
  const equipos = useConsulta<Equipo[]>('equipos')
  const solicitudes = useSolicitudesPropias()
  const [abierto, abrir] = useState(() =>
    new URLSearchParams(window.location.hash.split('?')[1]).get('nueva') === '1')
  const [categoria, elegirCategoria] = useState('')
  const [equipoId, elegirEquipo] = useState('')
  const [fechaPrestamo, elegirFecha] = useState('')
  const [confirmacion, confirmar] = useState<Equipo>()
  const [resultado, informar] = useState('')
  const [error, informarError] = useState('')
  const [guardando, cambiarGuardando] = useState(false)
  const enviando = useRef(false)
  const conSolicitud = new Set(solicitudes.datos?.filter(estaPendiente).map(solicitud => solicitud.equipoId))
  const disponibles = equipos.datos?.filter(equipo => {
    if (equipo.estado !== 'Disponible' || conSolicitud.has(equipo.id)) return false
    const tipo = normalizarCategoria(equipo.categoria)
    return categoria === 'Otros' ? !categoriasPrincipales.has(tipo) : tipo === normalizarCategoria(categoria)
  }) ?? []
  const listo = !equipos.cargando && !solicitudes.cargando && !!equipos.datos && !!solicitudes.datos

  function nuevaSolicitud() {
    elegirCategoria('')
    elegirEquipo('')
    elegirFecha('')
    informar('')
    informarError('')
    equipos.recargar()
    solicitudes.recargar()
    abrir(true)
  }

  function preparar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!listo || enviando.current || confirmacion) return
    const equipo = disponibles.find(item => item.id === equipoId)
    if (!equipo) {
      informarError('Selecciona un equipo disponible de la categoría.')
      return
    }
    informarError('')
    confirmar(equipo)
  }

  async function guardar() {
    if (!confirmacion || enviando.current) return
    enviando.current = true
    cambiarGuardando(true)
    try {
      await api('solicitudes', 'POST', { equipoId: confirmacion.id, fechaPrestamo })
      informar('Solicitud registrada. Quedó pendiente de aprobación.')
      abrir(false)
    } catch (error) {
      informarError(mensaje(error))
    } finally {
      confirmar(undefined)
      equipos.recargar()
      solicitudes.recargar()
      enviando.current = false
      cambiarGuardando(false)
    }
  }

  return <>
    <div className="solicitudes-colaborador">
      <Panel titulo="Solicitar préstamo">
        <Boton onClick={nuevaSolicitud}><span aria-hidden="true">+</span> Nueva solicitud</Boton>
        <Mensaje texto={resultado} tipo="confirmacion" />
      </Panel>
      <MisSolicitudes solicitudes={solicitudes} equipos={equipos} />
    </div>
    {abierto && <Dialogo titulo="Nueva solicitud de préstamo" cerrar={() => abrir(false)}>
      <Boton className="registro-equipo-cerrar" variante="secundario" onClick={() => abrir(false)}
        disabled={guardando} aria-label="Cerrar nueva solicitud">×</Boton>
      <form onSubmit={preparar}>
        <fieldset className="formulario form-grid" disabled={guardando}>
          <label className="campo form-group">¿Qué tipo de equipo deseas solicitar?
            <select name="categoria" required value={categoria} onChange={e => {
              elegirCategoria(e.currentTarget.value)
              elegirEquipo('')
              informarError('')
            }}>
              <option value="" disabled>Selecciona una categoría</option>
              {[...categoriasSolicitud, 'Otros'].map(tipo => <option key={tipo}>{tipo}</option>)}
            </select>
          </label>
          <label className="campo form-group">Equipo disponible
            <select name="equipoId" required value={equipoId} disabled={!categoria || !listo || !disponibles.length}
              onChange={e => elegirEquipo(e.currentTarget.value)}>
              <option value="" disabled>Selecciona un equipo</option>
              {categoria && disponibles.map(equipo => <option value={equipo.id} key={equipo.id}>
                {tituloEquipo(equipo)} · {equipo.marca}
              </option>)}
            </select>
          </label>
          <label className="campo form-group">Fecha de préstamo solicitada
            <input name="fechaPrestamo" type="date" required value={fechaPrestamo}
              onChange={e => elegirFecha(e.currentTarget.value)} />
          </label>
          <div className="acciones actions">
            <Boton variante="secundario" onClick={() => abrir(false)}>Cancelar</Boton>
            <Boton type="submit" disabled={!categoria || !listo || !disponibles.length}>Registrar pedido</Boton>
          </div>
        </fieldset>
        {categoria && listo && !disponibles.length && <p className="vacio" role="status">No hay equipos disponibles en esta categoría</p>}
        <EstadoConsulta {...equipos} />
        {solicitudes.error && <EstadoConsulta {...solicitudes} />}
        <Mensaje texto={error} />
      </form>
    </Dialogo>}
    {confirmacion && <Dialogo titulo="¿Estás seguro de solicitar este equipo?" cerrar={() => confirmar(undefined)}>
      <p>{tituloEquipo(confirmacion)}</p>
      <fieldset className="formulario" disabled={guardando}>
        <div className="acciones actions">
          <Boton variante="secundario" autoFocus onClick={() => confirmar(undefined)}>Cancelar</Boton>
          <Boton variante="positivo" onClick={guardar}>{guardando ? 'Registrando…' : 'Confirmar solicitud'}</Boton>
        </div>
      </fieldset>
    </Dialogo>}
  </>
}

function TablaConsultaColaborador({ filas, titulo, ...props }: ComponentProps<typeof Tabla>) {
  const [paginaSolicitada, paginar] = useState(1)
  const porPagina = 5
  const total = filas.length
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const pagina = Math.min(paginaSolicitada, paginas)
  const inicio = (pagina - 1) * porPagina

  return <>
    <Tabla {...props} titulo={titulo} filas={filas.slice(inicio, inicio + porPagina)} />
    <nav className="usuarios-paginacion" aria-label={'Paginación de ' + titulo.toLocaleLowerCase('es')}>
      <span role="status">Página {pagina} de {paginas} · Total: {total} · {porPagina} por página</span>
      <div className="acciones">
        <Boton variante="secundario" disabled={pagina === 1} onClick={() => paginar(pagina - 1)}>Anterior</Boton>
        <Boton variante="secundario" disabled={pagina === paginas} onClick={() => paginar(pagina + 1)}>Siguiente</Boton>
      </div>
    </nav>
  </>
}

export function HistorialColaborador() {
  const [busqueda, buscar] = useState('')
  const [soloActivos, filtrar] = useState(false)
  const prestamos = useConsulta<Prestamo[]>('prestamos?activos=' + soloActivos)
  const equipos = useConsulta<Equipo[]>('equipos')
  const porId = new Map(equipos.datos?.map(equipo => [equipo.id, equipo]))
  return <div className="consulta-colaborador"><Panel titulo="Historial de préstamos">
    <Filtros>
      <Busqueda etiqueta="Buscar por equipo" valor={busqueda} cambiar={buscar} />
      <label className="check"><input type="checkbox" checked={soloActivos}
        onChange={e => filtrar(e.currentTarget.checked)} /> Solo préstamos activos</label>
    </Filtros>
    <EstadoConsulta {...prestamos} />
    {Boolean(prestamos.datos?.length) && <EstadoConsulta {...equipos} />}
    {prestamos.datos && <TablaConsultaColaborador key={JSON.stringify([busqueda, soloActivos])} titulo="Mis préstamos" columnas={['Equipo', 'Marca', 'Préstamo', 'Devolución', 'Estado', 'Observaciones']}
      vacio="No hay préstamos que coincidan con la consulta." filas={prestamos.datos.flatMap(prestamo => {
        const equipo = porId.get(prestamo.equipoId)
        const nombre = equipo ? tituloEquipo(equipo) : 'Equipo sin detalle'
        if (!coincide(busqueda, nombre, equipo?.marca ?? '')) return []
        return [{ id: prestamo.id, celdas: [
          nombre, equipo?.marca ?? '—', fecha(prestamo.fechaPrestamo), prestamo.fechaDevolucion ? fecha(prestamo.fechaDevolucion) : '—',
          <Etiqueta tono={estaActivo(prestamo) ? 'informativo' : 'positivo'}>{estaActivo(prestamo) ? 'Activo' : 'Devuelto'}</Etiqueta>,
          prestamo.observacion ?? '—',
        ] }]
      })} />}
  </Panel></div>
}

const tonosDisponibilidad = { Disponible: 'positivo', Prestado: 'informativo', Mantenimiento: 'aviso', Baja: 'neutro' } as const

export function DisponibilidadColaborador() {
  const [busqueda, buscar] = useState('')
  const [categoria, filtrar] = useState('')
  const equipos = useConsulta<Equipo[]>('equipos?incluirEstados=true')
  const solicitudes = useSolicitudesPropias()
  const pendientes = new Set(solicitudes.datos?.filter(estaPendiente).map(solicitud => solicitud.equipoId))
  const inventario = equipos.datos ?? []
  const categorias = [...new Set(inventario.map(equipo => equipo.categoria))].sort((a, b) => a.localeCompare(b, 'es'))
  return <div className="consulta-colaborador"><Panel titulo="Disponibilidad de equipos">
    <Filtros>
      <Busqueda etiqueta="Buscar por nombre o código" valor={busqueda} cambiar={buscar} />
      <label className="campo">Categoría
        <select value={categoria} onChange={e => filtrar(e.currentTarget.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(item => <option key={item}>{item}</option>)}
        </select>
      </label>
    </Filtros>
    <EstadoConsulta {...equipos} />
    <EstadoConsulta {...solicitudes} />
    {equipos.datos && <TablaConsultaColaborador key={JSON.stringify([busqueda, categoria])} titulo="Disponibilidad de equipos" columnas={['Código', 'Equipo', 'Categoría', 'Marca', 'Estado']}
      vacio="No hay equipos que coincidan con la consulta."
      filas={inventario.filter(equipo => (!categoria || categoria === equipo.categoria) &&
        coincide(busqueda, equipo.codigoPatrimonial, equipo.nombre)).map(equipo => ({
        id: equipo.id, celdas: [equipo.codigoPatrimonial, equipo.nombre, equipo.categoria, equipo.marca,
          <span>
            <Etiqueta tono={tonosDisponibilidad[equipo.estado]}>{equipo.estado}</Etiqueta>
            {equipo.estado === 'Disponible' && pendientes.has(equipo.id) && <small> · Ya tienes una solicitud pendiente</small>}
          </span>],
      }))} />}
  </Panel></div>
}
