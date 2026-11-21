import type { Usuario } from '../types/inventario'
import type { Rol } from './sesion'

export const dominioCorporativo = '@innovatech.com.pe'
export const patronAlias = '[A-Za-z0-9]+(?:(?:[._+]|-)[A-Za-z0-9]+)*'

export type UsuarioDirectorio = Usuario & { rol?: Rol | null; numeroDirectorio: number; puedeEstablecerContrasena?: boolean }

