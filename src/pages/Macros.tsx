import { useEffect, useState } from 'react'
import { PieChart as PieChartIcon } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useActiveMacroPlan } from '@/hooks/useData'
import { calcularMacroPlan } from '@/lib/calculos'
import { useDiaTipo } from '@/lib/DiaTipoContext'
import { useSession } from '@/lib/SessionContext'
import { createMacroPlan, updateMacroPlan } from '@/lib/supabase/macroPlanRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { DiaToggle } from '@/components/ui/DiaToggle'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatNumero, hoyIso } from '@/lib/format'
import type { MacroPlanInput } from '@/types'

function emptyForm(userId: string): MacroPlanInput {
  return {
    userId,
    fecha: hoyIso(),
    semanaId: null,
    neatObjetivoPasos: null,
    aguaLitros: null,
    salGramos: null,
    entrenamientoDiasSemana: null,
    entrenamientoDuracionMin: null,
    pesoCorporalRef: null,
    porcentajeGraso: null,
    normocalorico: null,
    diasOn: null,
    proteinaOn: null,
    hidratosOn: null,
    grasasOn: null,
    diasOff: null,
    proteinaOff: null,
    hidratosOff: null,
    grasasOff: null,
    notas: null,
  }
}

function num(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function Macros() {
  const { targetUserId, soloLectura } = useSession()
  const { data: plan, refetch } = useActiveMacroPlan()
  const { diaTipo, setDiaTipo } = useDiaTipo()
  const [form, setForm] = useState<MacroPlanInput>(emptyForm(targetUserId ?? ''))
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (plan) {
      const { id, ...rest } = plan
      setForm(rest)
    } else if (targetUserId) {
      setForm(emptyForm(targetUserId))
    }
  }, [plan, targetUserId])

  const calculado = calcularMacroPlan({ id: plan?.id ?? '', ...form })

  const kcal = diaTipo === 'ON' ? calculado.calTotalOn : calculado.calTotalOff
  const proteina = diaTipo === 'ON' ? calculado.proteinaOn : calculado.proteinaOff
  const hidratos = diaTipo === 'ON' ? calculado.hidratosOn : calculado.hidratosOff
  const grasas = diaTipo === 'ON' ? calculado.grasasOn : calculado.grasasOff
  const proteinaKg = diaTipo === 'ON' ? calculado.proteinaOnPorKg : calculado.proteinaOffPorKg
  const hidratosKg = diaTipo === 'ON' ? calculado.hidratosOnPorKg : calculado.hidratosOffPorKg
  const grasasKg = diaTipo === 'ON' ? calculado.grasasOnPorKg : calculado.grasasOffPorKg

  const donutData = [
    { name: 'Proteína', value: proteina ?? 0, color: '#e8383d' },
    { name: 'Hidratos', value: hidratos ?? 0, color: '#f0a53a' },
    { name: 'Grasas', value: grasas ?? 0, color: '#e8b93a' },
  ]

  async function guardarCambios() {
    if (!plan) return
    setGuardando(true)
    try {
      await updateMacroPlan(plan.id, form)
      await refetch()
    } finally {
      setGuardando(false)
    }
  }

  async function registrarNuevaRevision() {
    if (!targetUserId) return
    setGuardando(true)
    try {
      await createMacroPlan({ ...form, userId: targetUserId, fecha: hoyIso() })
      await refetch()
    } finally {
      setGuardando(false)
    }
  }

  function set<K extends keyof MacroPlanInput>(key: K, value: MacroPlanInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Macros"
        subtitle={plan ? `Plan activo desde ${plan.fecha}` : 'Todavía no hay ningún plan de macros'}
        actions={<DiaToggle value={diaTipo} onChange={setDiaTipo} />}
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardLabel icon={<PieChartIcon size={13} />}>Macros — Día {diaTipo}</CardLabel>
          <div className="mb-4 text-3xl font-bold">
            {formatNumero(kcal, 0)} <span className="text-base text-text-secondary">kcal</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <MacroStat label="Proteína" valor={proteina} porKg={proteinaKg} color="text-macro-protein" />
            <MacroStat label="Hidratos" valor={hidratos} porKg={hidratosKg} color="text-macro-carbs" />
            <MacroStat label="Grasas" valor={grasas} porKg={grasasKg} color="text-macro-fat" />
          </div>
        </Card>

        <Card>
          <CardLabel>Reparto</CardLabel>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={donutData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {donutData.map((d) => (
                  <Cell key={d.name} fill={d.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 10, fontSize: 12 }}
                formatter={(value: number, name: string) => [`${value} g`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <fieldset disabled={soloLectura}>
      <Card className="mt-4">
        <CardLabel>General</CardLabel>
        <div className="grid grid-cols-4 gap-4">
          <Field
            label="Peso corporal de referencia"
            type="number"
            suffix="kg"
            value={form.pesoCorporalRef ?? ''}
            onChange={(e) => set('pesoCorporalRef', num(e.target.value))}
          />
          <Field
            label="Normocalórico"
            type="number"
            suffix="kcal"
            value={form.normocalorico ?? ''}
            onChange={(e) => set('normocalorico', num(e.target.value))}
          />
          <Field
            label="NEAT objetivo"
            type="number"
            suffix="pasos"
            value={form.neatObjetivoPasos ?? ''}
            onChange={(e) => set('neatObjetivoPasos', num(e.target.value))}
          />
          <Field
            label="% Graso"
            type="number"
            suffix="%"
            value={form.porcentajeGraso ?? ''}
            onChange={(e) => set('porcentajeGraso', num(e.target.value))}
          />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card>
          <CardLabel>Día ON</CardLabel>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Días / semana" type="number" value={form.diasOn ?? ''} onChange={(e) => set('diasOn', num(e.target.value))} />
            <Field label="Proteína" type="number" suffix="g" value={form.proteinaOn ?? ''} onChange={(e) => set('proteinaOn', num(e.target.value))} />
            <Field label="Hidratos" type="number" suffix="g" value={form.hidratosOn ?? ''} onChange={(e) => set('hidratosOn', num(e.target.value))} />
            <Field label="Grasas" type="number" suffix="g" value={form.grasasOn ?? ''} onChange={(e) => set('grasasOn', num(e.target.value))} />
          </div>
        </Card>
        <Card>
          <CardLabel>Día OFF</CardLabel>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Días / semana" type="number" value={form.diasOff ?? ''} onChange={(e) => set('diasOff', num(e.target.value))} />
            <Field label="Proteína" type="number" suffix="g" value={form.proteinaOff ?? ''} onChange={(e) => set('proteinaOff', num(e.target.value))} />
            <Field label="Hidratos" type="number" suffix="g" value={form.hidratosOff ?? ''} onChange={(e) => set('hidratosOff', num(e.target.value))} />
            <Field label="Grasas" type="number" suffix="g" value={form.grasasOff ?? ''} onChange={(e) => set('grasasOff', num(e.target.value))} />
          </div>
        </Card>
      </div>
      </fieldset>

      {!soloLectura && (
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={registrarNuevaRevision} disabled={guardando}>
            Registrar como nueva revisión (hoy)
          </Button>
          <Button onClick={guardarCambios} disabled={!plan || guardando}>
            Guardar cambios
          </Button>
        </div>
      )}
    </div>
  )
}

function MacroStat({ label, valor, porKg, color }: { label: string; valor: number | null; porKg: number; color: string }) {
  return (
    <div>
      <div className="text-xs text-text-secondary">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{formatNumero(valor, 0)} g</div>
      <div className="text-xs text-text-muted">{formatNumero(porKg, 1)} g/kg</div>
    </div>
  )
}
