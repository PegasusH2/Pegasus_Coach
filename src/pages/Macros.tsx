import { useEffect, useState } from 'react'
import { PieChart as PieChartIcon, Plus, Trash2 } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  useActiveClosedDietPlan,
  useActiveMacroPlan,
  useClosedDietItems,
  useClosedDietPlans,
  useMacroPlans,
  useTargetProfile,
} from '@/hooks/useData'
import { calcularMacroPlan } from '@/lib/calculos'
import { useDiaTipo } from '@/lib/DiaTipoContext'
import { useSession } from '@/lib/SessionContext'
import { createMacroPlan, updateMacroPlan } from '@/lib/supabase/macroPlanRepo'
import { createClosedDietPlan, replaceClosedDietItems } from '@/lib/supabase/closedDietRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { DiaToggle } from '@/components/ui/DiaToggle'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { construirHistorico } from '@/lib/historico'
import { formatFechaCorta, formatNumero, hoyIso } from '@/lib/format'
import type { ClosedDietItem, ClosedDietItemInput, DiaTipoItem, MacroPlanInput, TipoDieta } from '@/types'

type NutricionTab = 'contenido' | 'historico'

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
  const { data: targetProfile, loading } = useTargetProfile()
  const [tab, setTab] = useState<NutricionTab>('contenido')
  if (loading && !targetProfile) return null

  const tipoDieta: TipoDieta = targetProfile?.tipoDieta ?? 'macros'
  const labelContenido = tipoDieta === 'cerrada' ? 'Dieta' : 'Macros'

  return (
    <>
      <div className="mb-5 flex gap-1 rounded-control bg-bg-panel p-1 w-fit">
        {(
          [
            { key: 'contenido' as const, label: labelContenido },
            { key: 'historico' as const, label: 'Histórico' },
          ] as { key: NutricionTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-[8px] px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'historico' ? (
        <HistoricoNutricional tipoDietaActual={tipoDieta} />
      ) : tipoDieta === 'cerrada' ? (
        <DietaCerrada distingueDias={targetProfile?.dietaCerradaDistingueDias ?? false} />
      ) : (
        <MacrosFlexibles />
      )}
    </>
  )
}

function HistoricoNutricional({ tipoDietaActual }: { tipoDietaActual: TipoDieta }) {
  const { data: macroPlans } = useMacroPlans()
  const { data: closedDietPlans } = useClosedDietPlans()
  const historico = construirHistorico(macroPlans ?? [], closedDietPlans ?? [], tipoDietaActual)

  return (
    <div className="max-w-5xl">
      <PageHeader title="Histórico nutricional" subtitle="Macros y Dieta cerrada, todo el pasado conservado" />
      <Card>
        {historico.length === 0 && <p className="text-sm text-text-muted">Todavía no hay ningún registro nutricional.</p>}
        <div className="flex flex-col divide-y divide-bg-border">
          {historico.map((entrada, i) => (
            <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatFechaCorta(entrada.fecha)}</span>
                  {entrada.actual && (
                    <span className="rounded-full bg-pegasus-redSoft px-2 py-0.5 text-xs font-semibold text-pegasus-red">
                      Actual
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-muted">{entrada.tipo === 'cerrada' ? 'Dieta cerrada' : 'Macros'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{entrada.resumenPrincipal}</div>
                {entrada.resumenSecundario && <div className="text-xs text-text-muted">{entrada.resumenSecundario}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function MacrosFlexibles() {
  const { targetUserId, soloLecturaNutricion: soloLectura } = useSession()
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

// ---------- Dieta cerrada: lista de alimentos + gramos, sin cuantificar macros ----------

interface FilaAlimento {
  momento: string
  alimento: string
  gramos: string
}

function filaVacia(): FilaAlimento {
  return { momento: '', alimento: '', gramos: '' }
}

function filaDesdeItem(item: ClosedDietItem): FilaAlimento {
  return { momento: item.momento ?? '', alimento: item.alimento, gramos: item.gramos.toString() }
}

function filasAItems(filas: FilaAlimento[], diaTipo: DiaTipoItem): Omit<ClosedDietItemInput, 'planId'>[] {
  return filas
    .filter((f) => f.alimento.trim() !== '')
    .map((f, i) => ({
      diaTipo,
      momento: f.momento.trim() || null,
      alimento: f.alimento.trim(),
      gramos: Number(f.gramos) || 0,
      orden: i,
    }))
}

function ListaAlimentos({
  titulo,
  filas,
  setFilas,
  soloLectura,
}: {
  titulo: string
  filas: FilaAlimento[]
  setFilas: (f: (filas: FilaAlimento[]) => FilaAlimento[]) => void
  soloLectura: boolean
}) {
  function actualizar(index: number, patch: Partial<FilaAlimento>) {
    setFilas((filas) => filas.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }
  function borrar(index: number) {
    setFilas((filas) => filas.filter((_, i) => i !== index))
  }

  return (
    <Card>
      <CardLabel>{titulo}</CardLabel>
      <fieldset disabled={soloLectura} className="flex flex-col gap-2">
        {filas.map((f, i) => (
          <div key={i} className="flex items-end gap-2">
            <Field
              label="Momento"
              placeholder="Ej: Desayuno, 8:00…"
              value={f.momento}
              onChange={(e) => actualizar(i, { momento: e.target.value })}
            />
            <Field label="Alimento" value={f.alimento} onChange={(e) => actualizar(i, { alimento: e.target.value })} />
            <Field
              label="Gramos"
              type="number"
              suffix="g"
              value={f.gramos}
              onChange={(e) => actualizar(i, { gramos: e.target.value })}
            />
            {!soloLectura && (
              <button onClick={() => borrar(i)} className="mb-2 text-text-muted hover:text-pegasus-red">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {filas.length === 0 && <p className="text-sm text-text-muted">Todavía no hay alimentos.</p>}
        {!soloLectura && (
          <Button variant="secondary" className="self-start" onClick={() => setFilas((filas) => [...filas, filaVacia()])}>
            <span className="flex items-center gap-1">
              <Plus size={14} /> Añadir alimento
            </span>
          </Button>
        )}
      </fieldset>
    </Card>
  )
}

function DietaCerrada({ distingueDias }: { distingueDias: boolean }) {
  const { targetUserId, soloLecturaNutricion: soloLectura } = useSession()
  const { diaTipo, setDiaTipo } = useDiaTipo()
  const { data: plan, refetch: refetchPlan } = useActiveClosedDietPlan()
  const { data: items, refetch: refetchItems } = useClosedDietItems(plan?.id ?? null)
  const [filasOn, setFilasOn] = useState<FilaAlimento[]>([])
  const [filasOff, setFilasOff] = useState<FilaAlimento[]>([])
  const [filasUnico, setFilasUnico] = useState<FilaAlimento[]>([])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!items) return
    setFilasOn(items.filter((i) => i.diaTipo === 'on').map(filaDesdeItem))
    setFilasOff(items.filter((i) => i.diaTipo === 'off').map(filaDesdeItem))
    setFilasUnico(items.filter((i) => i.diaTipo === 'unico').map(filaDesdeItem))
  }, [items])

  function itemsAGuardar(): Omit<ClosedDietItemInput, 'planId'>[] {
    return distingueDias
      ? [...filasAItems(filasOn, 'on'), ...filasAItems(filasOff, 'off')]
      : filasAItems(filasUnico, 'unico')
  }

  async function guardarCambios() {
    if (!plan) return
    setGuardando(true)
    try {
      await replaceClosedDietItems(plan.id, itemsAGuardar())
      await refetchItems()
    } finally {
      setGuardando(false)
    }
  }

  async function registrarNuevaRevision() {
    if (!targetUserId) return
    setGuardando(true)
    try {
      const nuevoPlan = await createClosedDietPlan({ userId: targetUserId, fecha: hoyIso(), semanaId: null, notas: null })
      await replaceClosedDietItems(nuevoPlan.id, itemsAGuardar())
      await refetchPlan()
      await refetchItems()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Dieta cerrada"
        subtitle={plan ? `Dieta activa desde ${plan.fecha}` : 'Todavía no hay ninguna dieta registrada'}
        actions={distingueDias ? <DiaToggle value={diaTipo} onChange={setDiaTipo} /> : undefined}
      />

      {distingueDias ? (
        <div className="grid grid-cols-2 gap-4">
          <ListaAlimentos titulo="Alimentos — Día ON" filas={filasOn} setFilas={setFilasOn} soloLectura={soloLectura} />
          <ListaAlimentos titulo="Alimentos — Día OFF" filas={filasOff} setFilas={setFilasOff} soloLectura={soloLectura} />
        </div>
      ) : (
        <ListaAlimentos titulo="Alimentos" filas={filasUnico} setFilas={setFilasUnico} soloLectura={soloLectura} />
      )}

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
