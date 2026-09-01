import { Card } from '@/components/ui/Card'
import { formatNumero } from '@/lib/format'
import type { DiaTipo } from '@/types'

interface MacroSecondarySummaryProps {
  diaTipo: DiaTipo
  kcal: number
  proteina: number | null
  hidratos: number | null
  grasas: number | null
}

/** Tarjeta compacta del día NO seleccionado — no debe competir visualmente con MacroDayCard. */
export function MacroSecondarySummary({ diaTipo, kcal, proteina, hidratos, grasas }: MacroSecondarySummaryProps) {
  return (
    <Card className="bg-bg-panel">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Día {diaTipo}</span>
        <span className="text-sm font-semibold text-text-primary">{formatNumero(kcal, 0)} kcal</span>
      </div>
      <div className="mt-2 flex gap-3 text-xs text-text-muted">
        <span>P {formatNumero(proteina, 0)}g</span>
        <span>C {formatNumero(hidratos, 0)}g</span>
        <span>G {formatNumero(grasas, 0)}g</span>
      </div>
    </Card>
  )
}
