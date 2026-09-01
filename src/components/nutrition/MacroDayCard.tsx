import { Flame } from 'lucide-react'
import { Card, CardLabel } from '@/components/ui/Card'
import { formatNumero } from '@/lib/format'
import type { DiaTipo } from '@/types'
import { MacroObjectiveStat } from './MacroObjectiveStat'

interface MacroDayCardProps {
  diaTipo: DiaTipo
  diasSemana: number | null
  kcal: number
  proteina: number | null
  hidratos: number | null
  grasas: number | null
  proteinaPorKg: number
  hidratosPorKg: number
  grasasPorKg: number
  /** Ver MacroObjectiveStat — hoy siempre undefined, no hay tracking de ingesta real. */
  consumoKcal?: number
}

export function MacroDayCard({
  diaTipo,
  diasSemana,
  kcal,
  proteina,
  hidratos,
  grasas,
  proteinaPorKg,
  hidratosPorKg,
  grasasPorKg,
  consumoKcal,
}: MacroDayCardProps) {
  return (
    <Card className="h-full">
      <CardLabel icon={<Flame size={13} />}>
        Objetivo · Día {diaTipo}
        {diasSemana != null ? ` · ×${diasSemana}/semana` : ''}
      </CardLabel>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold">{formatNumero(kcal, 0)}</span>
        <span className="text-sm text-text-secondary">kcal objetivo</span>
      </div>
      <div className="mb-4 text-xs text-text-muted">
        {consumoKcal != null ? `${formatNumero(consumoKcal, 0)} kcal registradas hoy` : 'Sin registro de consumo'}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <MacroObjectiveStat label="Proteína" tono="protein" objetivoG={proteina} objetivoPorKg={proteinaPorKg} />
        <MacroObjectiveStat label="Hidratos" tono="carbs" objetivoG={hidratos} objetivoPorKg={hidratosPorKg} />
        <MacroObjectiveStat label="Grasas" tono="fat" objetivoG={grasas} objetivoPorKg={grasasPorKg} />
      </div>
    </Card>
  )
}
