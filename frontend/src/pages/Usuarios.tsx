import { useState } from 'react'
import {
  Boton, Busqueda, coincide, Dialogo, ErrorCampo, EstadoConsulta, Etiqueta, Filtros, Formulario, Mensaje, Panel, Tabla,
  type Campo,
} from '../components/Controles'
import { api, ErrorApi, useConsulta } from '../services/api'
import { nombresRoles, useSesion } from '../services/sesion'
import { dominioCorporativo, patronAlias, type UsuarioDirectorio } from '../services/usuarios'
import '../styles/usuarios.css'

const areas = ['Sistemas', 'Operaciones', 'Contabilidad']
const opcionesRol = Object.entries(nombresRoles).map(([valor, texto]) => ({ valor, texto }))
const tamanoPagina = 5
const camposContrasena: Campo[] = [
  { nombre: 'contrasena', etiqueta: 'Contraseña', tipo: 'password', max: 256, autocompletar: 'new-password' },
  { nombre: 'confirmarContrasena', etiqueta: 'Confirmar contraseña', tipo: 'password', max: 256, autocompletar: 'new-password' },
]

function validarContrasena({ contrasena, confirmarContrasena }: Record<string, string>) {
  if (contrasena.length < 12 || !contrasena.trim())
    throw new ErrorCampo('contrasena', 'Ingresa una contraseña de al menos 12 caracteres.')
  if (contrasena !== confirmarContrasena)
    throw new ErrorCampo('confirmarContrasena', 'Las contraseñas deben coincidir.')
  return { contrasena, confirmarContrasena }
}

const camposNombre: Campo[] = [
  { nombre: 'nombres', etiqueta: 'Nombres', max: 100 },
  { nombre: 'apellidos', etiqueta: 'Apellidos', max: 100 },
]

export function Usuarios() {
  const sesion = useSesion()
  const consulta = useConsulta<UsuarioDirectorio[]>('usuarios')
  const [editor, editar] = useState<'nuevo' | UsuarioDirectorio>()
  const [busqueda, buscar] = useState('')
  const [paginaSolicitada, paginar] = useState(1)
  const [resultado, informar] = useState('')
  const [deshabilitar, seleccionar] = useState<UsuarioDirectorio>()
  const [activar, seleccionarActivacion] = useState<UsuarioDirectorio>()
  const [confirmarAlta, pedirConfirmacion] = useState<{ resolver: (aceptar: boolean) => void }>()

  const usuarios = consulta.datos ?? []
  const filtrados = usuarios.filter(u => coincide(busqueda, u.nombres, u.apellidos, u.correo, u.area ?? '',
    String(u.numeroDirectorio).padStart(3, '0'), u.rol ? nombresRoles[u.rol] : ''))
    .sort((a, b) => a.numeroDirectorio - b.numeroDirectorio)
  const paginas = Math.max(1, Math.ceil(filtrados.length / tamanoPagina))
  const pagina = Math.min(paginaSolicitada, paginas)
  const inicio = (pagina - 1) * tamanoPagina
  const visibles = filtrados.slice(inicio, inicio + tamanoPagina)
  const nuevo = editor === 'nuevo'
  const edicion = typeof editor === 'object' ? editor : undefined
  const campos: Campo[] = nuevo ? [
    ...camposNombre,
    { nombre: 'rol', etiqueta: 'Rol', opciones: opcionesRol },
    { nombre: 'alias', etiqueta: 'Correo electrónico', max: 64, sufijo: dominioCorporativo, patron: patronAlias,
      mensajePatron: 'Usa letras o números, separados si hace falta por puntos, guiones, guiones bajos o signos +.' },
    ...camposContrasena,
  ] : [
    ...camposNombre,
    { nombre: 'correo', etiqueta: 'Correo electrónico', tipo: 'email', max: 150 },
  ]

  const campoArea: Campo = { nombre: 'area', etiqueta: 'Área', opciones: [
    { valor: 'conservar', texto: edicion ? 'Conservar área actual' : 'Sin asignar' },
    ...areas.map(area => ({ valor: area, texto: area })),
  ] }

  function resolverAlta(aceptar: boolean) {
    confirmarAlta?.resolver(aceptar)
    pedirConfirmacion(undefined)
  }

  async function guardar(datos: Record<string, string>) {
    const credenciales = nuevo ? validarContrasena(datos) : undefined
    if (nuevo && !await new Promise<boolean>(resolver => pedirConfirmacion({ resolver }))) return false as const
    const correo = nuevo ? datos.alias.toLowerCase() + dominioCorporativo : datos.correo
    const { nombres, apellidos, rol } = datos
    try {
      await api(edicion ? 'usuarios/' + edicion.id : 'usuarios', edicion ? 'PUT' : 'POST',
        { nombres, apellidos, correo, ...(datos.area !== 'conservar' ? { area: datos.area } : {}),
          ...(nuevo ? { rol, ...credenciales } : {}) })
    } catch (error) {
      if (error instanceof ErrorApi && error.status === 409)
        throw new ErrorCampo(nuevo ? 'alias' : 'correo', 'Ese correo electrónico ya está registrado.')
      throw error
    }
    informar(nuevo ? 'Usuario registrado correctamente' : 'Cambios guardados.')
    editar(undefined)
    consulta.recargar()
  }

  return <>
    {editor && <Dialogo titulo={nuevo ? 'Registrar usuario' : 'Editar usuario'} cerrar={() => editar(undefined)}>
      <p className="usuario-ayuda">{nuevo
        ? 'Los campos con * son obligatorios. Usa al menos 12 caracteres en la contraseña.'
        : 'Los campos con * son obligatorios. El rol se conserva al guardar los cambios.'}</p>
      {edicion && <p className="usuario-ayuda">Área actual: {edicion.area || 'Sin asignar'}</p>}
      <Formulario campos={[...campos, campoArea]} valores={{ ...edicion, area: 'conservar' }} indicarObligatorios
        accion={nuevo ? 'Guardar' : 'Guardar usuario'} cancelar={() => editar(undefined)} guardar={guardar} />
    </Dialogo>}
    {confirmarAlta && <Dialogo titulo="¿Estás seguro de registrar este usuario?" cerrar={() => resolverAlta(false)}>
      <div className="acciones actions">
        <Boton variante="secundario" autoFocus onClick={() => resolverAlta(false)}>Cancelar</Boton>
        <Boton variante="positivo" className="submit-button" onClick={() => resolverAlta(true)}>Sí, registrar</Boton>
      </div>
    </Dialogo>}
    {activar && <Dialogo titulo="Establecer contraseña inicial" cerrar={() => seleccionarActivacion(undefined)}>
      <p>Habilita el inicio de sesión para {activar.correo}. Usa al menos 12 caracteres.</p>
      <Formulario key={activar.id} campos={camposContrasena} accion="Habilitar acceso" variante="positivo" indicarObligatorios
        cancelar={() => seleccionarActivacion(undefined)} guardar={async datos => {
          await api('usuarios/' + activar.id + '/contrasena-inicial', 'POST', validarContrasena(datos))
          informar('Acceso habilitado.')
          seleccionarActivacion(undefined)
          consulta.recargar()
        }} />
    </Dialogo>}
    {deshabilitar && <Dialogo titulo={'Deshabilitar a ' + deshabilitar.nombres + ' ' + deshabilitar.apellidos}
      cerrar={() => seleccionar(undefined)}>
      <p>Esta cuenta perderá el acceso a TechAsset.</p>
      <Formulario key={deshabilitar.id} campos={[]} accion="Confirmar deshabilitación" variante="peligro"
        cancelar={() => seleccionar(undefined)} guardar={async () => {
          await api('usuarios/' + deshabilitar.id + '/deshabilitar', 'PATCH')
          informar('Usuario deshabilitado.')
          seleccionar(undefined)
          consulta.recargar()
        }} />
    </Dialogo>}
    <Panel titulo="Directorio">
      <div className="usuarios-directorio">
        <Mensaje texto={resultado} tipo="confirmacion" />
        <Filtros>
          <Busqueda etiqueta="Buscar usuarios" valor={busqueda} cambiar={texto => { buscar(texto); paginar(1) }} />
          <div className="usuarios-acciones">
            <Boton onClick={() => { informar(''); editar('nuevo') }}><span aria-hidden="true">+</span> Registrar usuario</Boton>
          </div>
        </Filtros>
        <EstadoConsulta {...consulta} />
        {consulta.datos && <>
          {!!visibles.length && <p className="usuarios-tabla-ayuda">Desplaza la tabla horizontalmente para consultar todas las columnas.</p>}
          <Tabla titulo="Usuarios del directorio" columnas={['ID', 'Nombres', 'Apellidos', 'Rol', 'Correo', 'Estado', 'Acciones']}
            filas={visibles.map(u => ({ id: u.id, celdas: [
              String(u.numeroDirectorio).padStart(3, '0'), u.nombres, u.apellidos, u.rol ? nombresRoles[u.rol] : 'Sin asignar', u.correo,
              <Etiqueta tono={u.estado ? 'positivo' : 'neutro'}>{u.estado ? 'Habilitado' : 'Deshabilitado'}</Etiqueta>,
              <div className="acciones">
                <Boton variante="secundario" onClick={() => { informar(''); editar(u) }}
                  aria-label={'Editar a ' + u.nombres + ' ' + u.apellidos}>Editar</Boton>
                {u.puedeEstablecerContrasena && <Boton variante="positivo"
                  onClick={() => { informar(''); seleccionarActivacion(u) }}>Establecer contraseña inicial</Boton>}
                {u.estado && u.id !== sesion.usuarioId && <Boton variante="peligro"
                  onClick={() => { informar(''); seleccionar(u) }}>Deshabilitar</Boton>}
              </div>,
            ] }))} />
          <nav className="usuarios-paginacion" aria-label="Paginación del directorio">
            <span role="status">Página {pagina} de {paginas} · Total: {usuarios.length} · {tamanoPagina} por página
              {busqueda.trim() && <> · {filtrados.length} coincidencias</>}</span>
            <div className="acciones">
              <Boton variante="secundario" disabled={pagina === 1} onClick={() => paginar(pagina - 1)}>Anterior</Boton>
              <Boton variante="secundario" disabled={pagina === paginas} onClick={() => paginar(pagina + 1)}>Siguiente</Boton>
            </div>
          </nav>
        </>}
      </div>
    </Panel>
  </>
}

