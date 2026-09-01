import { Salad, UtensilsCrossed } from 'lucide-react'
import { formatFechaCorta } from '@/lib/format'
import type { HistoricoEntry } from '@/lib/historico'

/** `estado` no existe todavía en ningún dato real (ver construirHistorico) — el
 * componente ya sabe pintar un badge Cumplido/No cumplido en cuanto exista esa
 * fuente, pero hoy nunca llega y por tanto nunca se muestra nada inventado. */
export function NutritionHistoryTimeline({ entradas }: { entradas: (HistoricoEntry & { estado?: 'cumplido' | 'no_cumplido' })[] }) {
  if (entradas.length === 0) {
    return <p className="text-sm text-text-muted">Todavía no hay ningún registro nutricional.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-bg-border">
      {entradas.map((entrada, i) => (
        <div key={i} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-panel text-text-secondary">
              {entrada.tipo === 'cerrada' ? <UtensilsCrossed size={13} /> : <Salad size={13} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{formatFechaCorta(entrada.fecha)}</span>
                {entrada.actual && (
                  <span className="rounded-full bg-pegasus-redSoft px-2 py-0.5 text-xs font-semibold text-pegasus-red">
                    Actual
                  </span>
                )}
                {entrada.estado && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      entrada.estado === 'cumplido' ? 'bg-success-soft text-success' : 'bg-pegasus-redSoft text-pegasus-red'
                    }`}
                  >
                    {entrada.estado === 'cumplido' ? 'Cumplido' : 'No cumplido'}
                  </span>
                )}
              </div>
              <div className="text-xs text-text-muted">{entrada.tipo === 'cerrada' ? 'Dieta cerrada' : 'Macros'}</div>
            </div>
          </div>
          <div className="pl-9 text-left sm:pl-0 sm:text-right">
            <div className="text-sm font-medium">{entrada.resumenPrincipal}</div>
            {entrada.resumenSecundario && <div className="text-xs text-text-muted">{entrada.resumenSecundario}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
