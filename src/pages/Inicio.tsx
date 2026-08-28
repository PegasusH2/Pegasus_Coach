import { Activity, Flame, TrendingDown, TrendingUp } from 'lucide-react'
import { useActiveMacroPlan, useWeightEntries } from '@/hooks/useData'
import { calcularMacroPlan, cambioEnPeriodo } from '@/lib/calculos'
import { useDiaTipo } from '@/lib/DiaTipoContext'
import { useSession } from '@/lib/SessionContext'
import { Card, CardLabel } from '@/components/ui/Card'
import { DiaToggle } from '@/components/ui/DiaToggle'
import { WeightChart } from '@/components/WeightChart'
import { formatKcal, formatNumero } from '@/lib/format'
import type { Route } from '@/lib/nav'

export function Inicio({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { profile, clienteActivo } = useSession()
  const { data: plan } = useActiveMacroPlan()
  const { data: weightEntries } = useWeightEntries()
  const { diaTipo, setDiaTipo } = useDiaTipo()
  const nombreMostrado = clienteActivo?.nombre || profile?.nombre

  const calculado = plan ? calcularMacroPlan(plan) : null
  const pesos = weightEntries ?? []
  const pesoActual = pesos.length > 0 ? [...pesos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].pesoKg : null
  const cambioSemanal = cambioEnPeriodo(pesos, 7)

  const kcal = calculado ? (diaTipo === 'ON' ? calculado.calTotalOn : calculado.calTotalOff) : null
  const proteina = calculado ? (diaTipo === 'ON' ? calculado.proteinaOn : calculado.proteinaOff) : null
  const hidratos = calculado ? (diaTipo === 'ON' ? calculado.hidratosOn : calculado.hidratosOff) : null
  const grasas = calculado ? (diaTipo === 'ON' ? calculado.grasasOn : calculado.grasasOff) : null

  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hola, {nombreMostrado || 'atleta'}</h1>
          <p className="mt-1 text-sm capitalize text-text-secondary">{hoy}</p>
        </div>
        <DiaToggle value={diaTipo} onChange={setDiaTipo} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardLabel>Peso actual</CardLabel>
          <div className="text-3xl font-bold">
            {pesoActual !== null ? formatNumero(pesoActual, 1) : '—'} <span className="text-base text-text-secondary">kg</span>
          </div>
          {cambioSemanal !== null && (
            <div className={`mt-1 flex items-center gap-1 text-xs ${cambioSemanal <= 0 ? 'text-emerald-400' : 'text-pegasus-red'}`}>
              {cambioSemanal <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              {formatNumero(Math.abs(cambioSemanal), 1)} kg / 7 días
            </div>
          )}
        </Card>

        <Card>
          <CardLabel icon={<Flame size={13} />}>Calorías ({diaTipo})</CardLabel>
          <div className="text-3xl font-bold">
            {formatNumero(kcal, 0)} <span className="text-base text-text-secondary">kcal</span>
          </div>
        </Card>

        <Card>
          <CardLabel>Déficit / superávit</CardLabel>
          <div className={`text-3xl font-bold ${calculado && calculado.superavitDeficit > 0 ? 'text-pegasus-red' : 'text-emerald-400'}`}>
            {calculado ? formatKcal(calculado.superavitDeficit) : '—'} <span className="text-base text-text-secondary">kcal</span>
          </div>
          <div className="mt-1 text-xs text-text-muted">sobre normocalórico</div>
        </Card>

        <Card>
          <CardLabel icon={<Activity size={13} />}>NEAT objetivo</CardLabel>
          <div className="text-3xl font-bold">
            {formatNumero(plan?.neatObjetivoPasos ?? null, 0)} <span className="text-base text-text-secondary">pasos</span>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card>
          <CardLabel>Proteína</CardLabel>
          <div className="text-2xl font-bold text-macro-protein">{formatNumero(proteina, 0)} g</div>
        </Card>
        <Card>
          <CardLabel>Hidratos</CardLabel>
          <div className="text-2xl font-bold text-macro-carbs">{formatNumero(hidratos, 0)} g</div>
        </Card>
        <Card>
          <CardLabel>Grasas</CardLabel>
          <div className="text-2xl font-bold text-macro-fat">{formatNumero(grasas, 0)} g</div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <CardLabel>Evolución de peso</CardLabel>
          <button
            onClick={() => onNavigate({ section: 'progreso', progresoTab: 'peso' })}
            className="text-xs font-medium text-pegasus-red hover:underline"
          >
            Ver todo
          </button>
        </div>
        <WeightChart entries={pesos.slice(-60)} height={200} />
      </Card>
    </div>
  )
}
