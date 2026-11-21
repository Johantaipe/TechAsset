import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { DashboardColaborador, DisponibilidadColaborador, HistorialColaborador, SolicitarPrestamoColaborador } from '../pages/Colaborador'
import { Inventario } from '../pages/Inventario'
import { Usuarios } from '../pages/Usuarios'
import { DevolucionesTecnologia, Prestamos } from '../pages/Prestamos'
import { DashboardTecnologia } from '../pages/DashboardTecnologia'
import { Dashboard, Reportes } from '../pages/Reportes'
import { Acceso } from '../pages/Acceso'
import { Landing } from '../pages/Landing'
import { api, ErrorApi, mensaje, modoDemo } from '../services/api'
import { Boton, Dialogo, Mensaje } from '../components/Controles'
import { Icono } from '../components/Icono'
import { ProfileMenu, TextSizeMenu } from '../components/ProfileMenu'
import { nombresRoles, SesionContexto, type Rol, type Sesion } from '../services/sesion'

const rutas = [
  { ruta: '#/panel', nombre: 'Panel general', icono: 'inicio', pagina: Dashboard, soloAdmin: true },
  { ruta: '#/usuarios', nombre: 'Usuarios', icono: 'usuarios', pagina: Usuarios, soloAdmin: true },
  { ruta: '#/inventario', nombre: 'Inventario', icono: 'inventario', pagina: Inventario },
  { ruta: '#/prestamos', nombre: 'Préstamos y devoluciones', icono: 'prestamos', pagina: Prestamos },
  { ruta: '#/reportes', nombre: 'Reportes', icono: 'total', pagina: Reportes, soloAdmin: true },
]

const rutaTecnologia = { ruta: '#/dashboard-tecnologia', nombre: 'Dashboard', icono: 'inicio', pagina: DashboardTecnologia }

const rutasColaborador = [
  { ruta: '#/inicio-colaborador', nombre: 'Dashboard', icono: 'inicio', pagina: DashboardColaborador },
  { ruta: '#/solicitar-prestamo', nombre: 'Solicitar préstamo', icono: 'nueva', pagina: SolicitarPrestamoColaborador },
  { ruta: '#/historial-prestamos', nombre: 'Historial de préstamos', icono: 'prestamos', pagina: HistorialColaborador },
  { ruta: '#/disponibilidad-equipos', nombre: 'Disponibilidad de equipos', icono: 'inventario', pagina: DisponibilidadColaborador },
]

const rutaLogin = '#/login'
const rutasDelRol = (rol: Rol) => {
  if (rol === 'Colaborador') return rutasColaborador
  const permitidas = rutas.filter(ruta => !ruta.soloAdmin || rol === 'Administrador')
  return rol === 'Tecnologia' ? [rutaTecnologia, ...permitidas.map(ruta =>
    ruta.ruta === '#/prestamos' ? { ...ruta, nombre: 'Préstamos' } : ruta),
    { ruta: '#/devoluciones', nombre: 'Devoluciones', icono: 'approved', pagina: DevolucionesTecnologia },
  ] : permitidas
}

const claveTema = 'techasset-tema'
const claveTexto = 'techasset-tamano-texto'

function leerPreferencia(clave: string) {
  try { return localStorage.getItem(clave) } catch { return null }
}

function guardarPreferencia(clave: string, valor: string) {
  try { localStorage.setItem(clave, valor) } catch { /* La preferencia sigue disponible durante la sesión. */ }
}

function leerTamanoTexto() {
  const nivel = Number(leerPreferencia(claveTexto))
  return nivel >= 100 && nivel <= 150 && nivel % 10 === 0 ? nivel : 100
}

function suscribir(actualizar: () => void) {
  window.addEventListener('hashchange', actualizar)
  return () => window.removeEventListener('hashchange', actualizar)
}

export function App() {
  const ubicacion = useSyncExternalStore(suscribir, () => window.location.hash)
  const [sesion, iniciar] = useState<Sesion | null>()
  const [error, informar] = useState('')
  const [ocupado, ocupar] = useState(false)
  const [confirmarSalida, mostrarSalida] = useState(false)
  const [tema, elegirTema] = useState(() => leerPreferencia(claveTema) === 'oscuro' ? 'oscuro' : 'claro')
  const [tamanoTexto, elegirTamano] = useState(leerTamanoTexto)

  useEffect(() => {
    const control = new AbortController()
    const caducar = () => { mostrarSalida(false); iniciar(null) }
    window.addEventListener('techasset:sesion-caducada', caducar)
    api<Sesion>('sesion', 'GET', undefined, control.signal).then(
      actual => { if (!control.signal.aborted) iniciar(actual) },
      error => {
        if (control.signal.aborted) return
        if (!(error instanceof ErrorApi && error.status === 401)) informar(mensaje(error))
        iniciar(null)
      },
    )
    return () => {
      control.abort()
      window.removeEventListener('techasset:sesion-caducada', caducar)
    }
  }, [])

  const ubicacionBase = ubicacion.split('?')[0]
  const permitidas = sesion ? rutasDelRol(sesion.rol) : []
  const rutaDelRol = permitidas[0]?.ruta
  const rutaAutorizada = permitidas.some(ruta => ruta.ruta === ubicacionBase)

  useEffect(() => {
    if (rutaDelRol && ubicacionBase.startsWith('#/') && !rutaAutorizada) window.location.replace(rutaDelRol)
  }, [rutaAutorizada, rutaDelRol, ubicacionBase])

  async function cambiar(rol?: Rol) {
    ocupar(true)
    informar('')
    try {
      if (rol) iniciar(await api<Sesion>('sesion', 'POST', { rol }))
      else {
        await api('sesion', 'DELETE')
        window.history.replaceState(null, '', '/')
        window.dispatchEvent(new Event('hashchange'))
        mostrarSalida(false)
        iniciar(null)
      }
    } catch (error) {
      informar(mensaje(error))
    } finally {
      ocupar(false)
    }
  }

  const otroTema = tema === 'oscuro' ? 'claro' : 'oscuro'
  const preferencias = <>
    <TextSizeMenu nivel={tamanoTexto} onChange={nivel => {
      elegirTamano(nivel)
      guardarPreferencia(claveTexto, String(nivel))
    }} />
    <button type="button" className="theme-toggle" aria-label={'Activar modo ' + otroTema}
      title={'Activar modo ' + otroTema} onClick={() => {
        elegirTema(otroTema)
        guardarPreferencia(claveTema, otroTema)
      }}><Icono nombre={tema === 'oscuro' ? 'sun' : 'moon'} /></button>
  </>
  const apariencia = {
    'data-tema': tema,
    'data-texto-ampliado': tamanoTexto > 100 ? '' : undefined,
    style: { '--ui-text-scale': tamanoTexto / 100 } as CSSProperties,
  }

  if (!ubicacionBase.startsWith('#/')) return <div className="app tech-publica" {...apariencia}>
    <Landing controles={preferencias} rutaAcceso={rutaDelRol ?? rutaLogin}
      textoAcceso={sesion ? 'Ir a mis módulos' : 'Iniciar sesión'} />
  </div>

  if (!sesion) return <div className="app tech-acceso" {...apariencia}>
    <Acceso aviso={error} comprobando={sesion === undefined} demo={modoDemo} ocupado={ocupado}
      controles={preferencias} entrarDemo={() => cambiar('Administrador')}
      autenticar={(correo, contrasena) => api<Sesion>('sesion', 'POST', { correo, contrasena })}
      onLogin={actual => { iniciar(actual); informar('') }} />
  </div>

  const actual = permitidas.find(ruta => ruta.ruta === ubicacionBase) ?? permitidas[0]
  const consulta = ubicacionBase === actual.ruta ? ubicacion.slice(ubicacionBase.length) : ''
  const Pagina = actual.pagina

  return <SesionContexto.Provider value={sesion}>
    <div className="app" {...apariencia}>
      <a className="workspace-skip" href="#workspace-content" onClick={evento => {
        evento.preventDefault()
        document.getElementById('workspace-content')?.focus()
      }}>Saltar al contenido</a>
      <aside className="sidebar">
        <a className="ru-brand marca-tech" href={permitidas[0].ruta}><Icono nombre="inventario" /><strong>Tech<span>Asset</span></strong></a>
        <div className="menu-label">MENÚ PRINCIPAL</div>
        <nav className="navigation" aria-label="Navegación principal">
          {permitidas.map(ruta => <a key={ruta.ruta} href={ruta.ruta} className={ruta === actual ? 'nav-item active' : 'nav-item'}
            aria-current={ruta === actual ? 'page' : undefined}><Icono nombre={ruta.icono} />{ruta.nombre}</a>)}
        </nav>
      </aside>

      <main className="main" id="workspace-content" tabIndex={-1}>
        <header className="topbar">
          <div><span className="breadcrumb">TechAsset / {actual.nombre}</span><h1>{actual.nombre}</h1></div>
          <div className="user-area">
            {preferencias}
            {modoDemo
              ? <div className="form-group"><label htmlFor="rol-demo">Rol de demostración</label>
                <select id="rol-demo" value={sesion.rol} disabled={ocupado} onChange={evento => cambiar(evento.target.value as Rol)}>
                  {Object.entries(nombresRoles).map(([rol, nombre]) => <option key={rol} value={rol}>{nombre}</option>)}
                </select></div>
              : <ProfileMenu rol={nombresRoles[sesion.rol]} onLogout={() => { informar(''); mostrarSalida(true) }} />}
          </div>
        </header>

        <div className={actual.pagina === Dashboard ? 'content content--dashboard' : 'content'}>
          {modoDemo && <Mensaje texto="Modo demostración. Datos ficticios. Los cambios se pierden al recargar." tipo="informacion" />}
          {!confirmarSalida && <Mensaje texto={error} />}
          <Pagina key={sesion.rol + actual.ruta + consulta} />
        </div>
      </main>

      {confirmarSalida && <Dialogo titulo="Cerrar sesión" cerrar={() => { if (!ocupado) mostrarSalida(false) }}>
        <p>¿Confirmas que deseas cerrar tu sesión en TechAsset?</p>
        <Mensaje texto={error} />
        <div className="actions acciones">
          <Boton variante="secundario" autoFocus disabled={ocupado} onClick={() => mostrarSalida(false)}>Cancelar</Boton>
          <Boton variante="secundario" className="submit-button" disabled={ocupado} onClick={() => cambiar()}>
            {ocupado ? 'Cerrando sesión…' : 'Confirmar cierre de sesión'}
          </Boton>
        </div>
      </Dialogo>}
    </div>
  </SesionContexto.Provider>
}

