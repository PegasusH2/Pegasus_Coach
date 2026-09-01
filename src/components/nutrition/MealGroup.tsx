import { Card } from '@/components/ui/Card'
import type { ClosedDietItem } from '@/types'
import { FoodRow } from './FoodRow'

interface MealGroupProps {
  numero: number
  momento: string | null
  items: ClosedDietItem[]
  esUltimo: boolean
}

export function MealGroup({ numero, momento, items, esUltimo }: MealGroupProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pegasus-redSoft text-xs font-bold text-pegasus-red">
          {numero}
        </div>
        {!esUltimo && <div className="w-px flex-1 bg-bg-border" />}
      </div>
      <div className="min-w-0 flex-1 pb-5">
        <div className="mb-2 text-sm font-semibold text-text-primary">{momento ?? 'Sin horario especificado'}</div>
        <Card className="flex flex-col gap-2">
          {items.map((item) => (
            <FoodRow key={item.id} item={item} />
          ))}
        </Card>
      </div>
    </div>
  )
}
