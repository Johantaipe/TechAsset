import { useState } from 'react'
import { RegistrarEquipo } from './RegistrarEquipo'
import { ActualizarEstadoEquipo } from './ActualizarEstadoEquipo'
import { Boton, Busqueda, coincide, Dialogo, EstadoConsulta, Etiqueta, Filtros, Formulario, Mensaje, Panel, Tabla, type Campo } from '../components/Controles'
import { api, useConsulta } from '../services/api'
import { useSesion } from '../services/sesion'
import { estados, type Equipo, type Prestamo } from '../types/inventario'
import '../styles/inventario-admin.css'
import '../styles/actualizar-estado-equipo.css'

const equiposPorPagina = 6
const tonosEquipo = { Disponible: 'positivo', Prestado: 'informativo', Mantenimiento: 'aviso', Baja: 'neutro' } as const

const categorias = [
  'Laptops', 'Computadoras de escritorio', 'Monitores', 'Impresoras', 'Tablets',
  'Proyectores multimedia', 'Equipos de red',
]
const normalizarCategoria = (valor: string) => valor.trim().toLocaleLowerCase('es')
const ordenCategorias = new Map(categorias.map((categoria, indice) => [normalizarCategoria(categoria), indice]))
const porCodigoPatrimonial = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })
const ordenCategoria = (equipo: Equipo) => ordenCategorias.get(normalizarCategoria(equipo.categoria)) ?? categorias.length

const camposEquipos: Campo[] = [
  { nombre: 'codigoPatrimonial', etiqueta: 'Código patrimonial', max: 50 },
  { nombre: 'nombre', etiqueta: 'Nombre', max: 100 },
  { nombre: 'categoria', etiqueta: 'Categoría', max: 50 },
  { nombre: 'marca', etiqueta: 'Marca', max: 50 },
]

function Editor({ entidad, campos, edicion, cerrar, guardar }: {
  entidad: string
  campos: Campo[]
  edicion?: { id: string }
  cerrar: () => void
  guardar: (datos: Record<string, string>) => Promise<void>
}) {
  return <Dialogo titulo={'Editar ' + entidad} cerrar={cerrar}>
    <Formulario key={edicion?.id} campos={campos} valores={edicion}
      accion={'Guardar ' + entidad} cancelar={cerrar} guardar={guardar} />
  </Dialogo>
}

function DetalleEquipoTecnologia({ equipo, cerrar, actualizar }: {
  equipo: Equipo
  cerrar: () => void
  actualizar: () => void
}) {
  const consulta = useConsulta<Prestamo[]>('prestamos')
  const prestamos = consulta.datos?.filter(prestamo => prestamo.equipoId === equipo.id)
  const activos = prestamos?.filter(prestamo => !prestamo.fechaDevolucion).length ?? 0

  return <Dialogo titulo="Detalle del equipo" cerrar={cerrar}>
    <div className="detalle-equipo-tecnologia">
      <h3>{equipo.nombre}</h3>
      <dl>
        <div><dt>Código patrimonial</dt><dd>{equipo.codigoPatrimonial}</dd></div>
        <div><dt>Categoría</dt><dd>{equipo.categoria}</dd></div>
        <div><dt>Marca</dt><dd>{equipo.marca}</dd></div>
        <div><dt>Estado</dt><dd>{equipo.estado === 'Baja'
          ? <span className="etiqueta badge inventario-estado-baja">Baja</span>
          : <Etiqueta tono={tonosEquipo[equipo.estado]}>{equipo.estado}</Etiqueta>}</dd></div>
      </dl>
      <h4>Estadísticas de préstamos</h4>
      <EstadoConsulta {...consulta} />
      {!consulta.cargando && !consulta.error && prestamos && <dl className="detalle-equipo-estadisticas">
        <div><dt>Total de préstamos</dt><dd>{prestamos.length}</dd></div>
        <div><dt>Activos</dt><dd>{activos}</dd></div>
        <div><dt>Finalizados</dt><dd>{prestamos.length - activos}</dd></div>
      </dl>}
      <div className="acciones">
        <Boton variante="secundario" autoFocus onClick={cerrar}>Cerrar</Boton>
        <Boton onClick={actualizar}>Actualizar estado</Boton>
      </div>
    </div>
  </Dialogo>
}

export function Inventario() {
  const { rol } = useSesion()
  const editarInventario = rol === 'Administrador'
  const tecnologia = rol === 'Tecnologia'
  const filtrarPorCategoria = tecnologia || editarInventario
  const [categoria, elegirCategoria] = useState('')
  const [alta, mostrarAlta] = useState(() => rol === 'Tecnologia' &&
    new URLSearchParams(window.location.hash.split('?')[1]).get('registrar') === '1')
  const [filtro, filtrar] = useState(() => {
    const estado = new URLSearchParams(window.location.hash.split('?')[1]).get('estado')
    return estados.find(valor => valor === estado) ?? ''
  })
  const consulta = useConsulta<Equipo[]>('equipos' + (filtro ? '?estado=' + filtro : ''))
  const [edicion, editar] = useState<Equipo>()
  const [cambio, cambiar] = useState<Equipo>()
  const [detalle, verDetalle] = useState<Equipo>()
  const [busqueda, buscar] = useState('')
  const [paginaSolicitada, paginar] = useState(1)
  const [resultado, informar] = useState('')
  const equipos = consulta.datos?.filter(equipo => {
    const datosBusqueda = editarInventario ? [equipo.codigoPatrimonial, equipo.nombre]
      : [equipo.codigoPatrimonial, equipo.nombre, equipo.categoria, equipo.marca]
    if (!coincide(busqueda, ...datosBusqueda)) return false
    if (!filtrarPorCategoria || !categoria) return true
    const tipo = normalizarCategoria(equipo.categoria)
    return categoria === 'Otros' ? !ordenCategorias.has(tipo) : tipo === normalizarCategoria(categoria)
  })
  if (editarInventario) equipos?.sort((a, b) => porCodigoPatrimonial.compare(a.codigoPatrimonial, b.codigoPatrimonial) || a.id.localeCompare(b.id))
  else if (tecnologia) equipos?.sort((a, b) =>
    ordenCategoria(a) - ordenCategoria(b) || porCodigoPatrimonial.compare(a.codigoPatrimonial, b.codigoPatrimonial))

  const total = equipos?.length ?? 0
  const paginas = Math.max(1, Math.ceil(total / equiposPorPagina))
  const pagina = Math.min(paginaSolicitada, paginas)
  const inicio = (pagina - 1) * equiposPorPagina
  const visibles = editarInventario ? equipos?.slice(inicio, inicio + equiposPorPagina) : equipos

  return <>
    <Mensaje texto={resultado} tipo="confirmacion" />
    {editarInventario && edicion && <Editor entidad="equipo" campos={camposEquipos} edicion={edicion} cerrar={() => editar(undefined)}
      guardar={async datos => {
        await api('equipos/' + edicion.id, 'PUT', datos)
        informar('Cambios guardados.')
        editar(undefined)
        consulta.recargar()
      }} />}
    {tecnologia && detalle && !cambio && <DetalleEquipoTecnologia equipo={detalle} cerrar={() => verDetalle(undefined)}
      actualizar={() => { verDetalle(undefined); cambiar(detalle) }} />}
    {cambio && <ActualizarEstadoEquipo equipo={cambio} cerrar={() => cambiar(undefined)} guardado={() => {
      informar('Estado del equipo actualizado.')
      verDetalle(undefined)
      cambiar(undefined)
      consulta.recargar()
    }} />}
    {alta && <RegistrarEquipo cerrar={() => mostrarAlta(false)} registrado={equipo => {
      mostrarAlta(false)
      if (filtro && filtro !== equipo.estado) filtrar('')
      if (!coincide(busqueda, equipo.codigoPatrimonial, equipo.nombre, equipo.categoria, equipo.marca)) buscar('')
      informar('Equipo registrado correctamente.')
      consulta.recargar()
    }} />}
    <Panel titulo="Equipos registrados">
      {rol === 'Tecnologia' && <Boton onClick={() => { informar(''); mostrarAlta(true) }}>
        <span aria-hidden="true">+</span> Registrar nuevo equipo
      </Boton>}
      <Filtros>
        <Busqueda etiqueta={editarInventario ? "Buscar por código patrimonial o nombre" : "Buscar equipos"} valor={busqueda} cambiar={valor => { buscar(valor); paginar(1) }} />
        <div className="campo"><label htmlFor="estado-inventario">Estado</label>
          <select id="estado-inventario" value={filtro} onChange={e => {
            filtrar(estados.find(estado => estado === e.target.value) ?? '')
            paginar(1)
          }}>
          <option value="">Todos</option>
          {estados.map(e => <option key={e}>{e}</option>)}
        </select></div>
        {filtrarPorCategoria && <div className="campo">
          <label htmlFor="categoria-inventario">Categoría</label>
          <select id="categoria-inventario" value={categoria} onChange={e => { elegirCategoria(e.currentTarget.value); paginar(1) }}>
            <option value="">Todas</option>
            {[...categorias, 'Otros'].map(tipo => <option key={tipo}>{tipo}</option>)}
          </select>
        </div>}
        {editarInventario && (filtro || categoria || busqueda) && <Boton variante="secundario" onClick={() => {
          filtrar('')
          elegirCategoria('')
          buscar('')
          paginar(1)
        }}>Limpiar filtros</Boton>}
      </Filtros>
      <EstadoConsulta {...consulta} />
      {visibles && <div className={editarInventario ? 'inventario-admin' : undefined}>
        <Tabla titulo="Inventario de equipos" vacio={filtrarPorCategoria ? 'No se encontraron equipos con los filtros seleccionados' : undefined}
        columnas={['Código', 'Equipo', 'Categoría', 'Marca', 'Estado', ...(editarInventario || filtrarPorCategoria ? ['Acciones'] : [])]}
        filas={visibles.map(e => ({ id: e.id, celdas: [
          <span className="codigo">{e.codigoPatrimonial}</span>, e.nombre, e.categoria, e.marca,
          tecnologia && e.estado === 'Baja'
            ? <span className="etiqueta badge inventario-estado-baja">{e.estado}</span>
            : <Etiqueta tono={tonosEquipo[e.estado]}>{e.estado}</Etiqueta>,
          ...(editarInventario ? [<div className="acciones">
            {e.estado !== 'Prestado' && <Boton variante="secundario" onClick={() => { informar(''); editar(e) }}>Editar</Boton>}
            {e.estado === 'Prestado' && <span>Requiere devolución</span>}
            {e.estado !== 'Prestado' && <Boton variante="secundario" onClick={() => { informar(''); cambiar(e) }}>Cambiar estado</Boton>}
          </div>] : tecnologia ? [
            <Boton variante="secundario" className="inventario-ver-equipo"
              aria-label={'Ver equipo ' + e.codigoPatrimonial} title="Ver equipo"
              onClick={() => { informar(''); verDetalle(e) }}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.75" />
              </svg>
            </Boton>,
          ] : []),
        ] }))} />
        {editarInventario && <nav className="usuarios-paginacion" aria-label="Paginación del inventario">
          <span role="status">Página {pagina} de {paginas} · Total: {total} · {equiposPorPagina} por página</span>
          <div className="acciones">
            <Boton variante="secundario" disabled={pagina === 1} onClick={() => paginar(pagina - 1)}>Anterior</Boton>
            <Boton variante="secundario" disabled={pagina === paginas} onClick={() => paginar(pagina + 1)}>Siguiente</Boton>
          </div>
        </nav>}
      </div>}
    </Panel>
  </>
}
