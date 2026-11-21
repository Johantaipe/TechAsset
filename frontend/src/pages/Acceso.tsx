import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Icono as IconoSistema } from '../components/Icono'
import { ErrorApi } from '../services/api'
import type { Sesion } from '../services/sesion'

function Icono({ nombre }: { nombre: string }) {
  const trazos: Record<string, ReactNode> = {
    exito: <path d="m5 12 4 4L19 6"/>,
    incorrecto: <path d="m6 6 12 12M18 6 6 18"/>,
    tecnico: <path d="M10.3 4a2 2 0 0 1 3.4 0l8 13a2 2 0 0 1-1.7 3H4a2 2 0 0 1-1.7-3ZM12 9v4m0 3h.01"/>,
    correo: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></>,
    candado: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
    ojo: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    ocultar: <><path d="m3 3 18 18M10 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a20 20 0 0 1-3 4M6 6a20 20 0 0 0-4 6s3.5 7 10 7a12 12 0 0 0 5-1m-7-8a3 3 0 0 0 4 4"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{trazos[nombre]}</svg>;
}

export function Acceso({ autenticar, onLogin, aviso, comprobando, demo, ocupado, entrarDemo, controles }: {
  autenticar: (correo: string, contrasena: string) => Promise<Sesion>
  onLogin: (sesion: Sesion) => void
  aviso: string
  comprobando: boolean
  demo: boolean
  ocupado: boolean
  entrarDemo: () => void
  controles: ReactNode
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const formulario = useRef<HTMLFormElement>(null)
  const ocupadoRef = useRef(false)
  const [mostrar, setMostrar] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [estado, setEstado] = useState<'validando' | 'exito' | 'incorrecto' | 'tecnico'>()
  const id = useId()

  useEffect(() => {
    if (estado && !dialogo.current?.open) dialogo.current?.showModal()
    if (!estado && dialogo.current?.open) {
      dialogo.current.close()
      formulario.current?.querySelector<HTMLInputElement>('[name="contrasena"]')?.focus({ preventScroll: true })
    }
  }, [estado])

  function limpiarError(campo: 'correo' | 'contrasena') {
    if (errores[campo]) setErrores(actual => ({ ...actual, [campo]: '' }))
    if (error) setError('')
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (ocupadoRef.current) return
    const correo = evento.currentTarget.elements.namedItem('correo') as HTMLInputElement
    const contrasena = evento.currentTarget.elements.namedItem('contrasena') as HTMLInputElement
    const errores: Record<string, string> = {}
    if (!correo.value.trim()) errores.correo = 'Ingresa tu correo electrónico.'
    else if (correo.validity.typeMismatch) errores.correo = 'Ingresa un correo electrónico válido.'
    if (!contrasena.value) errores.contrasena = 'Ingresa tu contraseña.'
    setErrores(errores)
    setError('')
    if (Object.keys(errores).length) {
      const control = errores.correo ? correo : contrasena
      control.focus()
      return
    }

    ocupadoRef.current = true
    setEstado('validando')
    try {
      const sesion = await autenticar(correo.value.trim(), contrasena.value)
      setEstado('exito')
      await new Promise(resolve => window.setTimeout(resolve, 500))
      onLogin(sesion)
    } catch (error) {
      const incorrecto = error instanceof ErrorApi && error.status === 401
      setEstado(incorrecto ? 'incorrecto' : 'tecnico')
      setError(incorrecto ? 'Correo o contraseña incorrectos.'
        : error instanceof ErrorApi && error.status === 429 ? 'Demasiados intentos. Espera un minuto y vuelve a intentar.'
        : 'No se pudo verificar el acceso. Inténtalo nuevamente.')
      await new Promise(resolve => window.setTimeout(resolve, 1250))
      setEstado(undefined)
    } finally {
      ocupadoRef.current = false
    }
  }

  const resultado = estado === 'validando' ? 'Ingresando...' : estado === 'exito' ? '¡Acceso correcto!'
    : estado === 'incorrecto' ? 'Acceso incorrecto' : 'No se pudo verificar el acceso'

  return <main className="login-tech">
    <a className="workspace-skip" href="#formulario-acceso" onClick={evento => {
      evento.preventDefault()
      formulario.current?.querySelector('input')?.focus()
    }}>Ir al inicio de sesión</a>

    <a className="login-tech__presentacion" href="/" aria-label="TechAsset, volver a la página de inicio desde la presentación">
      <div className="login-tech__identidad">
        <p className="login-tech__empresa">INNOVATECH SOLUTIONS S.A.C.</p>
        <p className="login-tech__bienvenida">Bienvenido a</p>
        <p className="login-tech__producto">TECHASSET</p>
        <p className="login-tech__descripcion">Sistema de Gestión de Inventario y Préstamo de Equipos Tecnológicos</p>
      </div>
    </a>

    <section className="login-tech__lado-formulario" aria-labelledby={id + '-titulo'}>
      <div className="user-area login-tech__controles">{controles}</div>
      <div className="login-tech__tarjeta">
        <a className="login-tech__marca" href="/" aria-label="TechAsset, volver a la página de inicio">
          <span><IconoSistema nombre="inventario" /></span>
          <strong>TechAsset</strong>
        </a>
        <h1 id={id + '-titulo'}>Iniciar sesión</h1>
        <p className="login-tech__subtitulo">Por favor, ingrese a su cuenta</p>
        {comprobando ? <p role="status" className="login-tech__estado">Comprobando sesión…</p>
          : demo ? <button type="button" className="login-tech__ingresar" disabled={ocupado} onClick={entrarDemo}>Entrar a la demostración</button>
          : <form ref={formulario} id="formulario-acceso" className="login-tech__formulario" noValidate onSubmit={enviar} aria-busy={!!estado}>
            <div className="login-tech__grupo">
              <label htmlFor={id + '-correo'}>Correo electrónico</label>
              <div className="login-tech__campo">
                <Icono nombre="correo" />
                <input id={id + '-correo'} name="correo" type="email" maxLength={150}
                  placeholder="Ingrese su correo" onChange={() => limpiarError('correo')} autoComplete="username" spellCheck={false} required disabled={!!estado}
                  aria-invalid={!!errores.correo} aria-describedby={id + '-ayuda-correo' + (errores.correo ? ' ' + id + '-error-correo' : '')} />
              </div>
              <p id={id + '-ayuda-correo'} className="login-tech__ayuda">
                Ejemplo: <a href="mailto:usuario@innovatech.com.pe">usuario@innovatech.com.pe</a>
              </p>
              {errores.correo && <p id={id + '-error-correo'} className="login-tech__error" role="alert">{errores.correo}</p>}
            </div>
            <div className="login-tech__grupo">
              <label htmlFor={id + '-contrasena'}>Contraseña</label>
              <div className="login-tech__campo">
                <Icono nombre="candado" />
                <input id={id + '-contrasena'} name="contrasena" type={mostrar ? 'text' : 'password'} maxLength={256}
                  placeholder="Ingrese su contraseña" onChange={() => limpiarError('contrasena')} autoComplete="current-password" required disabled={!!estado}
                  aria-invalid={!!errores.contrasena} aria-describedby={errores.contrasena ? id + '-error-contrasena' : undefined} />
                <button className="login-tech__mostrar" type="button" aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={mostrar} aria-controls={id + '-contrasena'} disabled={!!estado} onClick={() => setMostrar(actual => !actual)}>
                  <Icono nombre={mostrar ? 'ocultar' : 'ojo'} />
                </button>
              </div>
              {errores.contrasena && <p id={id + '-error-contrasena'} className="login-tech__error" role="alert">{errores.contrasena}</p>}
            </div>
            <button className="login-tech__ingresar" type="submit" disabled={!!estado}>
              {estado === 'validando' ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>}
        {(error || aviso) && <p className="login-tech__error login-tech__error--servidor" role="alert">{error || aviso}</p>}
        <a className="login-tech__volver" href="/"><IconoSistema nombre="enlace" />Volver al inicio</a>
      </div>
    </section>

    <dialog ref={dialogo} className="login-tech__dialogo workspace-dialog" aria-label="Estado del inicio de sesión"
      onCancel={evento => evento.preventDefault()}>
      <div role="status" aria-atomic="true">
        {estado && <><div className="login-tech__resultado-icono" data-estado={estado} aria-hidden="true">
          {estado === 'validando' ? <span className="rl-spinner" /> : <Icono nombre={estado} />}
        </div><h2>{resultado}</h2></>}
      </div>
    </dialog>
  </main>
}
