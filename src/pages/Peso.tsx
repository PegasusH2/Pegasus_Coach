import { useState } from 'react'
import { useWeightEntries } from '@/hooks/useData'
import { cambioEnPeriodo, cambioPeso } from '@/lib/calculos'
import { createWeightEntry, deleteWeightEntry, updateWeightEntry } from '@/lib/supabase/bodyWeightRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { WeightChart } from '@/components/WeightChart'
import { formatFechaCorta, formatNumero, hoyIso } from '@/lib/format'
import { Pencil, Trash2 } from 'lucide-react'
import type { WeightEntry } from '@/types'

export function Peso() {
  const { data: entries, refetch } = useWeightEntries()
  const [fecha, setFecha] = useState(hoyIso())
  const [peso, setPeso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState<WeightEntry | null>(null)

  const pesos = entries ?? []
  const resumen = cambioPeso(pesos)
  const cambioSemanal = cambioEnPeriodo(pesos, 7)
  const cambioMensual = cambioEnPeriodo(pesos, 30)

  async function registrar() {
    const valor = Number(peso)
    if (!Number.isFinite(valor) || valor <= 0) return
    setGuardando(true)
    try {
      await createWeightEntry({ fecha, pesoKg: valor, notas: null })
      setPeso('')
      await refetch()
    } finally {
      setGuardando(false)
    }
  }

  async function guardarEdicion() {
    if (!editando) return
    const valor = Number(editando.pesoKg)
    if (!Number.isFinite(valor) || valor <= 0) return
    setGuardando(true)
    try {
      await updateWeightEntry(editando.id, { fecha: editando.fecha, pesoKg: valor, notas: editando.notas })
      setEditando(null)
      await refetch()
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: string) {
    await deleteWeightEntry(id)
    if (editando?.id === id) setEditando(null)
    await refetch()
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Peso" subtitle="Registro y evolución del peso corporal" />

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardLabel>Actual</CardLabel>
          <div className="text-2xl font-bold">{formatNumero(resumen.actual, 1)} kg</div>
        </Card>
        <Card>
          <CardLabel>Inicial</CardLabel>
          <div className="text-2xl font-bold">{formatNumero(resumen.inicial, 1)} kg</div>
        </Card>
        <Card>
          <CardLabel>Cambio total</CardLabel>
          <div className="text-2xl font-bold">{formatNumero(resumen.cambioTotal, 1)} kg</div>
        </Card>
        <Card>
          <CardLabel>Últimos 7 / 30 días</CardLabel>
          <div className="text-2xl font-bold">
            {formatNumero(cambioSemanal, 1)} / {formatNumero(cambioMensual, 1)} kg
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardLabel>Evolución</CardLabel>
        <WeightChart entries={pesos} height={260} />
      </Card>

      <Card className="mt-4">
        <CardLabel>Registrar peso</CardLabel>
        <div className="flex items-end gap-3">
          <Field label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Field label="Peso" type="number" suffix="kg" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="80.5" />
          <Button onClick={registrar} disabled={guardando}>
            Añadir
          </Button>
        </div>
      </Card>

      <Card className="mt-4">
        <CardLabel>Histórico</CardLabel>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody>
              {[...pesos].reverse().map((e) =>
                editando?.id === e.id ? (
                  <tr key={e.id} className="border-b border-bg-border bg-bg-panel/60 last:border-0">
                    <td className="py-2 pr-2">
                      <input
                        type="date"
                        value={editando.fecha}
                        onChange={(ev) => setEditando({ ...editando, fecha: ev.target.value })}
                        className="w-full rounded-control border border-bg-border bg-bg-panel px-2 py-1 text-sm text-text-primary outline-none focus:border-pegasus-red"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={editando.pesoKg}
                        onChange={(ev) => setEditando({ ...editando, pesoKg: Number(ev.target.value) })}
                        className="w-20 rounded-control border border-bg-border bg-bg-panel px-2 py-1 text-sm text-text-primary outline-none focus:border-pegasus-red"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={guardarEdicion} disabled={guardando} className="text-xs font-semibold text-pegasus-red hover:text-pegasus-redDark">
                          Guardar
                        </button>
                        <button onClick={() => setEditando(null)} className="text-xs text-text-muted hover:text-text-secondary">
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id} className="border-b border-bg-border last:border-0">
                    <td className="py-2 text-text-secondary">{formatFechaCorta(e.fecha)}</td>
                    <td className="py-2 font-medium">{formatNumero(e.pesoKg, 1)} kg</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setEditando(e)} className="text-text-muted hover:text-pegasus-red">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => eliminar(e.id)} className="text-text-muted hover:text-pegasus-red">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
              {pesos.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-text-muted">
                    Todavía no hay registros de peso.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
