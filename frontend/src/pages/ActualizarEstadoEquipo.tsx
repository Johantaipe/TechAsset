import { useState } from 'react'
import { Boton, Dialogo, Formulario } from '../components/Controles'
import { api } from '../services/api'
import { estados, type Equipo } from '../types/inventario'
import '../styles/actualizar-estado-equipo.css'

export function ActualizarEstadoEquipo({ equipo, cerrar, guardado }: {
  equipo: Equipo
  cerrar: () => void
  guardado: () => void
}) {
  const [confirmacion, confirmar] = useState<{ estado: string; resolver: (acepta: boolean) => void }>()
  const opciones = estados.filter(estado => estado !== 'Prestado' && estado !== equipo.estado)
  function resolver(acepta: boolean) {
    confirmacion?.resolver(acepta)
    confirmar(undefined)
  }

  return <>
    <Dialogo titulo="Actualizar estado del equipo" cerrar={cerrar}>
      <dl>
        <div><dt>Código patrimonial</dt><dd>{equipo.codigoPatrimonial}</dd></div>
        <div><dt>Nombre del equipo</dt><dd>{equipo.nombre}</dd></div>
        <div><dt>Estado actual</dt><dd>{equipo.estado}</dd></div>
      </dl>
      {equipo.estado === 'Prestado' ? <>
        <p>Registra primero la devolución del equipo prestado.</p>
        <Boton variante="secundario" onClick={cerrar}>Cancelar</Boton>
      </> : <Formulario campos={[
        { nombre: 'estado', etiqueta: 'Nuevo estado', opciones: opciones.map(estado => ({ valor: estado, texto: estado })) },
        { nombre: 'motivo', etiqueta: 'Motivo del cambio', tipo: 'textarea', max: 500 },
      ]} indicarObligatorios accion="Guardar cambios" cancelar={cerrar} guardar={async datos => {
        if (!await new Promise<boolean>(acepta => confirmar({ estado: datos.estado, resolver: acepta }))) return false
        await api('equipos/' + equipo.id + '/estado', 'PATCH', datos)
        guardado()
      }} />}
    </Dialogo>
    {confirmacion && <Dialogo titulo="¿Confirmas el cambio de estado?" cerrar={() => resolver(false)}>
      <p>{equipo.codigoPatrimonial} · {equipo.estado} → {confirmacion.estado}</p>
      {confirmacion.estado === 'Disponible' && <p>Confirma que el equipo está operativo antes de habilitarlo para préstamo.</p>}
      <div className="acciones actions">
        <Boton variante="secundario" autoFocus onClick={() => resolver(false)}>Cancelar</Boton>
        <Boton variante="positivo" onClick={() => resolver(true)}>Confirmar cambio</Boton>
      </div>
    </Dialogo>}
  </>
}
