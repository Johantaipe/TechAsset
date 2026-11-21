import { useState } from 'react'
import { Boton, Dialogo, EstadoConsulta, Etiqueta, Filtros, Panel, Tabla } from '../components/Controles'
import { enRango, opciones, rangoVacio, RangoFechas, SelectorConsulta } from '../components/FiltrosConsulta'
import { useConsulta } from '../services/api'
import type { Equipo, Movimiento, Prestamo, SolicitudPrestamo, Usuario } from '../types/inventario'
import '../styles/supervision.css'

const filtrosIniciales = { estado: '', equipo: '', colaborador: '', responsable: '' }
const detalleFecha = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' })
const fecha = (valor?: string | null) => valor ? valor.split('-').reverse().join('/') : 'No registrada'

function EstadoPrestamo({ prestamo }: { prestamo: Prestamo }) {
  return <Etiqueta tono={prestamo.fechaDevolucion ? 'positivo' : 'informativo'}>
    {prestamo.fechaDevolucion ? 'Finalizado' : 'Activo'}
  </Etiqueta>
}

export function SupervisionPrestamos() {
  const inventario = useConsulta<Equipo[]>('equipos')
  const usuarios = useConsulta<Usuario[]>('usuarios')
  const prestamos = useConsulta<Prestamo[]>('prestamos')
  const solicitudes = useConsulta<SolicitudPrestamo[]>('solicitudes')
  const [filtros, filtrar] = useState(() => ({
    ...filtrosIniciales,
    estado: new URLSearchParams(window.location.hash.split('?')[1]).get('estado') === 'Activos' ? 'Activos' : '',
  }))
  const [rango, cambiarRango] = useState(rangoVacio)
  const [detalle, abrir] = useState<{ tipo: 'prestamo' | 'solicitud'; id: string }>()
  const eventos = useConsulta<Movimiento[]>(detalle?.tipo === 'prestamo' ? 'reportes/movimientos' : null)
  const equipos = new Map(inventario.datos?.map(e => [e.id, e]))
  const personas = new Map(usuarios.datos?.map(u => [u.id, u]))
  const nombre = (id: string) => {
    const usuario = personas.get(id)
    return usuario ? usuario.nombres + ' ' + usuario.apellidos : 'Sin detalle'
  }
  const etiquetaEquipo = (id: string) => {
    const equipo = equipos.get(id)
    return equipo ? equipo.codigoPatrimonial + ' · ' + equipo.nombre : 'Equipo sin detalle'
  }
  const prestamo = detalle?.tipo === 'prestamo' ? prestamos.datos?.find(p => p.id === detalle.id) : undefined
  const solicitud = detalle?.tipo === 'solicitud' ? solicitudes.datos?.find(s => s.id === detalle.id) : undefined
  const equipoDetalle = prestamo ? equipos.get(prestamo.equipoId) : undefined
  const movimientos = eventos.datos?.filter(m => m.prestamoId === prestamo?.id)
  const listaPersonas = (campo: 'usuarioId' | 'responsableId') =>
    [...new Set(prestamos.datos?.map(p => p[campo]))].map(id => ({ id, texto: nombre(id) }))
      .sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
  const select = (etiqueta: string, campo: keyof typeof filtros, items: ReturnType<typeof opciones>) =>
    <SelectorConsulta etiqueta={etiqueta} valor={filtros[campo]} opciones={items}
      cambiar={valor => filtrar(anterior => ({ ...anterior, [campo]: valor }))} />

  return <div className="supervision-admin">
    <Panel titulo="Solicitudes de préstamo">
      <EstadoConsulta {...solicitudes} />
      <EstadoConsulta {...inventario} />
      <EstadoConsulta {...usuarios} />
      {solicitudes.datos && <Tabla titulo="Solicitudes en supervisión" desplazamientoInterno columnas={['Equipo', 'Colaborador', 'Fecha solicitada', 'Estado']}
        seleccionar={id => abrir({ tipo: 'solicitud', id })} filas={solicitudes.datos.map(s => ({
          id: s.id, celdas: [etiquetaEquipo(s.equipoId), nombre(s.usuarioId), fecha(s.fechaPrestamo),
            <Etiqueta tono={s.prestamoId ? 'positivo' : 'aviso'}>{s.prestamoId ? 'Aprobada' : 'Pendiente'}</Etiqueta>],
        }))} />}
    </Panel>
    <Panel titulo="Historial de préstamos">
      <Filtros>
        {select('Estado', 'estado', opciones(['Activos', 'Finalizados']))}
        {select('Equipo', 'equipo', [...equipos.keys()].map(id => ({ id, texto: etiquetaEquipo(id) })).sort((a, b) => a.texto.localeCompare(b.texto, 'es', { numeric: true })))}
        {select('Colaborador', 'colaborador', listaPersonas('usuarioId'))}
        {select('Responsable', 'responsable', listaPersonas('responsableId'))}
        <RangoFechas rango={rango} cambiar={cambiarRango} />
        <Boton variante="secundario" onClick={() => { filtrar(filtrosIniciales); cambiarRango(rangoVacio) }}>Limpiar filtros</Boton>
      </Filtros>
      <EstadoConsulta {...prestamos} />
      {prestamos.datos && <Tabla titulo="Préstamos en supervisión" desplazamientoInterno
        columnas={['Equipo', 'Colaborador', 'Responsable', 'Fecha de préstamo', 'Estado', 'Fecha de devolución']}
        seleccionar={id => abrir({ tipo: 'prestamo', id })} vacio="No hay préstamos que coincidan con los filtros."
        filas={prestamos.datos.filter(p => (!filtros.estado || filtros.estado === (p.fechaDevolucion ? 'Finalizados' : 'Activos')) &&
          (!filtros.equipo || p.equipoId === filtros.equipo) && (!filtros.colaborador || p.usuarioId === filtros.colaborador) &&
          (!filtros.responsable || p.responsableId === filtros.responsable) && enRango(p.fechaPrestamo, rango))
          .map(p => ({ id: p.id, celdas: [
            etiquetaEquipo(p.equipoId), nombre(p.usuarioId), nombre(p.responsableId), fecha(p.fechaPrestamo),
            <EstadoPrestamo prestamo={p} />, p.fechaDevolucion ? fecha(p.fechaDevolucion) : '—',
          ] }))} />}
    </Panel>

    {solicitud && <Dialogo titulo="Detalle de la solicitud" cerrar={() => abrir(undefined)}>
      <dl><div><dt>Identificador</dt><dd>{solicitud.id}</dd></div>
        <div><dt>Equipo</dt><dd>{etiquetaEquipo(solicitud.equipoId)}</dd></div>
        <div><dt>Colaborador</dt><dd>{nombre(solicitud.usuarioId)}</dd></div>
        <div><dt>Fecha de préstamo solicitada</dt><dd>{fecha(solicitud.fechaPrestamo)}</dd></div>
        <div><dt>Estado</dt><dd>{solicitud.prestamoId ? 'Aprobada' : 'Pendiente'}</dd></div>
      </dl>
      <Boton variante="secundario" onClick={() => abrir(undefined)}>Cerrar</Boton>
    </Dialogo>}
    {prestamo && <Dialogo titulo="Detalle del préstamo" cerrar={() => abrir(undefined)}>
      <div className="detalle-supervision">
        <h3>Equipo</h3>
        <dl><div><dt>Código patrimonial</dt><dd>{equipoDetalle?.codigoPatrimonial ?? 'No registrado'}</dd></div>
          <div><dt>Nombre</dt><dd>{equipoDetalle?.nombre ?? 'No registrado'}</dd></div>
          <div><dt>Categoría</dt><dd>{equipoDetalle?.categoria ?? 'No registrada'}</dd></div>
          <div><dt>Marca</dt><dd>{equipoDetalle?.marca ?? 'No registrada'}</dd></div>
        </dl>
        <h3>Préstamo</h3>
        <dl><div><dt>Identificador</dt><dd>{prestamo.id}</dd></div>
          <div><dt>Colaborador</dt><dd>{nombre(prestamo.usuarioId)}</dd></div>
          <div><dt>Área del colaborador</dt><dd>{personas.get(prestamo.usuarioId)?.area || 'No registrada'}</dd></div>
          <div><dt>Responsable de Tecnología</dt><dd>{nombre(prestamo.responsableId)}</dd></div>
          <div><dt>Fecha de préstamo</dt><dd>{fecha(prestamo.fechaPrestamo)}</dd></div>
          <div><dt>Fecha prevista de devolución</dt><dd>No registrada</dd></div>
          <div><dt>Estado</dt><dd><EstadoPrestamo prestamo={prestamo} /></dd></div>
        </dl>
        <h3>Devolución</h3>
        <dl><div><dt>Devolución solicitada</dt><dd>{prestamo.solicitudDevolucionUtc ? 'Sí' : 'No'}</dd></div>
          <div><dt>Fecha de solicitud de devolución</dt><dd>{prestamo.solicitudDevolucionUtc ? detalleFecha.format(new Date(prestamo.solicitudDevolucionUtc)) : 'No aplica'}</dd></div>
          <div><dt>Devolución confirmada</dt><dd>{prestamo.fechaDevolucion ? 'Sí' : 'No'}</dd></div>
          <div><dt>Fecha real de devolución</dt><dd>{prestamo.fechaDevolucion ? fecha(prestamo.fechaDevolucion) : 'No aplica'}</dd></div>
          <div><dt>Observaciones</dt><dd>{prestamo.observacion || 'No registradas'}</dd></div>
        </dl>
        <h3>Eventos del préstamo</h3>
        <EstadoConsulta {...eventos} />
        {movimientos && (movimientos.length ? <ul>{movimientos.map(m =>
          <li key={m.tipo}>{fecha(m.fecha)} · {m.tipo}</li>)}</ul> : <p>No hay eventos registrados.</p>)}
      </div>
      <Boton variante="secundario" onClick={() => abrir(undefined)}>Cerrar</Boton>
    </Dialogo>}
  </div>
}
