import { useAsyncData } from '@/hooks/useData'
import { useSession } from '@/lib/SessionContext'
import { listReviewsByTrainer } from '@/lib/supabase/reviewRepo'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatFechaCorta, formatFechaRelativa } from '@/lib/format'

export function Revisiones() {
  const { session } = useSession()
  const trainerId = session?.user.id ?? ''
  const { data: revisiones } = useAsyncData(() => listReviewsByTrainer(trainerId), [trainerId])

  return (
    <div className="max-w-3xl">
      <PageHeader title="Revisiones" subtitle="Todas las revisiones de tus clientes" />
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border text-left text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-3 py-3 font-medium">Fecha programada</th>
              <th className="px-3 py-3 font-medium">Estado</th>
              <th className="px-3 py-3 font-medium">Recepción</th>
            </tr>
          </thead>
          <tbody>
            {(revisiones ?? []).map((r) => (
              <tr key={r.id} className="border-b border-bg-border last:border-0">
                <td className="px-5 py-3 font-medium">{r.clienteNombre || 'Cliente'}</td>
                <td className="px-3 py-3 text-text-secondary">
                  {formatFechaCorta(r.fechaProgramada)} <span className="text-text-muted">({formatFechaRelativa(r.fechaProgramada)})</span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.estado === 'pendiente'
                        ? 'bg-pegasus-redSoft text-pegasus-red'
                        : r.estado === 'recibida'
                          ? 'bg-amber-400/15 text-amber-400'
                          : 'bg-emerald-400/15 text-emerald-400'
                    }`}
                  >
                    {r.estado === 'pendiente' ? 'Pendiente' : r.estado === 'recibida' ? 'Recibida' : 'Revisada'}
                  </span>
                </td>
                <td className="px-3 py-3 text-text-secondary">{r.fechaRecepcion ? formatFechaCorta(r.fechaRecepcion) : '—'}</td>
              </tr>
            ))}
            {(revisiones ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-text-muted">
                  Todavía no hay revisiones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
