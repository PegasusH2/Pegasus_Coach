import { useState } from 'react'
import { useClosedDietPlans, useMacroPlans } from '@/hooks/useData'
import { construirHistorico } from '@/lib/historico'
import { useSession } from '@/lib/SessionContext'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { HistoryTypeFilter } from '@/components/nutrition/HistoryTypeFilter'
import { NutritionHistoryTimeline } from '@/components/nutrition/NutritionHistoryTimeline'
import type { TipoDieta } from '@/types'

type Filtro = TipoDieta | 'todos'

export function HistoricoNutricional({ tipoDietaActual }: { tipoDietaActual: TipoDieta }) {
  const { profile } = useSession()
  const esEntrenador = profile?.role === 'entrenador'
  const { data: macroPlans } = useMacroPlans()
  const { data: closedDietPlans } = useClosedDietPlans()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const historico = construirHistorico(macroPlans ?? [], closedDietPlans ?? [], tipoDietaActual)
  const filtrado = historico
    .filter((e) => filtro === 'todos' || e.tipo === filtro)
    .filter((e) => (!desde || e.fecha >= desde) && (!hasta || e.fecha <= hasta))

  const hayFiltroFecha = desde !== '' || hasta !== ''

  return (
    <div>
      {/* Sin cliente/entrenador esto siempre se ve dentro de la Ficha de cliente
          (Nutrición → Histórico), que ya trae su propio encabezado y pestañas —
          el título "Histórico nutricional" solo se muestra en la pantalla suelta
          del cliente; el filtro por tipo se conserva en los dos casos. */}
      {esEntrenador ? (
        <div className="mb-3 flex justify-end">
          <HistoryTypeFilter value={filtro} onChange={setFiltro} />
        </div>
      ) : (
        <PageHeader
          title="Histórico nutricional"
          subtitle="Macros y Dieta cerrada, todo el pasado conservado"
          actions={<HistoryTypeFilter value={filtro} onChange={setFiltro} />}
        />
      )}
      <Card>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <Field label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Field label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          {hayFiltroFecha && (
            <button
              onClick={() => {
                setDesde('')
                setHasta('')
              }}
              className="text-xs font-semibold text-text-muted hover:text-text-secondary"
            >
              Quitar filtro
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          <NutritionHistoryTimeline entradas={filtrado} />
        </div>
      </Card>
    </div>
  )
}
