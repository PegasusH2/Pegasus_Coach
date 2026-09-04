import { useState } from 'react'
import { useTargetProfile } from '@/hooks/useData'
import { MacrosFlexibles } from './nutrition/MacrosFlexibles'
import { DietaCerrada } from './nutrition/DietaCerrada'
import { HistoricoNutricional } from './nutrition/HistoricoNutricional'
import type { TipoDieta } from '@/types'

type NutricionTab = 'contenido' | 'historico'

export function Macros() {
  const { data: targetProfile, loading } = useTargetProfile()
  const [tab, setTab] = useState<NutricionTab>('contenido')
  if (loading && !targetProfile) return null

  const tipoDieta: TipoDieta = targetProfile?.tipoDieta ?? 'macros'
  const labelContenido = tipoDieta === 'cerrada' ? 'Dieta' : 'Macros'

  const TABS: { key: NutricionTab; label: string }[] = [
    { key: 'contenido', label: labelContenido },
    { key: 'historico', label: 'Histórico' },
  ]

  return (
    <>
      <div className="mb-5 flex w-full gap-1 rounded-control bg-bg-panel p-1 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-[8px] px-4 py-1.5 text-sm font-semibold transition-colors sm:flex-none ${
              tab === t.key ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="tab-fade">
        {tab === 'historico' ? (
          <HistoricoNutricional tipoDietaActual={tipoDieta} />
        ) : tipoDieta === 'cerrada' ? (
          <DietaCerrada distingueDias={targetProfile?.dietaCerradaDistingueDias ?? false} />
        ) : (
          <MacrosFlexibles />
        )}
      </div>
    </>
  )
}
