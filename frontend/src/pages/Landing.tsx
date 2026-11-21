import { useLayoutEffect, useRef, useSyncExternalStore, type MouseEvent, type ReactNode, type TouchEvent } from 'react'
import { Icono } from '../components/Icono'
import panel from '../assets/techasset-panel.webp'

const navegacion = [
  ['inicio', 'Inicio'], ['caracteristicas', 'Características'], ['modulos', 'Módulos'],
  ['roles', 'Roles'], ['beneficios', 'Beneficios'], ['acerca', 'Acerca de'],
]

const caracteristicas = [
  { icono: 'inventario', titulo: 'Inventario centralizado', descripcion: 'Consulta los equipos tecnológicos y sus estados en un solo lugar.' },
  { icono: 'prestamos', titulo: 'Control de préstamos', descripcion: 'Da seguimiento a la solicitud, la entrega y la devolución.' },
  { icono: 'total', titulo: 'Reportes e indicadores', descripcion: 'Consulta el uso de los equipos y el historial de movimientos.' },
  { icono: 'usuarios', titulo: 'Gestión por roles', descripcion: 'Accede a las operaciones autorizadas para tu rol.' },
]

const modulos = [
  { icono: 'usuarios', titulo: 'Usuarios', descripcion: 'Registra y edita perfiles, asigna roles y gestiona el acceso al sistema.' },
  { icono: 'inventario', titulo: 'Inventario', descripcion: 'Registra equipos con su código patrimonial, categoría, marca y estado.' },
  { icono: 'agenda', titulo: 'Solicitudes', descripcion: 'Solicita un equipo disponible y consulta si la solicitud fue aprobada.' },
  { icono: 'prestamos', titulo: 'Préstamos', descripcion: 'Registra préstamos directos o a partir de solicitudes aprobadas.' },
  { icono: 'approved', titulo: 'Devoluciones', descripcion: 'Registra la fecha y las observaciones de la devolución.' },
  { icono: 'total', titulo: 'Reportes', descripcion: 'Consulta préstamos por área, equipos más utilizados e historial de movimientos.' },
]

const roles = [
  { icono: 'usuarios', titulo: 'Administrador', descripcion: 'Gestiona usuarios e inventario y consulta el panel general y los reportes.' },
  { icono: 'inventario', titulo: 'Responsable de Tecnología', descripcion: 'Revisa solicitudes, aprueba préstamos y registra préstamos directos y devoluciones.' },
  { icono: 'profile', titulo: 'Colaborador', descripcion: 'Consulta equipos disponibles, solicita préstamos y revisa el estado de sus solicitudes.' },
]

function suscribirAncla(actualizar: () => void) {
  window.addEventListener('hashchange', actualizar)
  return () => window.removeEventListener('hashchange', actualizar)
}

function leerAncla() {
  return window.location.hash.slice(1) || 'inicio'
}

function Tarjetas({ items }: { items: typeof modulos }) {
  return <ul className="publica-tarjetas">
    {items.map(({ icono, titulo, descripcion }) => <li className="publica-tarjeta" key={titulo}>
      <span className="publica-icono"><Icono nombre={icono} /></span>
      <h3>{titulo}</h3>
      <p>{descripcion}</p>
    </li>)}
  </ul>
}

export function Landing({ controles, rutaAcceso, textoAcceso }: {
  controles: ReactNode
  rutaAcceso: string
  textoAcceso: string
}) {
  const ancla = useSyncExternalStore(suscribirAncla, leerAncla)
  const indice = Math.max(0, navegacion.findIndex(([id]) => id === ancla))
  const [seccionActual, nombreActual] = navegacion[indice]
  const anterior = navegacion[indice - 1]
  const siguiente = navegacion[indice + 1]
  const panelAnterior = useRef(seccionActual)
  const gesto = useRef<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    if (panelAnterior.current !== seccionActual) {
      panelAnterior.current = seccionActual
      const destino = document.getElementById(seccionActual)
      destino?.closest('.publica-panel')?.scrollTo(0, 0)
      destino?.focus({ preventScroll: true })
    }
  }, [seccionActual])

  function irA(id: string) {
    if (id === seccionActual) {
      document.getElementById(id)?.focus({ preventScroll: true })
      return
    }
    history.pushState(null, '', '#' + id)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  function seguirAncla(evento: MouseEvent) {
    if (evento.defaultPrevented || evento.button || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return
    const id = (evento.target as Element).closest('a[href^="#"]')?.getAttribute('href')?.slice(1)
    if (!id || !navegacion.some(([seccion]) => seccion === id)) return
    evento.preventDefault()
    irA(id)
  }

  function iniciarGesto(evento: TouchEvent) {
    gesto.current = null
    if (evento.touches.length !== 1) return
    let elemento = evento.target as Element | null
    while (elemento && elemento !== evento.currentTarget) {
      if (elemento.scrollWidth > elemento.clientWidth && /auto|scroll/.test(getComputedStyle(elemento).overflowX)) return
      elemento = elemento.parentElement
    }
    const { clientX: x, clientY: y } = evento.touches[0]
    gesto.current = { x, y }
  }

  function terminarGesto(evento: TouchEvent) {
    const inicio = gesto.current
    gesto.current = null
    if (!inicio || evento.touches.length || evento.changedTouches.length !== 1) return
    const x = evento.changedTouches[0].clientX - inicio.x
    const y = evento.changedTouches[0].clientY - inicio.y
    if (Math.abs(x) < 55 || Math.abs(x) < Math.abs(y) * 1.5) return
    const destino = x < 0 ? siguiente : anterior
    if (destino) irA(destino[0])
  }

  return <div className="publica-presentacion" onClick={seguirAncla}>
    <a className="workspace-skip" href={'#' + seccionActual}>Saltar al contenido</a>
    <header className="publica-cabecera">
      <div className="publica-contenedor">
        <a className="marca-tech" href="#inicio"><Icono nombre="inventario" /><strong>Tech<span>Asset</span></strong></a>
        <span className="publica-empresa">Innovatech Solutions S.A.C.</span>
        <nav className="publica-nav" aria-label="Navegación pública">
          {navegacion.map(([id, texto]) => <a href={'#' + id} key={id} aria-current={seccionActual === id ? 'location' : undefined}>{texto}</a>)}
        </nav>
        <div className="user-area publica-controles">
          {controles}
          <a className="publica-boton button-primary" href={rutaAcceso}><Icono nombre="logout" />{textoAcceso}</a>
        </div>
      </div>
    </header>

    <main id="contenido-publico" className="publica-visor"
      onTouchStart={iniciarGesto} onTouchEnd={terminarGesto} onTouchCancel={() => { gesto.current = null }}>
      <div className="publica-pista" style={{ transform: 'translateX(' + (-100 * indice) + '%)' }}>
        <div className="publica-panel publica-intro" inert={indice !== 0}>
          <section id="inicio" className="publica-contenedor publica-hero" aria-labelledby="titulo-publico" tabIndex={-1}>
            <div className="publica-hero-texto">
              <p className="publica-etiqueta">Sistema de gestión tecnológica</p>
              <h1 id="titulo-publico">Tech<span>Asset</span></h1>
              <p className="publica-lema">Gestión inteligente de <span>activos tecnológicos</span></p>
              <p className="publica-descripcion">Administra el inventario, controla el préstamo de equipos y obtén información clave para la toma de decisiones en <strong>Innovatech Solutions S.A.C.</strong></p>
              <div className="publica-acciones">
                <a className="publica-boton button-primary" href={rutaAcceso}><Icono nombre="logout" />{textoAcceso}</a>
                <a className="publica-boton publica-secundario" href="#caracteristicas">Conocer más<Icono nombre="enlace" /></a>
              </div>
            </div>
            <figure className="publica-hero-visual">
              <img src={panel} alt="Laptop con una vista ilustrativa del panel de inventario de TechAsset" fetchPriority="high" />
              <figcaption>Vista ilustrativa del sistema</figcaption>
            </figure>
          </section>
        </div>

        <div className="publica-panel publica-panel--caracteristicas" inert={indice !== 1}>
          <section id="caracteristicas" className="publica-contenedor publica-destacados" aria-labelledby="titulo-caracteristicas" tabIndex={-1}>
            <h2 id="titulo-caracteristicas" className="publica-oculto">Características</h2>
            <ul>
              {caracteristicas.map(({ icono, titulo, descripcion }) => <li key={titulo}>
                <span className="publica-icono"><Icono nombre={icono} /></span>
                <div><h3>{titulo}</h3><p>{descripcion}</p></div>
              </li>)}
            </ul>
          </section>
        </div>

        <section className="publica-panel" inert={indice !== 2} aria-labelledby="modulos">
          <div className="publica-contenedor publica-seccion">
            <h2 id="modulos" tabIndex={-1}>Módulos</h2>
            <Tarjetas items={modulos} />
          </div>
        </section>

        <section className="publica-panel publica-banda" inert={indice !== 3} aria-labelledby="roles">
          <div className="publica-contenedor publica-seccion">
            <h2 id="roles" tabIndex={-1}>Roles</h2>
            <Tarjetas items={roles} />
          </div>
        </section>

        <section className="publica-panel" inert={indice !== 4} aria-labelledby="beneficios">
          <div className="publica-contenedor publica-seccion">
            <h2 id="beneficios" tabIndex={-1}>Beneficios</h2>
            <Tarjetas items={[
              { icono: 'pending', titulo: 'Consulta antes de solicitar', descripcion: 'Filtra por estado y verifica qué equipos están disponibles para préstamo.' },
              { icono: 'agenda', titulo: 'Trazabilidad de los equipos', descripcion: 'Conserva las fechas de préstamo y devolución y las observaciones del retorno.' },
              { icono: 'total', titulo: 'Decisiones con información', descripcion: 'Identifica los equipos con mayor uso al planificar la gestión del inventario.' },
            ]} />
          </div>
        </section>

        <section className="publica-panel publica-banda" inert={indice !== 5} aria-labelledby="acerca">
          <div className="publica-contenedor publica-seccion publica-acerca">
            <div>
              <h2 id="acerca" tabIndex={-1}>Acerca de TechAsset</h2>
              <p>Sistema de Gestión de Inventario y Préstamo de Equipos Tecnológicos de Innovatech Solutions S.A.C.</p>
            </div>
            <a className="publica-boton button-primary" href={rutaAcceso}>{textoAcceso}<Icono nombre="enlace" /></a>
          </div>
          <footer className="publica-pie">
            <div className="publica-contenedor">
              <strong>TechAsset</strong>
              <span>Innovatech Solutions S.A.C.</span>
              <a href="#inicio">Volver al inicio</a>
            </div>
          </footer>
        </section>
      </div>
    </main>
    <nav className="publica-paginacion" aria-label="Controles de la presentación">
      <button type="button" disabled={!anterior} onClick={() => irA(anterior[0])}>
        <Icono nombre="enlace" />Anterior
      </button>
      <span>{nombreActual} · {indice + 1} / {navegacion.length}</span>
      <button type="button" disabled={!siguiente} onClick={() => irA(siguiente[0])}>
        Siguiente<Icono nombre="enlace" />
      </button>
    </nav>
  </div>
}
