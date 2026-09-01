import { groupClosedDietItemsByMomento } from '@/lib/closedDietTimeline'
import type { ClosedDietItem } from '@/types'
import { MealGroup } from './MealGroup'

export function ClosedDietTimeline({ items }: { items: ClosedDietItem[] }) {
  const grupos = groupClosedDietItemsByMomento(items)

  if (grupos.length === 0) {
    return <p className="text-sm text-text-muted">Todavía no hay alimentos en este plan.</p>
  }

  return (
    <div className="flex flex-col">
      {grupos.map((grupo, i) => (
        <MealGroup
          key={grupo.momento ?? `sin-horario-${i}`}
          numero={i + 1}
          momento={grupo.momento}
          items={grupo.items}
          esUltimo={i === grupos.length - 1}
        />
      ))}
    </div>
  )
}
