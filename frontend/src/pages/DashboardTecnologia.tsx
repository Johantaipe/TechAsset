import { IndicadoresDashboard, type IndicadorDashboard } from '../components/IndicadoresDashboard'
import { EstadoConsulta, Panel, Tabla } from '../components/Controles'
import { Icono } from '../components/Icono'
import { modoDemo, useConsulta } from '../services/api'
import type { Equipo, Prestamo, SolicitudPrestamo, Usuario } from '../types/inventario'
import '../styles/dashboard-tecnologia.css'

type Participante = Pick<Usuario, 'id' | 'nombres' | 'apellidos'>
const rutaInventario = '#/inventario'
const rutaPrestamos = '#/prestamos'
const comparar = new Intl.Collator('es', { sensitivity: 'base' }).compare

function contar(valores: string[]) {
  const conteo = new Map<string, number>()
  for (const valor of valores) conteo.set(valor, (conteo.get(valor) ?? 0) + 1)
  return conteo
}

export function DashboardTecnologia() {
  const equipos = useConsulta<Equipo[]>(modoDemo ? null : 'equipos')
  const solicitudes = useConsulta<SolicitudPrestamo[]>(modoDemo ? null : 'solicitudes')
  const prestamos = useConsulta<Prestamo[]>(modoDemo ? null : 'prestamos')
  const participantes = useConsulta<Participante[]>(modoDemo ? null : 'prestamos/participantes')

  const pendientes = solicitudes.datos?.filter(solicitud => solicitud.prestamoId === null)
  const pendientesRecientes = pendientes?.sort((a, b) => b.fechaPrestamo.localeCompare(a.fechaPrestamo)).slice(0, 2)
  const porEquipo = new Map(equipos.datos?.map(equipo => [equipo.id, equipo]))
  const porParticipante = new Map(participantes.datos?.map(usuario => [usuario.id, usuario.nombres + ' ' + usuario.apellidos]))
  const categorias = [...contar((equipos.datos ?? []).map(equipo => equipo.categoria)).entries()]
    .sort(([a], [b]) => comparar(a, b))
  const maxCategoria = Math.max(1, ...categorias.map(([, total]) => total))
  const masUtilizados = [...contar((prestamos.datos ?? []).map(prestamo => prestamo.equipoId)).entries()]
    .sort(([idA, a], [idB, b]) => b - a || comparar(porEquipo.get(idA)?.nombre ?? idA, porEquipo.get(idB)?.nombre ?? idB))
    .slice(0, 2)
  const porEstado = contar((equipos.datos ?? []).map(equipo => equipo.estado))
  const indicadores: IndicadorDashboard[] = [
    { etiqueta: 'Total de equipos', valor: equipos.datos?.length, concepto: 'totalEquipos' },
    { etiqueta: 'Equipos disponibles', valor: equipos.datos && (porEstado.get('Disponible') ?? 0), concepto: 'disponibles' },
    { etiqueta: 'Equipos prestados', valor: equipos.datos && (porEstado.get('Prestado') ?? 0), concepto: 'activos' },
    { etiqueta: 'Equipos en mantenimiento', valor: equipos.datos && (porEstado.get('Mantenimiento') ?? 0), concepto: 'mantenimiento' },
    { etiqueta: 'Solicitudes pendientes de aprobación', valor: pendientes?.length, concepto: 'pendientes' },
    { etiqueta: 'Préstamos activos', valor: prestamos.datos?.filter(prestamo => prestamo.fechaDevolucion === null).length, concepto: 'activos' },
  ]

  return <div className="dash-panel dash-tecnologia">
    <section className="welcome dash-welcome">
      <div><h2>Operaciones de tecnología</h2><p>Consulta el inventario, prioriza solicitudes y supervisa los préstamos activos.</p></div>
    </section>

    <Panel titulo="Accesos rápidos">
    <div className="dash-tecnologia-accesos">
      <a className="button-primary" href={rutaInventario + '?registrar=1'}><Icono nombre="nueva" />Registrar nuevo equipo</a>
      <a href={rutaInventario}><Icono nombre="inventario" />Consultar inventario</a>
      <a href={rutaPrestamos}><Icono nombre="prestamos" />Gestionar préstamos</a>
      <a href="#/devoluciones"><Icono nombre="approved" />Gestionar devoluciones</a>
    </div>
    </Panel>

    {modoDemo && <p className="vacio">Los indicadores están disponibles al conectarse al sistema real.</p>}
    {!modoDemo && <section aria-labelledby="indicadores-tecnologia">
        <h2 id="indicadores-tecnologia">Resumen de operaciones</h2>
        <IndicadoresDashboard items={indicadores} />
    </section>}

    {!modoDemo && <div className="dash-tecnologia-detalles">
      <Panel titulo="Equipos por categoría">
        <EstadoConsulta {...equipos} />
        {equipos.datos && (categorias.length ? <ul className="dash-tecnologia-grafico">
          {categorias.map(([categoria, cantidad]) => <li key={categoria}>
            <div><span>{categoria}</span><strong>{cantidad}</strong></div>
            <meter min={0} max={maxCategoria} value={cantidad} aria-label={categoria} aria-valuetext={cantidad + ' equipos'} />
          </li>)}
        </ul> : <p className="vacio">Todavía no hay equipos registrados.</p>)}
      </Panel>

      <Panel titulo="Solicitudes pendientes">
        <EstadoConsulta {...solicitudes} />
        {pendientesRecientes && (pendientesRecientes.length ? <>
          {participantes.error && <EstadoConsulta {...participantes} />}
          <Tabla titulo="Solicitudes pendientes de aprobación" columnas={['Equipo', 'Solicitante', 'Fecha']}
            filas={pendientesRecientes.map(solicitud => {
              const equipo = porEquipo.get(solicitud.equipoId)
              return { id: solicitud.id, celdas: [
                <>{equipo?.nombre ?? '—'}{equipo?.marca && <small className="dash-tecnologia-marca">{equipo.marca}</small>}</>,
                porParticipante.get(solicitud.usuarioId) ?? '—', solicitud.fechaPrestamo || '—',
              ] }
            })} />
        </> : <p className="vacio">No hay solicitudes por aprobar.</p>)}
        <a className="dash-tecnologia-enlace" href={rutaPrestamos}>Revisar solicitudes <Icono nombre="enlace" /></a>
      </Panel>

      <Panel titulo="Equipos más utilizados">
        <EstadoConsulta {...prestamos} />
        {prestamos.datos && (masUtilizados.length ? <Tabla titulo="Equipos con más préstamos"
          columnas={['Equipo', 'Categoría', 'Préstamos']}
          filas={masUtilizados.map(([id, total]) => {
            const equipo = porEquipo.get(id)
            return { id, celdas: [<>{equipo?.nombre ?? '—'}{equipo?.marca && <small className="dash-tecnologia-marca">{equipo.marca}</small>}</>, equipo?.categoria ?? '—', total] }
          })} /> : <p className="vacio">Todavía no hay préstamos registrados.</p>)}
      </Panel>
    </div>}
  </div>
}

