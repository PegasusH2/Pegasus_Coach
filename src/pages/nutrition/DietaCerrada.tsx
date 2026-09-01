import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useActiveClosedDietPlan, useClosedDietItems } from '@/hooks/useData'
import { useDiaTipo } from '@/lib/DiaTipoContext'
import { useSession } from '@/lib/SessionContext'
import { createClosedDietPlan, replaceClosedDietItems, updateClosedDietPlan } from '@/lib/supabase/closedDietRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { DiaToggle } from '@/components/ui/DiaToggle'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { ClosedDietTimeline } from '@/components/nutrition/ClosedDietTimeline'
import { CoachNoteCard } from '@/components/nutrition/CoachNoteCard'
import { formatFechaCorta, hoyIso } from '@/lib/format'
import type { ClosedDietItem, ClosedDietItemInput, DiaTipoItem } from '@/types'

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

export function DietaCerrada({ distingueDias }: { distingueDias: boolean }) {
  const { targetUserId, soloLecturaNutricion: readOnly } = useSession()
  const { diaTipo, setDiaTipo } = useDiaTipo()
  const { data: plan, refetch: refetchPlan } = useActiveClosedDietPlan()
  const { data: items, refetch: refetchItems } = useClosedDietItems(plan?.id ?? null)
  const [filasOn, setFilasOn] = useState<FilaAlimento[]>([])
  const [filasOff, setFilasOff] = useState<FilaAlimento[]>([])
  const [filasUnico, setFilasUnico] = useState<FilaAlimento[]>([])
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!items) return
    setFilasOn(items.filter((i) => i.diaTipo === 'on').map(filaDesdeItem))
    setFilasOff(items.filter((i) => i.diaTipo === 'off').map(filaDesdeItem))
    setFilasUnico(items.filter((i) => i.diaTipo === 'unico').map(filaDesdeItem))
  }, [items])

  useEffect(() => {
    setNotas(plan?.notas ?? '')
  }, [plan])

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
      await updateClosedDietPlan(plan.id, { notas: notas.trim() || null })
      await refetchItems()
      await refetchPlan()
    } finally {
      setGuardando(false)
    }
  }

  async function registrarNuevaRevision() {
    if (!targetUserId) return
    setGuardando(true)
    try {
      const nuevoPlan = await createClosedDietPlan({ userId: targetUserId, fecha: hoyIso(), semanaId: null, notas: notas.trim() || null })
      await replaceClosedDietItems(nuevoPlan.id, itemsAGuardar())
      await refetchPlan()
      await refetchItems()
    } finally {
      setGuardando(false)
    }
  }

  if (!plan && readOnly) {
    return (
      <div className="max-w-5xl">
        <PageHeader title="Dieta cerrada" subtitle="Todavía no tienes un plan de nutrición asignado" />
        <p className="text-sm text-text-muted">En cuanto tu entrenador registre tu dieta, la verás aquí.</p>
      </div>
    )
  }

  const itemsDelDiaActivo = distingueDias
    ? (items ?? []).filter((i) => i.diaTipo === diaTipo.toLowerCase())
    : items ?? []

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Dieta cerrada"
        subtitle={plan ? `Dieta activa desde ${formatFechaCorta(plan.fecha)}` : 'Todavía no hay ninguna dieta registrada'}
        actions={distingueDias ? <DiaToggle value={diaTipo} onChange={setDiaTipo} /> : undefined}
      />

      {readOnly ? (
        <div key={diaTipo} className="tab-fade flex flex-col gap-4">
          <ClosedDietTimeline items={itemsDelDiaActivo} />
          <CoachNoteCard notas={notas} readOnly />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {distingueDias ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ListaAlimentos titulo="Alimentos — Día ON" filas={filasOn} setFilas={setFilasOn} />
              <ListaAlimentos titulo="Alimentos — Día OFF" filas={filasOff} setFilas={setFilasOff} />
            </div>
          ) : (
            <ListaAlimentos titulo="Alimentos" filas={filasUnico} setFilas={setFilasUnico} />
          )}

          <CoachNoteCard notas={notas} readOnly={false} onChange={setNotas} />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={registrarNuevaRevision} disabled={guardando} className="w-full sm:w-auto">
              Registrar como nueva revisión (hoy)
            </Button>
            <Button onClick={guardarCambios} disabled={!plan || guardando} className="w-full sm:w-auto">
              Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ListaAlimentos({
  titulo,
  filas,
  setFilas,
}: {
  titulo: string
  filas: FilaAlimento[]
  setFilas: (f: (filas: FilaAlimento[]) => FilaAlimento[]) => void
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
      <div className="flex flex-col gap-3">
        {filas.map((f, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-control border border-bg-border p-3 sm:flex-row sm:items-end sm:border-0 sm:p-0">
            <Field
              label="Momento"
              placeholder="Ej: Desayuno, 8:00…"
              value={f.momento}
              onChange={(e) => actualizar(i, { momento: e.target.value })}
            />
            <Field label="Alimento" value={f.alimento} onChange={(e) => actualizar(i, { alimento: e.target.value })} />
            <div className="flex items-end gap-2">
              <Field
                label="Gramos"
                type="number"
                suffix="g"
                value={f.gramos}
                onChange={(e) => actualizar(i, { gramos: e.target.value })}
              />
              <button onClick={() => borrar(i)} className="mb-2 shrink-0 text-text-muted hover:text-pegasus-red" aria-label="Eliminar alimento">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {filas.length === 0 && <p className="text-sm text-text-muted">Todavía no hay alimentos.</p>}
        <Button variant="secondary" className="self-start" onClick={() => setFilas((filas) => [...filas, filaVacia()])}>
          <span className="flex items-center gap-1">
            <Plus size={14} /> Añadir alimento
          </span>
        </Button>
      </div>
    </Card>
  )
}
