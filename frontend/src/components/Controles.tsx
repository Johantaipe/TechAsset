import { useLayoutEffect, useId, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { mensaje } from '../services/api'

export interface Campo {
  nombre: string
  etiqueta: string
  tipo?: 'email' | 'date' | 'textarea' | 'password'
  max?: number
  min?: string
  autocompletar?: string
  sufijo?: string
  patron?: string
  mensajePatron?: string
  opciones?: { valor: string; texto: string }[]
}

export class ErrorCampo extends Error {
  constructor(readonly campo: string, mensaje: string) { super(mensaje) }
}

type VarianteBoton = 'primario' | 'secundario' | 'positivo' | 'peligro'

export function Boton({ variante = 'primario', className = '', type = 'button', ...props }:
  ComponentProps<'button'> & { variante?: VarianteBoton }) {
  return <button type={type} className={['boton', type === 'submit' || variante === 'primario' ? 'submit-button' : '', 'button-' + ({ primario: 'primary', secundario: 'neutral', positivo: 'success', peligro: 'danger' })[variante], className].filter(Boolean).join(' ')} {...props} />
}

export function Mensaje({ texto, tipo = 'error' }: { texto?: string; tipo?: 'error' | 'confirmacion' | 'informacion' }) {
  if (tipo === 'confirmacion') return <div role="status">{texto && <p className="form-message mensaje exito">{texto}</p>}</div>
  return texto ? <p className={'form-message mensaje ' + tipo} role={tipo === 'error' ? 'alert' : 'status'}>{texto}</p> : null
}

export function Panel({ titulo, children }: { titulo: string; children: ReactNode }) {
  const id = useId()
  return <section className="panel reservation-form" aria-labelledby={id}><h2 id={id}>{titulo}</h2>{children}</section>
}

export function Etiqueta({ children, tono = 'neutro' }: {
  children: ReactNode; tono?: 'neutro' | 'positivo' | 'aviso' | 'informativo'
}) {
  return <span className={'etiqueta badge ' + tono}>{children}</span>
}

export function Dialogo({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: ReactNode }) {
  const id = useId()
  const ref = useRef<HTMLDialogElement>(null)
  const origen = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    const dialogo = ref.current!
    if (!origen.current && document.activeElement instanceof HTMLElement && !dialogo.contains(document.activeElement))
      origen.current = document.activeElement

    dialogo.showModal()
    return () => {
      dialogo.close()
      requestAnimationFrame(() => {
        if (document.querySelector('dialog:modal')) return
        const anterior = origen.current
        if (anterior && anterior !== document.body && anterior.isConnected && anterior.getClientRects().length && !anterior.matches(':disabled')) {
          anterior.focus({ preventScroll: true })
        } else {
          document.getElementById('workspace-content')?.focus({ preventScroll: true })
        }
      })
    }
  }, [])

  return <dialog ref={ref} className="dialogo workspace-dialog" aria-labelledby={id} onCancel={evento => {
    evento.preventDefault()
    if (!ref.current?.querySelector('fieldset:disabled')) cerrar()
  }}>
    <h2 id={id}>{titulo}</h2>
    {children}
  </dialog>
}

function CampoFormulario({ campo, inicial, error, indicarObligatorio }: {
  campo: Campo; inicial?: string; error?: string; indicarObligatorio: boolean
}) {
  const id = useId()
  const [mostrar, cambiarVisibilidad] = useState(false)
  const [vistaPrevia, actualizarVista] = useState(inicial ?? '')
  const atributos = {
    id, name: campo.nombre, defaultValue: inicial ?? '', required: true,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [campo.sufijo && id + '-correo', error && id + '-error'].filter(Boolean).join(' ') || undefined,
  }

  return <div className="campo form-group">
    <label htmlFor={id}>{campo.etiqueta}{indicarObligatorio && <span aria-hidden="true"> *</span>}</label>
    {campo.opciones ? <select {...atributos}>
      <option value="" disabled>Selecciona una opción</option>
      {campo.opciones.map(opcion => <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>)}
    </select> : campo.tipo === 'textarea' ? <textarea {...atributos} rows={3} maxLength={campo.max} />
      : campo.tipo === 'password' ? <div className="campo-clave">
        <input {...atributos} type={mostrar ? 'text' : 'password'} autoComplete={campo.autocompletar} maxLength={campo.max} />
        <button type="button" aria-label={(mostrar ? 'Ocultar' : 'Mostrar') + ' contraseña'} aria-controls={id}
          onClick={() => cambiarVisibilidad(!mostrar)}>{mostrar ? 'Ocultar' : 'Mostrar'}</button>
      </div> : campo.sufijo ? <>
        <div className="usuario-correo-compuesto">
          <input {...atributos} type="text" maxLength={campo.max} pattern={campo.patron} autoCapitalize="none" spellCheck={false}
            onChange={evento => actualizarVista(evento.target.value.trim().toLowerCase())} />
          <span aria-hidden="true">{campo.sufijo}</span>
        </div>
        <small className="usuario-correo-previo" id={id + '-correo'}>Correo completo: {(vistaPrevia || 'usuario') + campo.sufijo}</small>
      </> : <input {...atributos} type={campo.tipo ?? 'text'} maxLength={campo.max}
        min={campo.min} autoComplete={campo.autocompletar} />}
    {error && <span className="error-campo" id={id + '-error'}>{error}</span>}
  </div>
}

function validarCampo(campo: Campo, valor: string, control: HTMLInputElement) {
  if (!valor) return campo.opciones ? 'Selecciona una opción.' : 'Completa este campo.'
  if (campo.patron && !new RegExp('^(?:' + campo.patron + ')$').test(valor)) return campo.mensajePatron ?? 'Ingresa un valor válido.'
  if (control.validity.typeMismatch) return 'Ingresa un correo electrónico válido.'
  if (control.validity.rangeUnderflow && campo.min) {
    const [anio, mes, dia] = campo.min.split('-')
    return 'Selecciona el ' + dia + '/' + mes + '/' + anio + ' o una fecha posterior.'
  }
  if (control.validity.badInput) return 'Ingresa un valor válido.'
}

export function Formulario({ campos, valores, guardar, accion, cancelar, variante = 'primario', indicarObligatorios = false }: {
  campos: Campo[]
  valores?: object
  guardar: (datos: Record<string, string>) => Promise<void | false>
  accion: string
  cancelar?: () => void
  variante?: Exclude<VarianteBoton, 'secundario'>
  indicarObligatorios?: boolean
}) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({})
  const [confirmacion, setConfirmacion] = useState('')
  const iniciales = new Map(Object.entries(valores ?? {}).filter(([, valor]) => typeof valor === 'string'))

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const entradas = new FormData(formulario)
    const datos: Record<string, string> = {}
    const errores: Record<string, string> = {}
    for (const campo of campos) {
      const valor = String(entradas.get(campo.nombre) ?? '')
      datos[campo.nombre] = campo.tipo === 'password' ? valor : valor.trim()
      const control = formulario.elements.namedItem(campo.nombre) as HTMLInputElement
      const detalle = validarCampo(campo, datos[campo.nombre], control)
      if (detalle) errores[campo.nombre] = detalle
    }
    setError('')
    setConfirmacion('')
    setErroresCampo(errores)
    const primero = Object.keys(errores)[0]
    if (primero) {
      setError('Revisa los campos señalados.')
      const control = formulario.elements.namedItem(primero) as HTMLElement
      control.focus()
      return
    }

    setEnviando(true)
    try {
      if (await guardar(datos) === false) {
        requestAnimationFrame(() => formulario.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus())
        return
      }
      formulario.reset()
      setConfirmacion('Cambios guardados.')
    } catch (error) {
      if (error instanceof ErrorCampo) {
        setErroresCampo({ [error.campo]: error.message })
        requestAnimationFrame(() => (formulario.elements.namedItem(error.campo) as HTMLElement | null)?.focus())
      } else setError(mensaje(error))
    } finally {
      setEnviando(false)
    }
  }

  return <form noValidate onSubmit={enviar}>
    <fieldset className="formulario form-grid" disabled={enviando}>
      {campos.map(campo => <CampoFormulario key={campo.nombre} campo={campo}
        inicial={iniciales.get(campo.nombre)} error={erroresCampo[campo.nombre]} indicarObligatorio={indicarObligatorios} />)}
      <div className="acciones actions">
        <Boton type="submit" variante={variante}>{enviando ? 'Guardando…' : accion}</Boton>
        {cancelar && <Boton variante="secundario" autoFocus={variante === 'peligro'} onClick={cancelar}>Cancelar</Boton>}
      </div>
    </fieldset>
    <Mensaje texto={error} />
    <Mensaje texto={confirmacion} tipo="confirmacion" />
  </form>
}

export function Filtros({ children }: { children: ReactNode }) {
  return <div className="filtros filters">{children}</div>
}

export function Busqueda({ etiqueta, valor, cambiar }: { etiqueta: string; valor: string; cambiar: (valor: string) => void }) {
  return <label className="busqueda">{etiqueta}
    <input type="search" value={valor} onChange={evento => cambiar(evento.target.value)} />
  </label>
}

export function Tabla({ columnas, filas, titulo, seleccionar, desplazamientoInterno = false, vacio = 'No hay registros para mostrar.' }: {
  columnas: string[]; filas: { id: string; celdas: ReactNode[] }[]; titulo: string; vacio?: string
  seleccionar?: (id: string) => void
  desplazamientoInterno?: boolean
}) {
  if (!filas.length) return <p className="vacio" role="status">{vacio}</p>
  return <div className={desplazamientoInterno ? "tabla table-scroll tabla-interna" : "tabla table-scroll"} role="region" aria-label={titulo} tabIndex={0}>
    <table>
      <thead><tr>{columnas.map(columna => <th key={columna} scope="col">{columna}</th>)}</tr></thead>
      <tbody>{filas.map(fila => <tr key={fila.id} className={seleccionar ? 'fila-consulta' : undefined}
        onClick={seleccionar ? () => seleccionar(fila.id) : undefined}>
        {fila.celdas.map((celda, indice) => <td key={indice}>{seleccionar && indice === 0
          ? <Boton variante="secundario" className="fila-consulta-detalle">{celda}</Boton> : celda}</td>)}
      </tr>)}</tbody>
    </table>
  </div>
}

export function EstadoConsulta({ error, cargando, recargar }: {
  error?: string; cargando: boolean; recargar: () => void
}) {
  if (error) return <div><Mensaje texto={error} />
    <Boton variante="secundario" onClick={recargar}>Reintentar</Boton>
  </div>
  return cargando ? <Mensaje texto="Cargando información…" tipo="informacion" /> : null
}

export function coincide(busqueda: string, ...valores: string[]) {
  return valores.join(' ').toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es'))
}
