import { useEffect, useState } from 'react'
import { AlertTriangle, Download, FileSpreadsheet, HardDriveDownload, Plus } from 'lucide-react'
import { useMesociclos, useProfile } from '@/hooks/useData'
import { Card, CardLabel } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import type { ConflictResolution, ImportPreview, MigrationPreview, Mesociclo, PegasusSession, SyncStatus } from '@shared/types'

function PerfilCard() {
  const { data: profile, refetch } = useProfile()
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
    setGuardando(true)
    try {
      await window.pegasus.profile.update({
        nombre,
        pesoInicial: pesoInicial ? Number(pesoInicial) : null,
        fechaInicio: fechaInicio || null,
        neatObjetivoPasos: neat ? Number(neat) : null,
      })
      await refetch()
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

function MesociclosCard({ mesociclos, refetch }: { mesociclos: Mesociclo[]; refetch: () => void }) {
  const [nombre, setNombre] = useState('')

  async function crear() {
    const numero = mesociclos.length + 1
    await window.pegasus.mesociclos.create({ numero, nombre: nombre || `Mesociclo ${numero}`, fechaInicio: null })
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
  async function exportar() {
    const res = await window.pegasus.data.exportJson()
    if (res) window.alert(`Exportado en:\n${res.path}`)
  }
  async function backup() {
    const res = await window.pegasus.data.backup()
    if (res) window.alert(`Copia de seguridad guardada en:\n${res.path}`)
  }

  return (
    <Card>
      <CardLabel>Datos</CardLabel>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={exportar}>
          <span className="flex items-center gap-1">
            <Download size={14} /> Exportar datos (JSON)
          </span>
        </Button>
        <Button variant="secondary" onClick={backup}>
          <span className="flex items-center gap-1">
            <HardDriveDownload size={14} /> Copia de seguridad
          </span>
        </Button>
      </div>
    </Card>
  )
}

function ImportarExcelCard({ onImported }: { onImported: () => void }) {
  const [filePath, setFilePath] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)

  async function elegirArchivo() {
    const path = await window.pegasus.importer.pickFile()
    if (!path) return
    setFilePath(path)
    setResultado(null)
    setCargando(true)
    try {
      const p = await window.pegasus.importer.preview(path)
      setPreview(p)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo leer el Excel.')
      setPreview(null)
    } finally {
      setCargando(false)
    }
  }

  async function confirmarImportacion() {
    if (!preview) return
    setCargando(true)
    try {
      const res = await window.pegasus.importer.apply(preview)
      setResultado(
        `Importado: ${res.macroPlansCreados} planes de macros y ${res.weightEntriesCreados} registros de peso en "${res.mesocicloCreado.nombre}".`,
      )
      setPreview(null)
      setFilePath(null)
      onImported()
    } finally {
      setCargando(false)
    }
  }

  return (
    <Card>
      <CardLabel icon={<FileSpreadsheet size={13} />}>Importar Excel</CardLabel>
      <p className="mb-3 text-sm text-text-secondary">
        Selecciona el Excel de control de macros. Se mostrará una vista previa antes de importar nada.
      </p>
      <Button variant="secondary" onClick={elegirArchivo} disabled={cargando}>
        Seleccionar archivo Excel…
      </Button>

      {filePath && <p className="mt-2 text-xs text-text-muted">{filePath}</p>}

      {preview && (
        <div className="mt-4 rounded-control border border-bg-border bg-bg-panel p-4">
          <p className="text-sm">
            Se importarán <strong>{preview.macroPlans.length}</strong> planes de macros y{' '}
            <strong>{preview.weightEntries.length}</strong> registros de peso.
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

      {resultado && <p className="mt-3 text-sm text-emerald-400">{resultado}</p>}
    </Card>
  )
}

function statusLabel(st: SyncStatus): string {
  if (st.state === 'syncing') return 'Sincronizando…'
  if (st.state === 'error') return `Error de sincronización: ${st.lastError ?? ''}`
  if (st.pendingCount > 0) return `Pendiente (${st.pendingCount})`
  if (st.lastSyncedAt) return `Sincronizado — ${new Date(st.lastSyncedAt).toLocaleString('es-ES')}`
  return 'Todavía no se ha sincronizado.'
}

function CuentaPegasusCard() {
  const [session, setSession] = useState<PegasusSession | null | undefined>(undefined)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [migration, setMigration] = useState<MigrationPreview | null>(null)
  const [resolutions, setResolutions] = useState<Record<number, ConflictResolution>>({})

  useEffect(() => {
    window.pegasus.auth.getSession().then(setSession)
    window.pegasus.sync.getStatus().then(setStatus)
    return window.pegasus.sync.onStatusChange(setStatus)
  }, [])

  async function iniciarSesion() {
    setCargando(true)
    setError(null)
    try {
      const res = await window.pegasus.auth.signIn(email, password)
      if (res.error || !res.session) {
        setError(res.error ?? 'No se pudo iniciar sesión')
        return
      }
      setSession(res.session)
      setPassword('')
      const preview = await window.pegasus.sync.previewMigration()
      if (preview.toUpload > 0 || preview.conflicts.length > 0) setMigration(preview)
    } finally {
      setCargando(false)
    }
  }

  async function cerrarSesion() {
    await window.pegasus.auth.signOut()
    setSession(null)
  }

  async function sincronizarAhora() {
    setStatus(await window.pegasus.sync.now())
  }

  async function confirmarMigracion() {
    setCargando(true)
    try {
      await window.pegasus.sync.applyMigration(resolutions)
      setMigration(null)
      setResolutions({})
    } finally {
      setCargando(false)
    }
  }

  if (session === undefined) return null

  return (
    <Card>
      <CardLabel>Cuenta Pegasus</CardLabel>
      {!session ? (
        <>
          <p className="mb-3 text-sm text-text-secondary">
            Inicia sesión con tu Cuenta Pegasus (la misma que en Pegasus Tracker) para sincronizar tu peso entre las
            dos apps. Nutrition sigue funcionando igual sin cuenta.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="mt-2 text-sm text-pegasus-red">{error}</p>}
          <div className="mt-3 flex justify-end">
            <Button onClick={iniciarSesion} disabled={cargando}>
              Iniciar sesión
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">{session.userEmail}</p>
          {status && <p className="mt-1 text-xs text-text-muted">{statusLabel(status)}</p>}
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={sincronizarAhora} disabled={status?.state === 'syncing'}>
              Sincronizar ahora
            </Button>
            <Button variant="ghost" onClick={cerrarSesion}>
              Cerrar sesión
            </Button>
          </div>
        </>
      )}

      {migration && (
        <div className="mt-4 rounded-control border border-bg-border bg-bg-panel p-4">
          <p className="mb-3 text-sm">
            {migration.toUpload > 0 && (
              <>
                Se subirán {migration.toUpload} registro(s) de peso de este dispositivo.
                {migration.conflicts.length > 0 && ' '}
              </>
            )}
            {migration.conflicts.length > 0 &&
              `${migration.conflicts.length} fecha(s) tienen un peso distinto guardado en Nutrition y en Tracker — elige qué hacer con cada una.`}
          </p>
          {migration.conflicts.map((c) => (
            <div key={c.localId} className="mb-3 rounded-control border border-bg-border p-3 text-sm">
              <p className="mb-2 text-text-secondary">
                {c.fecha}: Nutrition {c.pesoLocal} kg — Tracker {c.pesoRemoto} kg
              </p>
              <div className="flex flex-wrap gap-2">
                {(['both', 'keepLocal', 'keepRemote'] as ConflictResolution[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setResolutions((r) => ({ ...r, [c.localId]: opt }))}
                    className={`rounded-control border px-3 py-1.5 text-xs ${
                      (resolutions[c.localId] ?? 'both') === opt
                        ? 'border-pegasus-red bg-pegasus-red/10 text-pegasus-red'
                        : 'border-bg-border text-text-secondary'
                    }`}
                  >
                    {opt === 'both' ? 'Conservar ambos' : opt === 'keepLocal' ? 'Quedarme con Nutrition' : 'Quedarme con Tracker'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMigration(null)}>
              Ahora no
            </Button>
            <Button onClick={confirmarMigracion} disabled={cargando}>
              Confirmar
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export function Ajustes() {
  const { data: mesociclos, refetch: refetchMesociclos } = useMesociclos()

  return (
    <div className="max-w-4xl">
      <PageHeader title="Ajustes" />
      <div className="flex flex-col gap-4">
        <PerfilCard />
        <CuentaPegasusCard />
        <MesociclosCard mesociclos={mesociclos ?? []} refetch={refetchMesociclos} />
        <ImportarExcelCard onImported={refetchMesociclos} />
        <DatosCard />
      </div>
    </div>
  )
}
