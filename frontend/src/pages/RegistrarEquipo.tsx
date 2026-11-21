import { useId, useRef, useState, type FormEvent } from 'react'
import { Boton, Dialogo, Mensaje } from '../components/Controles'
import { api, ErrorApi, mensaje, useConsulta } from '../services/api'
import type { Equipo } from '../types/inventario'
import '../styles/registro-equipo.css'

const catalogo = [
  { categoria: 'Laptops', prefijo: 'LAP', marcas: ['HP', 'Lenovo', 'Dell', 'ASUS', 'Acer'] },
  { categoria: 'Computadoras de escritorio', prefijo: 'PC', marcas: ['HP', 'Dell', 'Lenovo', 'ASUS', 'Acer'] },
  { categoria: 'Monitores', prefijo: 'MON', marcas: ['Samsung', 'LG', 'Dell', 'AOC', 'BenQ'] },
  { categoria: 'Impresoras', prefijo: 'IMP', marcas: ['Epson', 'HP', 'Canon', 'Brother', 'Xerox'] },
  { categoria: 'Tablets', prefijo: 'TAB', marcas: ['Samsung', 'Apple', 'Lenovo', 'Xiaomi', 'Huawei'] },
  { categoria: 'Proyectores multimedia', prefijo: 'PRO', marcas: ['Epson', 'BenQ', 'ViewSonic', 'Optoma', 'Sony'] },
  { categoria: 'Equipos de red', prefijo: 'RED', marcas: ['Cisco', 'TP-Link', 'Ubiquiti', 'MikroTik', 'D-Link'] },
  { categoria: 'Otro equipo', prefijo: 'OTR', marcas: [] },
]

type AltaEquipo = Pick<Equipo, 'codigoPatrimonial' | 'nombre' | 'categoria' | 'marca'>

function proponerCodigo(prefijo: string, equipos: Equipo[]) {
  const patron = new RegExp('^' + prefijo + '-([0-9]+)$')
  let mayor = 0n
  for (const equipo of equipos) {
    const coincidencia = patron.exec(equipo.codigoPatrimonial.trim().toUpperCase())
    if (coincidencia) {
      const numero = BigInt(coincidencia[1])
      if (numero > mayor) mayor = numero
    }
  }
  const codigo = prefijo + '-' + String(mayor + 1n).padStart(3, '0')
  return codigo.length <= 50 ? codigo : ''
}

export function RegistrarEquipo({ cerrar, registrado }: { cerrar: () => void; registrado: (equipo: Equipo) => void }) {
  const ayudaCodigo = useId()
  const inventario = useConsulta<Equipo[]>('equipos')
  const [prefijo, elegirCategoria] = useState('')
  const [marca, elegirMarca] = useState('')
  const [codigoManual, editarCodigo] = useState<string>()
  const [error, informar] = useState('')
  const [pendiente, confirmar] = useState<AltaEquipo>()
  const [enviando, enviar] = useState(false)
  const guardando = useRef(false)
  const categoria = catalogo.find(item => item.prefijo === prefijo)
  const codigo = codigoManual ?? (categoria && inventario.datos ? proponerCodigo(prefijo, inventario.datos) : '')
  const duplicado = Boolean(codigo.trim()) && inventario.datos?.some(
    equipo => equipo.codigoPatrimonial.trim().toUpperCase() === codigo.trim().toUpperCase(),
  )

  function preparar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!categoria || pendiente || guardando.current) return
    const form = new FormData(evento.currentTarget)
    const campo = (nombre: string) => String(form.get(nombre) ?? '').trim()
    const datos = {
      codigoPatrimonial: codigo.trim().toUpperCase(),
      nombre: campo('nombre'),
      categoria: prefijo === 'OTR' ? campo('categoriaPersonalizada') : categoria.categoria,
      marca: marca === 'otra' ? campo('marcaPersonalizada') : marca,
    }
    if (duplicado) {
      informar('El código patrimonial ya está registrado. Ingresa otro código.')
      return
    }
    informar('')
    confirmar(datos)
  }

  async function guardar() {
    if (!pendiente || guardando.current) return
    guardando.current = true
    enviar(true)
    try {
      registrado(await api<Equipo>('equipos', 'POST', pendiente))
    } catch (error) {
      informar(mensaje(error))
      if (error instanceof ErrorApi && error.status === 409) inventario.recargar()
      confirmar(undefined)
    } finally {
      guardando.current = false
      enviar(false)
    }
  }

  return <>
    <Dialogo titulo="Registrar equipo" cerrar={cerrar}>
      <Boton className="registro-equipo-cerrar" variante="secundario" onClick={cerrar} disabled={enviando}
        aria-label="Cerrar registro de equipo">×</Boton>
      <form onSubmit={preparar}>
        <fieldset className="formulario form-grid" disabled={enviando}>
          <div className="campo form-group">
            <label htmlFor={ayudaCodigo + '-campo'}>Código patrimonial</label>
            <input id={ayudaCodigo + '-campo'} name="codigoPatrimonial" value={codigo} onChange={e => editarCodigo(e.currentTarget.value)}
              required maxLength={50} pattern=".*\S.*" aria-invalid={duplicado || undefined} aria-describedby={ayudaCodigo} />
            <small id={ayudaCodigo}>{duplicado ? 'Este código ya está registrado.' : inventario.error
              ? 'No se pudo calcular la propuesta. Puedes ingresar el código manualmente.'
              : 'Selecciona una categoría para obtener una propuesta. Puedes editarla.'}</small>
          </div>
          <label className="campo form-group">Nombre del equipo
            <input name="nombre" required maxLength={100} pattern=".*\S.*" />
          </label>
          <label className="campo form-group">Categoría
            <select name="categoria" value={prefijo} required onChange={e => {
              const nueva = catalogo.find(item => item.prefijo === e.currentTarget.value)
              elegirCategoria(nueva?.prefijo ?? '')
              if (marca !== 'otra' && !nueva?.marcas.includes(marca)) elegirMarca('')
            }}>
              <option value="" disabled>Selecciona una categoría</option>
              {catalogo.map(item => <option key={item.prefijo} value={item.prefijo}>{item.categoria}</option>)}
            </select>
          </label>
          {prefijo === 'OTR' && <label className="campo form-group">Categoría personalizada
            <input name="categoriaPersonalizada" required maxLength={50} pattern=".*\S.*" />
          </label>}
          <label className="campo form-group">Marca
            <select name="marca" value={marca} onChange={e => elegirMarca(e.currentTarget.value)} disabled={!categoria} required>
              <option value="" disabled>Selecciona una marca</option>
              {categoria?.marcas.map(nombre => <option key={nombre}>{nombre}</option>)}
              {categoria && <option value="otra">Otra marca</option>}
            </select>
          </label>
          {marca === 'otra' && <label className="campo form-group">Marca personalizada
            <input name="marcaPersonalizada" required maxLength={50} pattern=".*\S.*" />
          </label>}
          <div className="acciones actions">
            <Boton type="submit">Registrar equipo</Boton>
            <Boton variante="secundario" onClick={cerrar}>Cancelar</Boton>
          </div>
        </fieldset>
        <Mensaje texto={error} />
      </form>
    </Dialogo>
    {pendiente && <Dialogo titulo="¿Estás seguro de registrar este equipo?" cerrar={() => confirmar(undefined)}>
      <fieldset className="formulario" disabled={enviando}>
        <div className="acciones actions">
          <Boton variante="secundario" autoFocus onClick={() => confirmar(undefined)}>Cancelar</Boton>
          <Boton variante="positivo" onClick={guardar}>{enviando ? 'Registrando…' : 'Confirmar registro'}</Boton>
        </div>
      </fieldset>
    </Dialogo>}
  </>
}
