export const estados = ['Disponible', 'Prestado', 'Mantenimiento', 'Baja'] as const
export type EstadoEquipo = typeof estados[number]
export interface Usuario {
  id: string
  nombres: string
  apellidos: string
  correo: string
  area: string | null
  estado: boolean
}
export interface Equipo {
  id: string
  codigoPatrimonial: string
  nombre: string
  categoria: string
  marca: string
  estado: EstadoEquipo
}
export interface Prestamo {
  id: string
  usuarioId: string
  equipoId: string
  responsableId: string
  fechaPrestamo: string
  fechaDevolucion: string | null
  observacion: string | null
  solicitudDevolucionUtc?: string | null
}

export interface SolicitudPrestamo {
  id: string
  usuarioId: string
  equipoId: string
  fechaPrestamo: string
  prestamoId: string | null
}
export interface Indicadores {
  totalEquipos: number
  disponibles: number
  prestados: number
  mantenimiento: number
  totalPrestamos: number
  areasConMayorUso: string[]
}
export interface UsoArea { area: string; total: number }
export interface UsoEquipo { equipoId: string; equipo: string; total: number }
export interface Movimiento {
  prestamoId: string | null
  equipoId: string
  fecha: string
  tipo: string
  idCambio?: string | null
  estadoAnterior?: EstadoEquipo | null
  estadoNuevo?: EstadoEquipo | null
  motivo?: string | null
}
