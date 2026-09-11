// Calculadora rápida de macros — herramienta de escritorio para el entrenador, sin
// guardar nada ni crear un plan real. Reutiliza tal cual calcularMacroPlan (misma
// fórmula, replicada del Excel "Control macros y general") para no duplicar lógica
// de cálculo: se construye un MacroPlan de mentira con los valores del formulario y
// se lee su MacroPlanCalculado, igual que hace cualquier plan real guardado.
import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { calcularMacroPlan } from '@/lib/calculos'
import { formatKcal, formatNumero } from '@/lib/format'
import { useSession } from '@/lib/SessionContext'
import { updateTrainerSettings } from '@/lib/supabase/trainerSettingsRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { RecomendacionesMacrosSexoToggle } from '@/components/nutrition/RecomendacionesMacrosSexo'
import type { MacroPlan } from '@/types'

function useNumero(inicial = '') {
  const [texto, setTexto] = useState(inicial)
  return { texto, setTexto, valor: texto === '' ? null : Number(texto) }
}

function CampoMacro({ label, campo }: { label: string; campo: ReturnType<typeof useNumero> }) {
  return (
    <Field label={label} type="number" suffix="g" value={campo.texto} onChange={(e) => campo.setTexto(e.target.value)} />
  )
}

export function CalculadoraMacros() {
  const { session, trainerSettings, refreshTrainerSettings } = useSession()
  const [guardandoPreferencia, setGuardandoPreferencia] = useState(false)

  async function toggleRecomendacionesSexo(valor: boolean) {
    if (!session) return
    setGuardandoPreferencia(true)
    try {
      await updateTrainerSettings(session.user.id, { mostrarRecomendacionesMacrosPorSexo: valor })
      await refreshTrainerSettings()
    } finally {
      setGuardandoPreferencia(false)
    }
  }

  const pesoRef = useNumero()
  const normo = useNumero()
  const proteinaOn = useNumero()
  const hidratosOn = useNumero()
  const grasasOn = useNumero()
  const proteinaOff = useNumero()
  const hidratosOff = useNumero()
  const grasasOff = useNumero()

  const planDeMentira: MacroPlan = {
    id: 'calculadora',
    userId: 'calculadora',
    fecha: '',
    semanaId: null,
    neatObjetivoPasos: null,
    aguaLitros: null,
    salGramos: null,
    entrenamientoDiasSemana: null,
    entrenamientoDuracionMin: null,
    pesoCorporalRef: pesoRef.valor,
    porcentajeGraso: null,
    normocalorico: normo.valor,
    diasOn: null,
    proteinaOn: proteinaOn.valor,
    hidratosOn: hidratosOn.valor,
    grasasOn: grasasOn.valor,
    diasOff: null,
    proteinaOff: proteinaOff.valor,
    hidratosOff: hidratosOff.valor,
    grasasOff: grasasOff.valor,
    notas: null,
  }
  const resultado = calcularMacroPlan(planDeMentira)

  return (
    <div className="max-w-4xl">
      <PageHeader title="Calculadora de macros" subtitle="Cálculo rápido, sin guardar — no crea ningún plan real" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardLabel>Referencia</CardLabel>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso corporal" type="number" suffix="kg" value={pesoRef.texto} onChange={(e) => pesoRef.setTexto(e.target.value)} />
            <Field label="Normocalórico" type="number" suffix="kcal" value={normo.texto} onChange={(e) => normo.setTexto(e.target.value)} />
          </div>
          <RecomendacionesMacrosSexoToggle
            checked={trainerSettings?.mostrarRecomendacionesMacrosPorSexo ?? false}
            disabled={guardandoPreferencia}
            onChange={toggleRecomendacionesSexo}
          />
        </Card>

        <Card>
          <CardLabel icon={<Calculator size={13} />}>Resultado</CardLabel>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-text-muted">Calorías ON</div>
              <div className="text-lg font-bold">{formatNumero(resultado.calTotalOn, 0)} kcal</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Calorías OFF</div>
              <div className="text-lg font-bold">{formatNumero(resultado.calTotalOff, 0)} kcal</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Promedio diario</div>
              <div className="text-lg font-bold">{formatNumero(resultado.promedioCalorias, 0)} kcal</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Superávit / déficit</div>
              <div className={`text-lg font-bold ${resultado.superavitDeficit > 0 ? 'text-pegasus-red' : 'text-emerald-400'}`}>
                {formatKcal(resultado.superavitDeficit)} kcal
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-text-muted">kcal / kg (promedio)</div>
              <div className="text-lg font-bold">{formatNumero(resultado.calPorKg, 1)}</div>
            </div>
          </div>
        </Card>

        <Card>
          <CardLabel>Día ON</CardLabel>
          <div className="grid grid-cols-3 gap-3">
            <CampoMacro label="Proteína" campo={proteinaOn} />
            <CampoMacro label="Hidratos" campo={hidratosOn} />
            <CampoMacro label="Grasas" campo={grasasOn} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-text-muted">
            <div>{formatNumero(resultado.proteinaOnPorKg, 2)} g/kg</div>
            <div>{formatNumero(resultado.hidratosOnPorKg, 2)} g/kg</div>
            <div>{formatNumero(resultado.grasasOnPorKg, 2)} g/kg</div>
          </div>
        </Card>

        <Card>
          <CardLabel>Día OFF</CardLabel>
          <div className="grid grid-cols-3 gap-3">
            <CampoMacro label="Proteína" campo={proteinaOff} />
            <CampoMacro label="Hidratos" campo={hidratosOff} />
            <CampoMacro label="Grasas" campo={grasasOff} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-text-muted">
            <div>{formatNumero(resultado.proteinaOffPorKg, 2)} g/kg</div>
            <div>{formatNumero(resultado.hidratosOffPorKg, 2)} g/kg</div>
            <div>{formatNumero(resultado.grasasOffPorKg, 2)} g/kg</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
