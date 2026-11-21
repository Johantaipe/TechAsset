import { Icono } from './Icono'
import '../styles/indicadores-dashboard.css'

const conceptos = {
  totalEquipos: { tono: 'total', icono: 'inventario' },
  disponibles: { tono: 'disponible', icono: 'approved' },
  activos: { tono: 'activo', icono: 'prestamos' },
  mantenimiento: { tono: 'mantenimiento', icono: 'pending' },
  bajas: { tono: 'baja', icono: 'rejected' },
  pendientes: { tono: 'pendiente', icono: 'agenda' },
  finalizados: { tono: 'finalizado', icono: 'approved' },
  totalPrestamos: { tono: 'prestamos', icono: 'total' },
  totalSolicitudes: { tono: 'total', icono: 'agenda' },
  area: { tono: 'area', icono: 'usuarios' },
}

export type IndicadorDashboard = {
  concepto: keyof typeof conceptos
  etiqueta: string
  valor: number | string | undefined
  enlace?: string
}

export function IndicadoresDashboard({ items, compactos = false }: {
  items: IndicadorDashboard[]
  compactos?: boolean
}) {
  return <dl className={compactos ? 'indicadores-actividad' : 'indicadores stats indicadores-dashboard'}>
    {items.map(({ concepto, etiqueta, valor, enlace }) => {
      const { tono, icono } = conceptos[concepto]
      return <div className={(compactos ? '' : 'indicador stat-card ') + 'indicador-tono-' + tono} key={etiqueta}>
        <dt className="metric-heading">
          <span>{enlace ? <a href={enlace}>{etiqueta}<Icono nombre="enlace" /></a> : etiqueta}</span>
          <span className="metric-icon"><Icono nombre={icono} /></span>
        </dt>
        <dd className={typeof valor === 'string' ? 'indicador-texto' : undefined}>
          <strong>{valor ?? <span aria-label="Sin datos">—</span>}</strong>
        </dd>
      </div>
    })}
  </dl>
}
