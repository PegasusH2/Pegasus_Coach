import { MessageSquare } from 'lucide-react'
import { Card, CardLabel } from '@/components/ui/Card'

interface CoachNoteCardProps {
  notas: string
  readOnly: boolean
  onChange?: (value: string) => void
}

/** Usa el campo real ClosedDietPlan.notas — antes existía en el modelo pero
 * ninguna pantalla lo leía ni lo escribía. */
export function CoachNoteCard({ notas, readOnly, onChange }: CoachNoteCardProps) {
  if (readOnly) {
    if (!notas.trim()) return null
    return (
      <Card className="border-pegasus-red/20 bg-pegasus-redSoft">
        <CardLabel icon={<MessageSquare size={13} />}>Nota de tu entrenador</CardLabel>
        <p className="whitespace-pre-wrap text-sm text-text-primary">{notas}</p>
      </Card>
    )
  }

  return (
    <Card>
      <CardLabel icon={<MessageSquare size={13} />}>Nota para el cliente</CardLabel>
      <textarea
        className="w-full resize-none rounded-control border border-bg-border bg-bg-panel p-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-pegasus-red"
        rows={3}
        value={notas}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Escribe una nota para tu cliente…"
      />
    </Card>
  )
}
