// Centro de configuración del entrenador — rediseño de Ajustes para role='entrenador'.
// Ocho categorías con navegación local (sin tocar nav.ts/App.tsx, Ajustes ya es una
// isla auto-contenida), cada una con sus propias tarjetas pequeñas y su propio
// "Guardar cambios" — nunca un guardado de página entera. Ver el plan de esta tarea
// (C:\Users\samue\.claude\plans\gleaming-scribbling-church.md) para el alcance
// exacto de cada sección: qué está realmente conectado y qué es una preferencia
// guardada para cuando exista su feature (documentado en el propio comentario de
// cada sección, no solo en el plan).
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Dumbbell,
  Lock,
  Plus,
  Puzzle,
  Ruler,
  Salad,
  Settings,
  Trash2,
  User,
  Wallet,
} from 'lucide-react'
import { useAsyncData } from '@/hooks/useData'
import { useGuardado } from '@/hooks/useGuardado'
import { useSession } from '@/lib/SessionContext'
import { updateProfile } from '@/lib/supabase/profileRepo'
import {
  createServicePrice,
  deleteServicePrice,
  listServicePrices,
  updateServicePrice,
  updateTrainerSettings,
} from '@/lib/supabase/trainerSettingsRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Profile, ServicePrice, ServiceTipo, TrainerSettings } from '@/types'

type Categoria =
  | 'perfil'
  | 'servicio'
  | 'precios'
  | 'entrenamiento'
  | 'nutricion'
  | 'seguimiento'
  | 'privacidad'
  | 'preferencias'

const CATEGORIAS: { key: Categoria; label: string; icon: LucideIcon }[] = [
  { key: 'perfil', label: 'Perfil del entrenador', icon: User },
  { key: 'servicio', label: 'Parámetros del servicio', icon: Settings },
  { key: 'precios', label: 'Precios y facturación', icon: Wallet },
  { key: 'entrenamiento', label: 'Entrenamiento', icon: Dumbbell },
  { key: 'nutricion', label: 'Nutrición', icon: Salad },
  { key: 'seguimiento', label: 'Seguimiento y revisiones', icon: Ruler },
  { key: 'privacidad', label: 'Privacidad y clientes', icon: Lock },
  { key: 'preferencias', label: 'Preferencias', icon: Puzzle },
]

function BotonGuardar({ guardando, guardado, onClick }: { guardando: boolean; guardado: boolean; onClick: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      {guardado && <span className="text-xs font-medium text-emerald-400">✓ Guardado</span>}
      <Button onClick={onClick} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </div>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      <input type="checkbox" className="accent-pegasus-red" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function AjustesEntrenador() {
  const [categoria, setCategoria] = useState<Categoria>('perfil')

  return (
    <div>
      <PageHeader title="Ajustes" subtitle="Configura tu perfil y cómo funciona Pegasus Coach" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr] md:items-start">
        <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {CATEGORIAS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoria(c.key)}
              className={`flex shrink-0 items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-sm font-medium transition-colors md:w-full ${
                categoria === c.key ? 'bg-pegasus-redSoft text-pegasus-red' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              <c.icon size={16} className="shrink-0" />
              <span className="whitespace-nowrap md:whitespace-normal">{c.label}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {categoria === 'perfil' && <PerfilSection />}
          {categoria === 'servicio' && <ServicioSection />}
          {categoria === 'precios' && <PreciosSection />}
          {categoria === 'entrenamiento' && <EntrenamientoSection />}
          {categoria === 'nutricion' && <NutricionSection />}
          {categoria === 'seguimiento' && <SeguimientoSection />}
          {categoria === 'privacidad' && <PrivacidadSection />}
          {categoria === 'preferencias' && <PreferenciasSection />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// 👤 Perfil del entrenador
// ---------------------------------------------------------------------
function PerfilSection() {
  const { session, profile, refreshProfile } = useSession()
  const { guardando, guardado, ejecutar } = useGuardado()
  const [form, setForm] = useState<Partial<Profile>>({})

  useEffect(() => {
    if (profile) setForm(profile)
  }, [profile])

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function guardar() {
    if (!session) return
    await ejecutar(async () => {
      await updateProfile(session.user.id, {
        nombre: form.nombre ?? '',
        apellidos: form.apellidos || null,
        nombreProfesional: form.nombreProfesional || null,
        telefono: form.telefono || null,
        ciudad: form.ciudad || null,
        pais: form.pais || null,
        especialidad: form.especialidad || null,
        biografia: form.biografia || null,
        perfilVisibleNombreProfesional: form.perfilVisibleNombreProfesional ?? true,
        perfilVisibleEspecialidad: form.perfilVisibleEspecialidad ?? true,
        perfilVisibleBiografia: form.perfilVisibleBiografia ?? true,
        perfilVisibleTelefono: form.perfilVisibleTelefono ?? false,
        perfilVisibleEmail: form.perfilVisibleEmail ?? false,
      })
      await refreshProfile()
    })
  }

  if (!profile) return null

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardLabel>Datos del entrenador</CardLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre" value={form.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} />
          <Field label="Apellidos" value={form.apellidos ?? ''} onChange={(e) => set('apellidos', e.target.value)} />
          <Field
            label="Nombre profesional"
            placeholder="Como quieres que te vean tus clientes"
            value={form.nombreProfesional ?? ''}
            onChange={(e) => set('nombreProfesional', e.target.value)}
          />
          <Field label="Especialidad" placeholder="Ej. Hipertrofia, oposiciones…" value={form.especialidad ?? ''} onChange={(e) => set('especialidad', e.target.value)} />
          <Field label="Teléfono" value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} />
          <Field label="Ciudad" value={form.ciudad ?? ''} onChange={(e) => set('ciudad', e.target.value)} />
          <Field label="País" value={form.pais ?? ''} onChange={(e) => set('pais', e.target.value)} />
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-text-secondary">Biografía</span>
            <textarea
              rows={3}
              value={form.biografia ?? ''}
              onChange={(e) => set('biografia', e.target.value)}
              className="rounded-control border border-bg-border bg-bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-pegasus-red"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-text-muted">Email: {profile.email ?? '—'} (no editable aquí, es el de tu cuenta)</p>
      </Card>

      <Card>
        <CardLabel>Información visible para clientes</CardLabel>
        <p className="mb-3 text-xs text-text-muted">
          Elige qué ve un cliente vinculado de tu perfil. Nota: hoy Pegasus Coach todavía no tiene una pantalla donde el
          cliente vea esta ficha — se guarda lista para cuando exista.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Checkbox label="Nombre profesional" checked={form.perfilVisibleNombreProfesional ?? true} onChange={(v) => set('perfilVisibleNombreProfesional', v)} />
          <Checkbox label="Especialidad" checked={form.perfilVisibleEspecialidad ?? true} onChange={(v) => set('perfilVisibleEspecialidad', v)} />
          <Checkbox label="Biografía" checked={form.perfilVisibleBiografia ?? true} onChange={(v) => set('perfilVisibleBiografia', v)} />
          <Checkbox label="Teléfono" checked={form.perfilVisibleTelefono ?? false} onChange={(v) => set('perfilVisibleTelefono', v)} />
          <Checkbox label="Email" checked={form.perfilVisibleEmail ?? false} onChange={(v) => set('perfilVisibleEmail', v)} />
        </div>
        <BotonGuardar guardando={guardando} guardado={guardado} onClick={guardar} />
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------
// ⚙️ Parámetros del servicio
// ---------------------------------------------------------------------
const INTERVALOS_RAPIDOS = [7, 14, 21, 30, 45, 60]
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function ServicioSection() {
  const { session, trainerSettings, refreshTrainerSettings } = useSession()
  const { guardando, guardado, ejecutar } = useGuardado()
  const [form, setForm] = useState<TrainerSettings | null>(trainerSettings)

  useEffect(() => setForm(trainerSettings), [trainerSettings])

  function set<K extends keyof TrainerSettings>(key: K, value: TrainerSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  async function guardar() {
    if (!session || !form) return
    await ejecutar(async () => {
      await updateTrainerSettings(session.user.id, {
        reviewIntervalDays: form.reviewIntervalDays,
        reviewDefaultWeekday: form.reviewDefaultWeekday,
        reviewReminderDaysBefore: form.reviewReminderDaysBefore,
        inactivityDays: form.inactivityDays,
        attentionDays: form.attentionDays,
        prolongedInactivityDays: form.prolongedInactivityDays,
      })
      await refreshTrainerSettings()
    })
  }

  if (!form) return null

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardLabel>Revisiones</CardLabel>
        <span className="text-xs font-medium text-text-secondary">Intervalo estándar entre revisiones</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {INTERVALOS_RAPIDOS.map((n) => (
            <button
              key={n}
              onClick={() => set('reviewIntervalDays', n)}
              className={`rounded-control border px-3 py-1.5 text-xs font-medium transition-colors ${
                form.reviewIntervalDays === n ? 'border-pegasus-red bg-pegasus-redSoft text-pegasus-red' : 'border-bg-border text-text-secondary'
              }`}
            >
              {n} días
            </button>
          ))}
          <input
            type="number"
            value={form.reviewIntervalDays}
            onChange={(e) => set('reviewIntervalDays', Number(e.target.value) || 1)}
            className="w-20 rounded-control border border-bg-border bg-bg-panel px-2 py-1.5 text-center text-xs text-text-primary outline-none focus:border-pegasus-red"
          />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Se usa como valor predeterminado al programar una revisión nueva — nunca impide cambiar la fecha a mano, y un
          cliente concreto puede tener su propio intervalo (ficha del cliente → Revisiones).
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Día predeterminado de revisión</span>
            <select
              value={form.reviewDefaultWeekday ?? ''}
              onChange={(e) => set('reviewDefaultWeekday', e.target.value === '' ? null : Number(e.target.value))}
              className="rounded-control border border-bg-border bg-bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-pegasus-red"
            >
              <option value="">Sin preferencia</option>
              {DIAS_SEMANA.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Recordatorio antes de revisión"
            type="number"
            suffix="días antes"
            value={form.reviewReminderDaysBefore}
            onChange={(e) => set('reviewReminderDaysBefore', Number(e.target.value) || 0)}
          />
        </div>
      </Card>

      <Card>
        <CardLabel>Estado de actividad de un cliente</CardLabel>
        <p className="mb-3 text-xs text-text-muted">
          Umbrales que usa el panel de Inicio para clasificar a tus clientes — no cambian nada de sus datos, solo cómo se
          agrupan en el dashboard.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Cliente sin actividad" type="number" suffix="días" value={form.inactivityDays} onChange={(e) => set('inactivityDays', Number(e.target.value) || 1)} />
          <Field label="Cliente requiere atención" type="number" suffix="días" value={form.attentionDays} onChange={(e) => set('attentionDays', Number(e.target.value) || 1)} />
          <Field
            label="Sin actividad prolongada"
            type="number"
            suffix="días"
            value={form.prolongedInactivityDays}
            onChange={(e) => set('prolongedInactivityDays', Number(e.target.value) || 1)}
          />
        </div>
        <BotonGuardar guardando={guardando} guardado={guardado} onClick={guardar} />
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------
// 💰 Precios y facturación
// ---------------------------------------------------------------------
const SERVICE_LABELS: Record<ServiceTipo, string> = {
  mensual: 'Servicio mensual',
  alta: 'Precio de alta',
  revision_individual: 'Revisión individual',
  sesion_individual: 'Sesión individual',
  plan_nutricional: 'Plan nutricional',
  otro: 'Otro servicio',
}

function PreciosSection() {
  const { session, trainerSettings, refreshTrainerSettings } = useSession()
  const trainerId = session?.user.id ?? ''
  const { data: servicios, refetch } = useAsyncData(() => listServicePrices(trainerId), [trainerId])
  const { guardando, guardado, ejecutar } = useGuardado()
  const [config, setConfig] = useState<TrainerSettings | null>(trainerSettings)

  useEffect(() => setConfig(trainerSettings), [trainerSettings])

  async function actualizar(id: string, patch: Partial<ServicePrice>) {
    await updateServicePrice(id, patch)
    await refetch()
  }

  async function anadir() {
    if (!trainerId) return
    await createServicePrice({ trainerId, tipo: 'otro', nombre: 'Nuevo servicio', precio: null, periodicidad: null, activo: false, sortOrder: (servicios?.length ?? 0) })
    await refetch()
  }

  async function eliminar(id: string) {
    await deleteServicePrice(id)
    await refetch()
  }

  async function guardarConfig() {
    if (!session || !config) return
    await ejecutar(async () => {
      await updateTrainerSettings(session.user.id, {
        currency: config.currency,
        paymentGraceDays: config.paymentGraceDays,
        showPaymentStatus: config.showPaymentStatus,
      })
      await refreshTrainerSettings()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardLabel>Tus servicios</CardLabel>
        <p className="mb-3 text-xs text-text-muted">
          Un catálogo informativo de tus precios habituales — no cobra ni automatiza nada, solo te ayuda a prellenar el
          importe al registrar un pago.
        </p>
        <div className="flex flex-col gap-2">
          {(servicios ?? []).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-control border border-bg-border p-2.5">
              <input type="checkbox" className="accent-pegasus-red" checked={s.activo} onChange={(e) => actualizar(s.id, { activo: e.target.checked })} />
              <input
                defaultValue={s.nombre ?? SERVICE_LABELS[s.tipo]}
                onBlur={(e) => actualizar(s.id, { nombre: e.target.value })}
                className="min-w-0 flex-1 rounded-control border border-bg-border bg-bg-panel px-2 py-1.5 text-sm text-text-primary outline-none focus:border-pegasus-red"
              />
              <input
                type="number"
                defaultValue={s.precio ?? ''}
                onBlur={(e) => actualizar(s.id, { precio: e.target.value ? Number(e.target.value) : null })}
                placeholder="Precio"
                className="w-24 rounded-control border border-bg-border bg-bg-panel px-2 py-1.5 text-sm text-text-primary outline-none focus:border-pegasus-red"
              />
              <span className="text-xs text-text-muted">{config?.currency ?? 'EUR'}</span>
              {s.tipo === 'mensual' && (
                <select
                  defaultValue={s.periodicidad ?? 'mensual'}
                  onChange={(e) => actualizar(s.id, { periodicidad: e.target.value as ServicePrice['periodicidad'] })}
                  className="rounded-control border border-bg-border bg-bg-panel px-2 py-1.5 text-xs text-text-primary outline-none"
                >
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="anual">Anual</option>
                </select>
              )}
              <button onClick={() => eliminar(s.id)} className="ml-auto text-text-muted hover:text-pegasus-red" title="Eliminar">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {(servicios ?? []).length === 0 && <p className="text-sm text-text-muted">Sin servicios todavía.</p>}
        </div>
        <button onClick={anadir} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-pegasus-red hover:text-pegasus-redDark">
          <Plus size={13} /> Añadir servicio
        </button>
      </Card>

      {config && (
        <Card>
          <CardLabel>Configuración de pagos</CardLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Moneda" value={config.currency} onChange={(e) => setConfig({ ...config, currency: e.target.value })} />
            <Field
              label="Días de margen para pago"
              type="number"
              value={config.paymentGraceDays ?? ''}
              onChange={(e) => setConfig({ ...config, paymentGraceDays: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="mt-3">
            <Checkbox label="Mostrar estado de pago en el dashboard" checked={config.showPaymentStatus} onChange={(v) => setConfig({ ...config, showPaymentStatus: v })} />
          </div>
          <BotonGuardar guardando={guardando} guardado={guardado} onClick={guardarConfig} />
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// 🏋️ Entrenamiento
// ---------------------------------------------------------------------
function EntrenamientoSection() {
  const { session, trainerSettings, refreshTrainerSettings } = useSession()
  const { guardando, guardado, ejecutar } = useGuardado()
  const [form, setForm] = useState<TrainerSettings | null>(trainerSettings)

  useEffect(() => setForm(trainerSettings), [trainerSettings])

  async function guardar() {
    if (!session || !form) return
    await ejecutar(async () => {
      await updateTrainerSettings(session.user.id, {
        weightUnit: form.weightUnit,
        distanceUnit: form.distanceUnit,
        useRir: form.useRir,
        useRpe: form.useRpe,
        defaultRestSeconds: form.defaultRestSeconds,
      })
      await refreshTrainerSettings()
    })
  }

  if (!form) return null

  return (
    <Card>
      <CardLabel>Valores por defecto de entrenamiento</CardLabel>
      <p className="mb-3 text-xs text-text-muted">
        Preferencias propias de Pegasus Coach — no cambian el registro que cada cliente hace en Pegasus Tracker.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">Unidad de peso</span>
          <select
            value={form.weightUnit}
            onChange={(e) => setForm({ ...form, weightUnit: e.target.value as TrainerSettings['weightUnit'] })}
            className="rounded-control border border-bg-border bg-bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-pegasus-red"
          >
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">Unidad de distancia</span>
          <select
            value={form.distanceUnit}
            onChange={(e) => setForm({ ...form, distanceUnit: e.target.value as TrainerSettings['distanceUnit'] })}
            className="rounded-control border border-bg-border bg-bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-pegasus-red"
          >
            <option value="km">km</option>
            <option value="mi">mi</option>
          </select>
        </label>
        <Field
          label="Descanso entre series por defecto"
          type="number"
          suffix="segundos"
          value={form.defaultRestSeconds ?? ''}
          onChange={(e) => setForm({ ...form, defaultRestSeconds: e.target.value ? Number(e.target.value) : null })}
        />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Checkbox label="Usar RIR" checked={form.useRir} onChange={(v) => setForm({ ...form, useRir: v })} />
        <Checkbox label="Usar RPE" checked={form.useRpe} onChange={(v) => setForm({ ...form, useRpe: v })} />
      </div>
      <BotonGuardar guardando={guardando} guardado={guardado} onClick={guardar} />
    </Card>
  )
}

// ---------------------------------------------------------------------
// 🥗 Nutrición
// ---------------------------------------------------------------------
function NutricionSection() {
  const { session, trainerSettings, refreshTrainerSettings } = useSession()
  const { guardando, guardado, ejecutar } = useGuardado()
  const [form, setForm] = useState<TrainerSettings | null>(trainerSettings)

  useEffect(() => setForm(trainerSettings), [trainerSettings])

  async function guardar() {
    if (!session || !form) return
    await ejecutar(async () => {
      await updateTrainerSettings(session.user.id, { nutritionEnabled: form.nutritionEnabled, defaultTipoDieta: form.defaultTipoDieta })
      await refreshTrainerSettings()
    })
  }

  if (!form) return null

  return (
    <Card>
      <CardLabel>Nutrición</CardLabel>
      <Checkbox label="Activar nutrición" checked={form.nutritionEnabled} onChange={(v) => setForm({ ...form, nutritionEnabled: v })} />
      <p className="mt-1 text-xs text-text-muted">
        Si la desactivas, se oculta la pestaña de nutrición en la ficha de tus clientes — no se borra ningún dato ni
        plan ya creado.
      </p>
      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-secondary">Tipo de nutrición por defecto para un cliente nuevo</span>
        <select
          value={form.defaultTipoDieta}
          onChange={(e) => setForm({ ...form, defaultTipoDieta: e.target.value as TrainerSettings['defaultTipoDieta'] })}
          className="rounded-control border border-bg-border bg-bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-pegasus-red"
        >
          <option value="macros">Macros</option>
          <option value="cerrada">Dieta cerrada</option>
        </select>
      </label>
      <p className="mt-1 text-xs text-text-muted">
        Solo sugiere el valor inicial al vincular un cliente — cada cliente conserva su propio tipo de nutrición, editable desde su ficha.
      </p>
      <BotonGuardar guardando={guardando} guardado={guardado} onClick={guardar} />
    </Card>
  )
}

// ---------------------------------------------------------------------
// 📏 Seguimiento y revisiones
// ---------------------------------------------------------------------
const MEDIDAS: { key: keyof TrainerSettings; label: string }[] = [
  { key: 'trackWeight', label: 'Peso' },
  { key: 'trackHeight', label: 'Altura' },
  { key: 'trackWaist', label: 'Cintura' },
  { key: 'trackHip', label: 'Cadera' },
  { key: 'trackChest', label: 'Pecho' },
  { key: 'trackArm', label: 'Brazo' },
  { key: 'trackLeg', label: 'Pierna' },
]

const PROGRESO_ITEMS: { key: keyof TrainerSettings; label: string }[] = [
  { key: 'progressWeight', label: 'Peso' },
  { key: 'progressPhotos', label: 'Fotos' },
  { key: 'progressMeasurements', label: 'Medidas' },
  { key: 'progressPerformance', label: 'Rendimiento' },
  { key: 'progressAdherence', label: 'Adherencia' },
  { key: 'progressTrainerNotes', label: 'Notas del entrenador' },
]

function SeguimientoSection() {
  const { session, trainerSettings, refreshTrainerSettings } = useSession()
  const { guardando, guardado, ejecutar } = useGuardado()
  const [form, setForm] = useState<TrainerSettings | null>(trainerSettings)

  useEffect(() => setForm(trainerSettings), [trainerSettings])

  async function guardar() {
    if (!session || !form) return
    await ejecutar(async () => {
      const patch: Record<string, boolean> = {}
      for (const { key } of [...MEDIDAS, ...PROGRESO_ITEMS]) patch[key] = form[key] as boolean
      await updateTrainerSettings(session.user.id, patch)
      await refreshTrainerSettings()
    })
  }

  if (!form) return null

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardLabel>Medidas a pedir en una revisión</CardLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MEDIDAS.map(({ key, label }) => (
            <Checkbox key={key} label={label} checked={form[key] as boolean} onChange={(v) => setForm({ ...form, [key]: v })} />
          ))}
        </div>
      </Card>
      <Card>
        <CardLabel>Secciones de progreso a mostrar</CardLabel>
        <p className="mb-2 text-xs text-text-muted">
          "Fotos" y "Rendimiento" todavía no existen como pantalla en Coach — el ajuste queda guardado, listo para
          cuando se construyan.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROGRESO_ITEMS.map(({ key, label }) => (
            <Checkbox key={key} label={label} checked={form[key] as boolean} onChange={(v) => setForm({ ...form, [key]: v })} />
          ))}
        </div>
        <BotonGuardar guardando={guardando} guardado={guardado} onClick={guardar} />
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------
// 🔐 Privacidad y clientes
// ---------------------------------------------------------------------
function PrivacidadSection() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardLabel>Visibilidad de tu perfil</CardLabel>
        <p className="text-sm text-text-secondary">
          Qué información tuya ve un cliente vinculado se configura en <strong>Perfil del entrenador</strong> — no se
          repite aquí para no tener dos sitios donde cambiar lo mismo.
        </p>
      </Card>
      <Card>
        <CardLabel>Clientes</CardLabel>
        <p className="text-sm text-text-secondary">
          Para desvincular un cliente concreto, hazlo desde su ficha (pestaña Datos → "Desvincular como entrenador").
        </p>
      </Card>
      <Card>
        <CardLabel>Retención y exportación de datos</CardLabel>
        <p className="text-sm text-text-secondary">
          La exportación/eliminación masiva de datos de clientes no está disponible todavía — es una operación
          sensible que requiere su propio diseño antes de construirse. Tú (tu propia cuenta) puedes exportar tus datos
          desde Preferencias.
        </p>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------
// 🧩 Preferencias
// ---------------------------------------------------------------------
function PreferenciasSection() {
  const { session, trainerSettings, refreshTrainerSettings } = useSession()
  const { guardando, guardado, ejecutar } = useGuardado()
  const [form, setForm] = useState<TrainerSettings | null>(trainerSettings)

  useEffect(() => setForm(trainerSettings), [trainerSettings])

  async function guardar() {
    if (!session || !form) return
    await ejecutar(async () => {
      await updateTrainerSettings(session.user.id, { startScreen: form.startScreen, dateFormat: form.dateFormat, exportFormat: form.exportFormat })
      await refreshTrainerSettings()
    })
  }

  if (!form) return null

  return (
    <Card>
      <CardLabel>Preferencias</CardLabel>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-secondary">Pantalla al iniciar</span>
        <select
          value={form.startScreen}
          onChange={(e) => setForm({ ...form, startScreen: e.target.value as TrainerSettings['startScreen'] })}
          className="w-fit rounded-control border border-bg-border bg-bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-pegasus-red"
        >
          <option value="inicio">Inicio</option>
          <option value="clientes">Clientes</option>
          <option value="calendario">Calendario</option>
        </select>
      </label>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Formato de fecha" value={form.dateFormat} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })} />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">Formato de exportación</span>
          <select
            value={form.exportFormat}
            onChange={(e) => setForm({ ...form, exportFormat: e.target.value as TrainerSettings['exportFormat'] })}
            className="rounded-control border border-bg-border bg-bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-pegasus-red"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        El formato de fecha y de exportación se guardan, pero todavía no están conectados a los formateadores/exportador
        del resto de la app.
      </p>
      <BotonGuardar guardando={guardando} guardado={guardado} onClick={guardar} />
    </Card>
  )
}
