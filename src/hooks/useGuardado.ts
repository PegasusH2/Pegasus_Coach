import { useState } from 'react'

/** Estado compartido "guardando… / ✓ Guardado" para las tarjetas de Ajustes — cada
 * apartado guarda por su cuenta (ver AjustesEntrenador.tsx), sin un botón de guardar
 * de página entera ni alertas invasivas. */
export function useGuardado() {
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  async function ejecutar(fn: () => Promise<void>) {
    setGuardando(true)
    setGuardado(false)
    try {
      await fn()
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2500)
    } finally {
      setGuardando(false)
    }
  }

  return { guardando, guardado, ejecutar }
}
