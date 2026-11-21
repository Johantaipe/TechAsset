import { createContext, useContext } from 'react'

export const nombresRoles = {
  Administrador: 'Administrador',
  Tecnologia: 'Responsable de Tecnología',
  Colaborador: 'Colaborador',
} as const

export type Rol = keyof typeof nombresRoles
export interface Sesion { usuarioId: string; rol: Rol }

export const SesionContexto = createContext<Sesion | null>(null)

export function useSesion(): Sesion {
  const sesion = useContext(SesionContexto)
  if (!sesion) throw new Error('No hay una sesión activa.')
  return sesion
}
