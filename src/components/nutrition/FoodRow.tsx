import { formatNumero } from '@/lib/format'
import type { ClosedDietItem } from '@/types'

export function FoodRow({ item }: { item: ClosedDietItem }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 truncate text-text-primary">{item.alimento}</span>
      <span className="shrink-0 text-text-secondary">{formatNumero(item.gramos, 0)} g</span>
    </div>
  )
}
