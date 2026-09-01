import { formatNumero } from '@/lib/format'

// Clases completas y literales (no construidas dinámicamente) para que
// Tailwind las detecte al escanear el código fuente.
const TONOS = {
  protein: { texto: 'text-macro-protein', barra: 'bg-macro-protein' },
  carbs: { texto: 'text-macro-carbs', barra: 'bg-macro-carbs' },
  fat: { texto: 'text-macro-fat', barra: 'bg-macro-fat' },
} as const

interface MacroObjectiveStatProps {
  label: string
  tono: keyof typeof TONOS
  objetivoG: number | null
  objetivoPorKg: number
  /** Consumo real de hoy — no existe todavía ninguna fuente de datos para esto,
   * así que en producción siempre llega undefined. El componente ya sabe
   * pintar una barra de progreso real en cuanto exista, sin rediseñarlo. */
  consumidoG?: number
}

export function MacroObjectiveStat({ label, tono, objetivoG, objetivoPorKg, consumidoG }: MacroObjectiveStatProps) {
  const { texto, barra } = TONOS[tono]
  const hayConsumoReal = consumidoG != null && objetivoG != null && objetivoG > 0
  const porcentaje = hayConsumoReal ? Math.min(100, Math.round((consumidoG! / objetivoG!) * 100)) : null

  return (
    <div>
      <div className="text-xs text-text-secondary">{label}</div>
      <div className={`text-xl font-bold ${texto}`}>{formatNumero(objetivoG, 0)} g</div>
      <div className="text-xs text-text-muted">{formatNumero(objetivoPorKg, 1)} g/kg</div>
      {hayConsumoReal && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-panel">
            <div className={`h-full rounded-full ${barra}`} style={{ width: `${porcentaje}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-text-muted">{formatNumero(consumidoG, 0)} g registrados</div>
        </div>
      )}
    </div>
  )
}
