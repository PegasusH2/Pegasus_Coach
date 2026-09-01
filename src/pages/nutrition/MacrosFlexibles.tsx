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
import { MacroDayCard } from '@/components/nutrition/MacroDayCard'
import { MacroSecondarySummary } from '@/components/nutrition/MacroSecondarySummary'
import { formatFechaCorta, formatNumero, hoyIso } from '@/lib/format'
import type { DiaTipo, MacroPlanInput } from '@/types'

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

function otroDia(d: DiaTipo): DiaTipo {
  return d === 'ON' ? 'OFF' : 'ON'
}

export function MacrosFlexibles() {
  const { targetUserId, soloLecturaNutricion: readOnly } = useSession()
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

  const vista = (tipo: DiaTipo) =>
    tipo === 'ON'
      ? {
          kcal: calculado.calTotalOn,
          proteina: calculado.proteinaOn,
          hidratos: calculado.hidratosOn,
          grasas: calculado.grasasOn,
          proteinaKg: calculado.proteinaOnPorKg,
          hidratosKg: calculado.hidratosOnPorKg,
          grasasKg: calculado.grasasOnPorKg,
          dias: form.diasOn,
        }
      : {
          kcal: calculado.calTotalOff,
          proteina: calculado.proteinaOff,
          hidratos: calculado.hidratosOff,
          grasas: calculado.grasasOff,
          proteinaKg: calculado.proteinaOffPorKg,
          hidratosKg: calculado.hidratosOffPorKg,
          grasasKg: calculado.grasasOffPorKg,
          dias: form.diasOff,
        }

  const principal = vista(diaTipo)
  const secundario = vista(otroDia(diaTipo))

  const donutData = [
    { name: 'Proteína', value: principal.proteina ?? 0, color: '#e8383d' },
    { name: 'Hidratos', value: principal.hidratos ?? 0, color: '#f0a53a' },
    { name: 'Grasas', value: principal.grasas ?? 0, color: '#e8b93a' },
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

  // Días ON + días OFF siempre suman 7 (una semana) — al cambiar uno, el otro
  // se ajusta solo para que nunca se pueda superar ese total.
  function setDiasSemana(lado: 'on' | 'off', value: number | null) {
    const v = value === null ? null : Math.max(0, Math.min(7, Math.round(value)))
    setForm((f) => ({
      ...f,
      diasOn: lado === 'on' ? v : v === null ? f.diasOn : 7 - v,
      diasOff: lado === 'off' ? v : v === null ? f.diasOff : 7 - v,
    }))
  }

  if (!plan && readOnly) {
    return (
      <div className="max-w-5xl">
        <PageHeader title="Macros" subtitle="Tu entrenador todavía no ha configurado tus macros" />
        <p className="text-sm text-text-muted">En cuanto tu entrenador registre un plan, lo verás aquí.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Macros"
        subtitle={plan ? `Plan activo desde ${formatFechaCorta(plan.fecha)}` : 'Todavía no hay ningún plan de macros'}
        actions={<DiaToggle value={diaTipo} onChange={setDiaTipo} />}
      />

      <div key={diaTipo} className="tab-fade">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MacroDayCard
            diaTipo={diaTipo}
            diasSemana={principal.dias}
            kcal={principal.kcal}
            proteina={principal.proteina}
            hidratos={principal.hidratos}
            grasas={principal.grasas}
            proteinaPorKg={principal.proteinaKg}
            hidratosPorKg={principal.hidratosKg}
            grasasPorKg={principal.grasasKg}
          />
        </div>

        <Card>
          <CardLabel icon={<PieChartIcon size={13} />}>Reparto</CardLabel>
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

      <div className="mt-4">
        <MacroSecondarySummary
          diaTipo={otroDia(diaTipo)}
          kcal={secundario.kcal}
          proteina={secundario.proteina}
          hidratos={secundario.hidratos}
          grasas={secundario.grasas}
        />
      </div>
      </div>

      {readOnly ? (
        <Card className="mt-4">
          <CardLabel>General</CardLabel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <InfoStat label="Peso de referencia" value={form.pesoCorporalRef} suffix="kg" decimales={1} />
            <InfoStat label="Normocalórico" value={form.normocalorico} suffix="kcal" />
            <InfoStat label="NEAT objetivo" value={form.neatObjetivoPasos} suffix="pasos" />
            <InfoStat label="% Graso" value={form.porcentajeGraso} suffix="%" decimales={1} />
          </div>
        </Card>
      ) : (
        <>
          <Card className="mt-4">
            <CardLabel>General</CardLabel>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardLabel>Día ON</CardLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Días / semana"
                  type="number"
                  min={0}
                  max={7}
                  value={form.diasOn ?? ''}
                  onChange={(e) => setDiasSemana('on', num(e.target.value))}
                />
                <Field label="Proteína" type="number" suffix="g" value={form.proteinaOn ?? ''} onChange={(e) => set('proteinaOn', num(e.target.value))} />
                <Field label="Hidratos" type="number" suffix="g" value={form.hidratosOn ?? ''} onChange={(e) => set('hidratosOn', num(e.target.value))} />
                <Field label="Grasas" type="number" suffix="g" value={form.grasasOn ?? ''} onChange={(e) => set('grasasOn', num(e.target.value))} />
              </div>
            </Card>
            <Card>
              <CardLabel>Día OFF</CardLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Días / semana"
                  type="number"
                  min={0}
                  max={7}
                  value={form.diasOff ?? ''}
                  onChange={(e) => setDiasSemana('off', num(e.target.value))}
                />
                <Field label="Proteína" type="number" suffix="g" value={form.proteinaOff ?? ''} onChange={(e) => set('proteinaOff', num(e.target.value))} />
                <Field label="Hidratos" type="number" suffix="g" value={form.hidratosOff ?? ''} onChange={(e) => set('hidratosOff', num(e.target.value))} />
                <Field label="Grasas" type="number" suffix="g" value={form.grasasOff ?? ''} onChange={(e) => set('grasasOff', num(e.target.value))} />
              </div>
            </Card>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={registrarNuevaRevision} disabled={guardando} className="w-full sm:w-auto">
              Registrar como nueva revisión (hoy)
            </Button>
            <Button onClick={guardarCambios} disabled={!plan || guardando} className="w-full sm:w-auto">
              Guardar cambios
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function InfoStat({ label, value, suffix, decimales = 0 }: { label: string; value: number | null; suffix: string; decimales?: number }) {
  return (
    <div>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="text-sm font-medium">{value != null ? `${formatNumero(value, decimales)} ${suffix}` : '—'}</div>
    </div>
  )
}
