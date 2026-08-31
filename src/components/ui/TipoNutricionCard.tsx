import { useState } from 'react'
import { Lock } from 'lucide-react'
import { updateProfile } from '@/lib/supabase/profileRepo'
import { Card, CardLabel } from './Card'
import { Button } from './Button'
import { TipoNutricionPicker } from './TipoNutricionPicker'
import type { TipoDieta } from '@/types'

const LABEL: Record<TipoDieta, string> = { macros: 'Macros', cerrada: 'Dieta cerrada' }

/**
 * Selector de tipo de nutrición reutilizado tanto en Ajustes (sobre la propia
 * cuenta) como en la Ficha de cliente (el entrenador sobre un cliente vinculado)
 * — evita duplicar el flujo de confirmación en los dos sitios.
 */
export function TipoNutricionCard({
  userId,
  tipoActual,
  distingueDiasActual,
  bloqueado,
  bloqueadoNombreEntrenador,
  nombreCliente,
  onGuardado,
}: {
  userId: string
  tipoActual: TipoDieta
  distingueDiasActual: boolean
  bloqueado: boolean
  bloqueadoNombreEntrenador?: string | null
  /** Si se indica, los textos de confirmación hablan de "este cliente" en vez de "tu cuenta". */
  nombreCliente?: string | null
  onGuardado: () => void | Promise<void>
}) {
  const [tipoSeleccion, setTipoSeleccion] = useState<TipoDieta | null>(null)
  const [distingueDias, setDistingueDias] = useState(distingueDiasActual)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (bloqueado) {
    return (
      <Card>
        <CardLabel>Tipo de nutrición</CardLabel>
        <div className="mb-2 text-sm font-medium">{LABEL[tipoActual]}</div>
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <Lock size={12} />
          {bloqueadoNombreEntrenador ? `Gestionado por ${bloqueadoNombreEntrenador}` : 'Gestionado por tu entrenador'}
        </p>
        <p className="mt-1 text-xs text-text-muted">Tu entrenador controla el tipo de nutrición.</p>
      </Card>
    )
  }

  const tipoPendiente = tipoSeleccion !== null && tipoSeleccion !== tipoActual ? tipoSeleccion : null
  const huboCambioDistingueDias = tipoSeleccion === null && distingueDias !== distingueDiasActual

  async function guardar(tipo: TipoDieta) {
    setGuardando(true)
    setError(null)
    try {
      await updateProfile(userId, { tipoDieta: tipo, dietaCerradaDistingueDias: distingueDias })
      setTipoSeleccion(null)
      await onGuardado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el tipo de nutrición')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card>
      <CardLabel>Tipo de nutrición</CardLabel>
      <TipoNutricionPicker value={tipoSeleccion ?? tipoActual} onChange={setTipoSeleccion} />

      {(tipoSeleccion ?? tipoActual) === 'cerrada' && (
        <label className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            className="accent-pegasus-red"
            checked={distingueDias}
            onChange={(e) => setDistingueDias(e.target.checked)}
          />
          Distinguir Día ON / Día OFF
        </label>
      )}

      {error && <p className="mt-2 text-sm text-pegasus-red">{error}</p>}

      {tipoPendiente && (
        <div className="mt-3 rounded-control border border-bg-border bg-bg-panel p-3 text-sm">
          <p className="font-medium">Cambiar tipo de nutrición</p>
          <p className="mt-1 text-text-secondary">
            Vas a cambiar {nombreCliente ? `a ${nombreCliente}` : 'tu cuenta'} de {LABEL[tipoActual]} a {LABEL[tipoPendiente]}. El
            plan actual dejará de ser el plan nutricional activo, pero sus datos se conservarán en el histórico.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTipoSeleccion(null)}>
              Cancelar
            </Button>
            <Button onClick={() => guardar(tipoPendiente)} disabled={guardando}>
              Cambiar
            </Button>
          </div>
        </div>
      )}

      {!tipoPendiente && huboCambioDistingueDias && (
        <div className="mt-3 flex justify-end">
          <Button onClick={() => guardar(tipoActual)} disabled={guardando}>
            Guardar
          </Button>
        </div>
      )}
    </Card>
  )
}
