import { useEffect, useState } from 'react'
import { useActiveMacroPlan } from '@/hooks/useData'
import { calcularMacroPlan } from '@/lib/calculos'
import { useSession } from '@/lib/SessionContext'
import { createMacroPlan, updateMacroPlan } from '@/lib/supabase/macroPlanRepo'
import { updateTrainerSettings } from '@/lib/supabase/trainerSettingsRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { MacroDayCard } from '@/components/nutrition/MacroDayCard'
import { RecomendacionesMacrosSexoToggle } from '@/components/nutrition/RecomendacionesMacrosSexo'
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

export function MacrosFlexibles() {
  const { session, profile, targetUserId, soloLecturaNutricion: readOnly, trainerSettings, refreshTrainerSettings } = useSession()
  const esEntrenador = profile?.role === 'entrenador'
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
  const { data: plan, refetch } = useActiveMacroPlan()
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

  const on = vista('ON')
  const off = vista('OFF')

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
      <div>
        <PageHeader title="Macros" subtitle="Tu entrenador todavía no ha configurado tus macros" />
        <p className="text-sm text-text-muted">En cuanto tu entrenador registre un plan, lo verás aquí.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Macros"
        subtitle={plan ? `Plan activo desde ${formatFechaCorta(plan.fecha)}` : 'Todavía no hay ningún plan de macros'}
      />

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <MacroDayCard
          diaTipo="ON"
          diasSemana={on.dias}
          kcal={on.kcal}
          proteina={on.proteina}
          hidratos={on.hidratos}
          grasas={on.grasas}
          proteinaPorKg={on.proteinaKg}
          hidratosPorKg={on.hidratosKg}
          grasasPorKg={on.grasasKg}
        />
        <MacroDayCard
          diaTipo="OFF"
          diasSemana={off.dias}
          kcal={off.kcal}
          proteina={off.proteina}
          hidratos={off.hidratos}
          grasas={off.grasas}
          proteinaPorKg={off.proteinaKg}
          hidratosPorKg={off.hidratosKg}
          grasasPorKg={off.grasasKg}
        />
      </div>

      {readOnly ? (
        <Card className="mt-2">
          <CardLabel>General</CardLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoStat label="Peso de referencia" value={form.pesoCorporalRef} suffix="kg" decimales={1} />
            <InfoStat label="Normocalórico" value={form.normocalorico} suffix="kcal" />
            <InfoStat label="NEAT objetivo" value={form.neatObjetivoPasos} suffix="pasos" />
            <InfoStat label="% Graso" value={form.porcentajeGraso} suffix="%" decimales={1} />
          </div>
        </Card>
      ) : (
        <>
          <Card className="mt-2">
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

            {esEntrenador && (
              <RecomendacionesMacrosSexoToggle
                checked={trainerSettings?.mostrarRecomendacionesMacrosPorSexo ?? false}
                disabled={guardandoPreferencia}
                onChange={toggleRecomendacionesSexo}
              />
            )}
          </Card>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
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

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
