import { BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export function GuiaAlimentosPlaceholder() {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-panel text-text-secondary">
        <BookOpen size={20} />
      </div>
      <div>
        <p className="text-base font-semibold text-text-primary">Guía de alimentos</p>
        <p className="mt-1 max-w-xs text-sm text-text-muted">Esta funcionalidad estará disponible próximamente.</p>
      </div>
    </Card>
  )
}
