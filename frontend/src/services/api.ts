import { useCallback, useEffect, useState } from 'react'

export const modoDemo = import.meta.env.MODE === 'demo'

export class ErrorApi extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

interface Problema {
  detail?: string
  errors?: Record<string, string[]>
}

export async function api<T = void>(ruta: string, method = 'GET', body?: object, signal?: AbortSignal): Promise<T> {
  const response = modoDemo
    ? (await import('./demo')).responderDemo(ruta, method, body)
    : await fetch('/api/' + ruta, {
        method, signal,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(method !== 'GET' ? { 'X-TechAsset-Request': '1' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
  if (!response.ok) {
    if (response.status === 401 && ruta !== 'sesion') window.dispatchEvent(new Event('techasset:sesion-caducada'))
    const error: Problema | null = await response.json().catch(() => null)
    throw new ErrorApi((error?.detail ?? Object.values(error?.errors ?? {}).flat().join(' ')) ||
      (response.status === 401 ? 'La sesión no es válida o las credenciales son incorrectas.'
        : response.status === 403 ? 'Tu rol no tiene permiso para esta operación.'
        : 'La API no pudo completar la operación (HTTP ' + response.status + ').'), response.status)
  }
  return response.status === 204 ? undefined as T : response.json()
}

export function mensaje(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.'
}

export function useConsulta<T>(ruta: string | null) {
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState<{ ruta?: string; datos?: T; error?: string; cargando: boolean }>({ cargando: true })
  const recargar = useCallback(() => setVersion(actual => actual + 1), [])
  useEffect(() => {
    if (ruta === null) return
    const control = new AbortController()
    setResultado(anterior => ({ ruta, datos: anterior.ruta === ruta ? anterior.datos : undefined, cargando: true }))
    api<T>(ruta, 'GET', undefined, control.signal).then(
      datos => { if (!control.signal.aborted) setResultado({ ruta, datos, cargando: false }) },
      error => { if (!control.signal.aborted) setResultado({ ruta, error: mensaje(error), cargando: false }) },
    )
    return () => control.abort()
  }, [ruta, version])
  if (ruta === null) return { cargando: false, datos: undefined, error: undefined, recargar }
  return { ...(resultado.ruta === ruta ? resultado : { cargando: true, datos: undefined, error: undefined }), recargar }
}
