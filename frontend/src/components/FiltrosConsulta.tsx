export type OpcionConsulta = { id: string; texto: string }
export const rangoVacio = { desde: '', hasta: '' }
export type Rango = typeof rangoVacio

export function SelectorConsulta({ etiqueta, valor, cambiar, opciones, todos = 'Todos' }: {
  etiqueta: string; valor: string; cambiar: (valor: string) => void; opciones: OpcionConsulta[]; todos?: string
}) {
  return <label className="campo">{etiqueta}
    <select value={valor} onChange={e => cambiar(e.currentTarget.value)}>
      <option value="">{todos}</option>
      {opciones.map(({ id, texto }) => <option key={id} value={id}>{texto}</option>)}
    </select>
  </label>
}

export function RangoFechas({ rango, cambiar }: { rango: Rango; cambiar: (rango: Rango) => void }) {
  return <>
    <label className="campo">Desde<input type="date" value={rango.desde} max={rango.hasta || undefined}
      onChange={e => cambiar({ ...rango, desde: e.currentTarget.value })} /></label>
    <label className="campo">Hasta<input type="date" value={rango.hasta} min={rango.desde || undefined}
      onChange={e => cambiar({ ...rango, hasta: e.currentTarget.value })} /></label>
  </>
}

export function enRango(fecha: string, { desde, hasta }: Rango) {
  return (!desde || fecha >= desde) && (!hasta || fecha <= hasta)
}

export const opciones = (valores: string[]) => valores.map(id => ({ id, texto: id }))
