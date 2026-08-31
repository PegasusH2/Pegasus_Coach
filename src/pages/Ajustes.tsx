import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, FileSpreadsheet, Plus } from 'lucide-react'
import { useAsyncData } from '@/hooks/useData'
import { useSession } from '@/lib/SessionContext'
import { changeRole, updateProfile } from '@/lib/supabase/profileRepo'
import { RolPicker } from '@/components/ui/RolPicker'
import { TipoNutricionCard } from '@/components/ui/TipoNutricionCard'
import type { Rol } from '@/types'
import { createMesociclo, listMesociclos } from '@/lib/supabase/mesocicloRepo'
import { createMacroPlansBatch } from '@/lib/supabase/macroPlanRepo'
import {
  aplicarImportacionPeso,
  previsualizarImportacionPeso,
  type PreviewImportacionPeso,
  type ResolucionConflictoPeso,
} from '@/lib/supabase/bodyWeightRepo'
import { buildImportPreview } from '@/lib/excelImporter'
import { exportarDatosJson } from '@/lib/exportData'
import { Card, CardLabel } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { SolicitudesPendientesCliente } from './Clientes'
import type { ImportPreview, Mesociclo } from '@/types'

function PerfilCard() {
  const { session, profile, refreshProfile } = useSession()
  const [nombre, setNombre] = useState('')
  const [pesoInicial, setPesoInicial] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [neat, setNeat] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre)
      setPesoInicial(profile.pesoInicial?.toString() ?? '')
      setFechaInicio(profile.fechaInicio ?? '')
      setNeat(profile.neatObjetivoPasos?.toString() ?? '')
    }
  }, [profile])

  async function guardar() {
    if (!session) return
    setGuardando(true)
    try {
      await updateProfile(session.user.id, {
        nombre,
        pesoInicial: pesoInicial ? Number(pesoInicial) : null,
        fechaInicio: fechaInicio || null,
        neatObjetivoPasos: neat ? Number(neat) : null,
      })
      await refreshProfile()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card>
      <CardLabel>Perfil</CardLabel>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Field label="Peso inicial" type="number" suffix="kg" value={pesoInicial} onChange={(e) => setPesoInicial(e.target.value)} />
        <Field label="Fecha inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        <Field label="NEAT objetivo" type="number" suffix="pasos" value={neat} onChange={(e) => setNeat(e.target.value)} />
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={guardar} disabled={guardando}>
          Guardar
        </Button>
      </div>
    </Card>
  )
}

function RolCard() {
  const { session, profile, refreshProfile } = useSession()
  const [seleccion, setSeleccion] = useState<Rol | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!profile) return null
  const rolActual = profile.role
  const pendiente = seleccion !== null && seleccion !== rolActual ? seleccion : null

  async function confirmar() {
    if (!session || !pendiente) return
    setCargando(true)
    setError(null)
    try {
      await changeRole(session.user.id, pendiente)
      await refreshProfile()
      setSeleccion(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el tipo de cuenta')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Card>
      <CardLabel>Tipo de cuenta</CardLabel>
      <RolPicker value={seleccion ?? rolActual} onChange={setSeleccion} />
      {pendiente === 'personal' && (
        <p className="mt-3 text-xs text-pegasus-red">
          Al pasar a Personal se revocan automáticamente tus vínculos con clientes — dejarás de ver su progreso.
        </p>
      )}
      {pendiente === 'entrenador' && (
        <p className="mt-3 text-xs text-text-muted">
          Podrás invitar clientes desde la sección Clientes.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-pegasus-red">{error}</p>}
      {pendiente && (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setSeleccion(null)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={cargando}>
            Confirmar cambio a {pendiente === 'entrenador' ? 'Entrenador' : 'Personal'}
          </Button>
        </div>
      )}
    </Card>
  )
}

function TipoDietaCard() {
  const { session, profile, refreshProfile, tengoEntrenadorAceptado, miVinculoEntrenador } = useSession()

  if (!session || !profile) return null

  return (
    <TipoNutricionCard
      userId={session.user.id}
      tipoActual={profile.tipoDieta}
      distingueDiasActual={profile.dietaCerradaDistingueDias}
      bloqueado={tengoEntrenadorAceptado}
      bloqueadoNombreEntrenador={miVinculoEntrenador?.otroNombre}
      onGuardado={refreshProfile}
    />
  )
}

function MesociclosCard({ mesociclos, refetch }: { mesociclos: Mesociclo[]; refetch: () => void }) {
  const { session } = useSession()
  const [nombre, setNombre] = useState('')

  async function crear() {
    if (!session) return
    const numero = mesociclos.length + 1
    await createMesociclo({ userId: session.user.id, numero, nombre: nombre || `Mesociclo ${numero}`, fechaInicio: null })
    setNombre('')
    await refetch()
  }

  return (
    <Card>
      <CardLabel>Mesociclos</CardLabel>
      <div className="mb-3 flex flex-wrap gap-2">
        {mesociclos.map((m) => (
          <span key={m.id} className="rounded-control border border-bg-border bg-bg-panel px-3 py-1 text-sm">
            {m.nombre ?? `Mesociclo ${m.numero}`}
          </span>
        ))}
        {mesociclos.length === 0 && <span className="text-sm text-text-muted">Sin mesociclos todavía.</span>}
      </div>
      <div className="flex items-end gap-2">
        <Field label="Nombre del nuevo mesociclo" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Mesociclo 2" />
        <Button variant="secondary" onClick={crear}>
          <span className="flex items-center gap-1">
            <Plus size={14} /> Crear
          </span>
        </Button>
      </div>
    </Card>
  )
}

function DatosCard() {
  const { session } = useSession()
  async function exportar() {
    if (!session) return
    await exportarDatosJson(session.user.id)
  }

  return (
    <Card>
      <CardLabel>Datos</CardLabel>
      <Button variant="secondary" onClick={exportar}>
        <span className="flex items-center gap-1">
          <Download size={14} /> Exportar datos (JSON)
        </span>
      </Button>
    </Card>
  )
}

function ImportarExcelCard({ onImported }: { onImported: () => void }) {
  const { session } = useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [pesoPreview, setPesoPreview] = useState<PreviewImportacionPeso | null>(null)
  const [resolucionesPeso, setResolucionesPeso] = useState<Record<string, ResolucionConflictoPeso>>({})
  const [macroPlansCreados, setMacroPlansCreados] = useState(0)
  const [nombreMesociclo, setNombreMesociclo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileName(file.name)
    setResultado(null)
    setError(null)
    setCargando(true)
    try {
      setPreview(await buildImportPreview(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el Excel.')
      setPreview(null)
    } finally {
      setCargando(false)
    }
  }

  // Paso 1: crea el mesociclo y los planes de macros (propios de Nutrition,
  // sin conflicto posible), y prepara la comparación de pesos contra
  // body_weight (compartida con Tracker) — si hay fechas con valores
  // distintos en los dos sitios, se pide al usuario antes de tocar nada.
  async function confirmarImportacion() {
    if (!preview || !session) return
    setCargando(true)
    setError(null)
    try {
      const userId = session.user.id
      const mesociclosExistentes = await listMesociclos(userId)
      const numero = mesociclosExistentes.length > 0 ? Math.max(...mesociclosExistentes.map((m) => m.numero)) + 1 : 1
      const mesociclo = await createMesociclo({
        userId,
        numero,
        nombre: `Mesociclo ${numero} (importado)`,
        fechaInicio: preview.macroPlans[0]?.fecha ?? null,
      })
      await createMacroPlansBatch(preview.macroPlans.map((p) => ({ ...p, userId })))
      setMacroPlansCreados(preview.macroPlans.length)
      setNombreMesociclo(mesociclo.nombre ?? '')

      const pesos = await previsualizarImportacionPeso(userId, preview.weightEntries)
      if (pesos.conflictos.length === 0) {
        await aplicarImportacionPeso(userId, pesos, preview.weightEntries, {})
        finalizar(preview.macroPlans.length, pesos.aSubir.length, mesociclo.nombre ?? '')
      } else {
        setPesoPreview(pesos) // pide resolución antes de tocar nada más
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar.')
    } finally {
      setCargando(false)
    }
  }

  async function confirmarPesos() {
    if (!preview || !pesoPreview || !session) return
    setCargando(true)
    try {
      await aplicarImportacionPeso(session.user.id, pesoPreview, preview.weightEntries, resolucionesPeso)
      finalizar(macroPlansCreados, pesoPreview.aSubir.length + Object.keys(resolucionesPeso).length, nombreMesociclo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar el peso.')
    } finally {
      setCargando(false)
    }
  }

  function finalizar(planes: number, pesos: number, mesociclo: string) {
    setResultado(`Importado: ${planes} planes de macros y ${pesos} registros de peso en "${mesociclo}".`)
    setPreview(null)
    setPesoPreview(null)
    setResolucionesPeso({})
    setFileName(null)
    onImported()
  }

  return (
    <Card>
      <CardLabel icon={<FileSpreadsheet size={13} />}>Importar Excel</CardLabel>
      <p className="mb-3 text-sm text-text-secondary">
        Selecciona el Excel de control de macros. Se mostrará una vista previa antes de importar nada.
      </p>
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={onFileChosen} />
      <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={cargando}>
        Seleccionar archivo Excel…
      </Button>

      {fileName && <p className="mt-2 text-xs text-text-muted">{fileName}</p>}
      {error && <p className="mt-2 text-sm text-pegasus-red">{error}</p>}

      {preview && !pesoPreview && (
        <div className="mt-4 rounded-control border border-bg-border bg-bg-panel p-4">
          <p className="text-sm">
            Se importarán <strong>{preview.macroPlans.length}</strong> planes de macros y{' '}
            <strong>{preview.weightEntries.length}</strong> registros de peso (el peso se comparte con Pegasus
            Tracker).
          </p>
          {preview.filasARevisar.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-pegasus-red">
                <AlertTriangle size={12} /> {preview.filasARevisar.length} fila(s) con datos que no se pudieron interpretar del todo
              </div>
              <ul className="max-h-32 overflow-y-auto text-xs text-text-secondary">
                {preview.filasARevisar.map((f) => (
                  <li key={f.fila}>
                    Fila {f.fila} ({f.fecha ?? 'sin fecha'}): {f.motivo}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-text-muted">
                Estos datos se guardan como nota en el plan correspondiente, no se pierden.
              </p>
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarImportacion} disabled={cargando}>
              Confirmar importación
            </Button>
          </div>
        </div>
      )}

      {pesoPreview && (
        <div className="mt-4 rounded-control border border-bg-border bg-bg-panel p-4">
          <p className="mb-3 text-sm">
            {pesoPreview.conflictos.length} fecha(s) tienen un peso distinto en el Excel y en Pegasus Tracker —
            elige qué hacer con cada una.
          </p>
          {pesoPreview.conflictos.map((c) => (
            <div key={c.fecha} className="mb-3 rounded-control border border-bg-border p-3 text-sm">
              <p className="mb-2 text-text-secondary">
                {c.fecha}: Excel {c.pesoImportado} kg — Tracker {c.pesoExistente} kg
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['guardarAmbos', 'Conservar ambos'],
                    ['usarImportado', 'Usar el del Excel'],
                    ['usarExistente', 'Quedarme con Tracker'],
                  ] as [ResolucionConflictoPeso, string][]
                ).map(([opt, label]) => (
                  <button
                    key={opt}
                    onClick={() => setResolucionesPeso((r) => ({ ...r, [c.fecha]: opt }))}
                    className={`rounded-control border px-3 py-1.5 text-xs ${
                      (resolucionesPeso[c.fecha] ?? 'guardarAmbos') === opt
                        ? 'border-pegasus-red bg-pegasus-redSoft text-pegasus-red'
                        : 'border-bg-border text-text-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-2 flex justify-end gap-2">
            <Button onClick={confirmarPesos} disabled={cargando}>
              Confirmar
            </Button>
          </div>
        </div>
      )}

      {resultado && <p className="mt-3 text-sm text-emerald-400">{resultado}</p>}
    </Card>
  )
}

export function Ajustes() {
  const { session } = useSession()
  const userId = session?.user.id ?? ''
  // Ajustes es siempre sobre la propia cuenta, nunca sobre un cliente que un
  // entrenador esté viendo — se consulta explícitamente contra session.user.id,
  // no contra targetUserId (que apuntaría al cliente activo).
  const { data: mesociclos, refetch: refetchMesociclos } = useAsyncData(() => listMesociclos(userId), [userId])

  return (
    <div className="max-w-4xl">
      <PageHeader title="Ajustes" />
      <div className="flex flex-col gap-4">
        <SolicitudesPendientesCliente />
        <PerfilCard />
        <RolCard />
        <TipoDietaCard />
        <MesociclosCard mesociclos={mesociclos ?? []} refetch={refetchMesociclos} />
        <ImportarExcelCard onImported={refetchMesociclos} />
        <DatosCard />
      </div>
    </div>
  )
}
