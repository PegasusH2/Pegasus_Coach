import { useState } from 'react'
import { useWeightEntries } from '@/hooks/useData'
import { cambioEnPeriodo, cambioPeso } from '@/lib/calculos'
import { Card, CardLabel } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { WeightChart } from '@/components/WeightChart'
import { formatFechaCorta, formatNumero, hoyIso } from '@/lib/format'
import { Trash2 } from 'lucide-react'

export function Peso() {
  const { data: entries, refetch } = useWeightEntries()
  const [fecha, setFecha] = useState(hoyIso())
  const [peso, setPeso] = useState('')
  const [guardando, setGuardando] = useState(false)

  const pesos = entries ?? []
  const resumen = cambioPeso(pesos)
  const cambioSemanal = cambioEnPeriodo(pesos, 7)
  const cambioMensual = cambioEnPeriodo(pesos, 30)

  async function registrar() {
    const valor = Number(peso)
    if (!Number.isFinite(valor) || valor <= 0) return
    setGuardando(true)
    try {
      await window.pegasus.weightEntries.create({ fecha, pesoKg: valor, notas: null })
      setPeso('')
      await refetch()
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: number) {
    await window.pegasus.weightEntries.delete(id)
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
              {[...pesos].reverse().map((e) => (
                <tr key={e.id} className="border-b border-bg-border last:border-0">
                  <td className="py-2 text-text-secondary">{formatFechaCorta(e.fecha)}</td>
                  <td className="py-2 font-medium">{formatNumero(e.pesoKg, 1)} kg</td>
                  <td className="py-2 text-right">
                    <button onClick={() => eliminar(e.id)} className="text-text-muted hover:text-pegasus-red">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
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
