import { useState } from 'react'
import { useClosedDietPlans, useMacroPlans } from '@/hooks/useData'
import { construirHistorico } from '@/lib/historico'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { HistoryTypeFilter } from '@/components/nutrition/HistoryTypeFilter'
import { NutritionHistoryTimeline } from '@/components/nutrition/NutritionHistoryTimeline'
import type { TipoDieta } from '@/types'

type Filtro = TipoDieta | 'todos'

export function HistoricoNutricional({ tipoDietaActual }: { tipoDietaActual: TipoDieta }) {
  const { data: macroPlans } = useMacroPlans()
  const { data: closedDietPlans } = useClosedDietPlans()
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const historico = construirHistorico(macroPlans ?? [], closedDietPlans ?? [], tipoDietaActual)
  const filtrado = filtro === 'todos' ? historico : historico.filter((e) => e.tipo === filtro)

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Histórico nutricional"
        subtitle="Macros y Dieta cerrada, todo el pasado conservado"
        actions={<HistoryTypeFilter value={filtro} onChange={setFiltro} />}
      />
      <Card>
        <NutritionHistoryTimeline entradas={filtrado} />
      </Card>
    </div>
  )
}
