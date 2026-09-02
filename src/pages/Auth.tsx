import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Mail,
  Lock,
  UserRound,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Info,
  AlertCircle,
  CheckCircle2,
  Users,
  ClipboardList,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'
import { signIn, signUp, sendPasswordReset, updatePassword, authErrorMessage, type Rol } from '@/lib/supabase/auth'
import { createProfile } from '@/lib/supabase/profileRepo'
import { useSession } from '@/lib/SessionContext'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { RolPicker } from '@/components/ui/RolPicker'

/** Shell simple, usado por las pantallas auxiliares (CompletarPerfil, ActualizarPassword) —
 * sin tocar, fuera del alcance del rediseño de la pantalla de Login. */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="Pegasus" className="h-12 w-12 rounded-xl" />
          <div className="text-lg font-bold">PEGASUS COACH</div>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Input de la pantalla de Login, con icono a la izquierda y slot opcional a la derecha
 * (usado para el botón de mostrar/ocultar contraseña). Mismo lenguaje visual que el
 * `Field` compartido (mismo radius/borde/foco), pero local a esta pantalla — no se ha
 * tocado `components/ui/Field.tsx`, que sigue usándose tal cual en el resto de la app. */
function AuthField({
  label,
  icon: Icon,
  rightSlot,
  className = '',
  ...rest
}: {
  label: string
  icon: LucideIcon
  rightSlot?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <div className="flex items-center gap-2.5 rounded-control border border-bg-border bg-bg-panel px-3.5 py-2.5 transition-colors focus-within:border-pegasus-red focus-within:ring-2 focus-within:ring-pegasus-red/20">
        <Icon size={17} className="shrink-0 text-text-muted" aria-hidden="true" />
        <input
          className={`w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted ${className}`}
          {...rest}
        />
        {rightSlot}
      </div>
    </label>
  )
}

function Benefit({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-pegasus-red/25 bg-pegasus-redSoft text-pegasus-red">
        <Icon size={17} aria-hidden="true" />
      </div>
      <span className="text-sm text-text-secondary">{children}</span>
    </div>
  )
}

/** Panel de marca — solo desktop/tablet ancho. Sin fotografía (no hay recurso gráfico
 * apropiado en el proyecto): la pieza inferior es un fondo generado con gradientes,
 * el propio icono de Pegasus a gran tamaño como marca de agua, y un patrón de puntos. */
function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden border-b border-bg-border bg-bg px-12 py-14 lg:flex lg:flex-col lg:justify-between lg:border-b-0 lg:border-r xl:px-16">
      {/* halos de luz roja, muy sutiles */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-pegasus-red/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] translate-x-1/3 translate-y-1/4 rounded-full bg-pegasus-red/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-10">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="Pegasus" className="h-9 w-9 rounded-lg" />
          <span className="text-lg font-extrabold tracking-tight">
            <span className="text-text-primary">PEGASUS</span> <span className="text-pegasus-red">COACH</span>
          </span>
        </div>

        <div>
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-text-primary xl:text-[2.75rem]">
            Planifica.
            <br />
            Gestiona.
            <br />
            <span className="text-pegasus-red">Transforma.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-text-secondary">
            La plataforma para entrenadores que quieren gestionar a sus clientes, planificar su nutrición y hacer
            seguimiento de su progreso desde un solo lugar.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Benefit icon={Users}>Gestiona todos tus clientes</Benefit>
          <Benefit icon={ClipboardList}>Planifica su nutrición y sigue su entrenamiento</Benefit>
          <Benefit icon={TrendingUp}>Analiza el progreso real</Benefit>
        </div>
      </div>

      {/* pieza gráfica inferior — abstracta, sin fotografía */}
      <div className="relative z-10 mt-14 h-44 overflow-hidden rounded-card border border-bg-border bg-bg-panel/60">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            color: '#f5f5f5',
          }}
        />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-pegasus-red/20 blur-3xl" />
        <img
          src={`${import.meta.env.BASE_URL}icons/icon-512.png`}
          alt=""
          aria-hidden="true"
          className="absolute -bottom-10 -right-8 h-56 w-56 rotate-[-8deg] opacity-[0.09] blur-[1px]"
        />
        <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-bg via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mt-8 flex items-center gap-5 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-pegasus-red" aria-hidden="true" />
          Seguro y privado
        </span>
        <span className="h-1 w-1 rounded-full bg-bg-border" />
        <span>PegasusOne Ecosystem</span>
      </div>
    </div>
  )
}

/** Header compacto — solo se ve en mobile, sustituye al panel de marca completo. */
function MobileBrandHeader() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 pb-2 pt-10 text-center lg:hidden">
      <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="Pegasus" className="h-11 w-11 rounded-xl" />
      <span className="text-base font-extrabold tracking-tight">
        <span className="text-text-primary">PEGASUS</span> <span className="text-pegasus-red">COACH</span>
      </span>
      <p className="max-w-xs text-xs text-text-muted">La plataforma para entrenadores — clientes, nutrición y progreso en un solo lugar.</p>
    </div>
  )
}

function LoginCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[420px]">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[28px] bg-pegasus-red/[0.06] blur-2xl" />
      <div className="relative overflow-hidden rounded-card border border-bg-border bg-bg-card p-7 shadow-xl shadow-black/30 sm:p-9">
        <div className="absolute inset-x-9 top-0 h-px bg-gradient-to-r from-transparent via-pegasus-red/40 to-transparent" />
        {children}
      </div>
    </div>
  )
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-control border border-bg-border bg-bg-panel/70 px-3 py-2.5 text-xs leading-relaxed text-text-muted">
      <Info size={14} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-control border border-pegasus-red/30 bg-pegasus-redSoft px-3 py-2.5 text-sm text-pegasus-red">
      <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

function SuccessNote({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-control border border-success/30 bg-success-soft px-3 py-2.5 text-sm text-success">
      <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export function Auth() {
  const [modo, setModo] = useState<'entrar' | 'registro' | 'recuperar'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('personal')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [mostrarPassword, setMostrarPassword] = useState(false)

  function cambiarModo(m: 'entrar' | 'registro' | 'recuperar') {
    setModo(m)
    setError(null)
    setAviso(null)
  }

  async function enviar() {
    setCargando(true)
    setError(null)
    setAviso(null)
    try {
      if (modo === 'recuperar') {
        await sendPasswordReset(email)
        setAviso('Te hemos enviado un email con un enlace para elegir una nueva contraseña.')
        return
      }
      if (modo === 'entrar') {
        await signIn(email, password)
      } else {
        await signUp(email, password, rol, nombre)
      }
    } catch (err) {
      const msg = authErrorMessage(err)
      if (msg.startsWith('Cuenta creada')) setAviso(msg)
      else setError(msg)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-bg lg:grid lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <div className="flex flex-1 flex-col">
        <MobileBrandHeader />
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <LoginCard>
            {modo === 'recuperar' ? (
              <>
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-pegasus-red/25 bg-pegasus-redSoft">
                    <Lock size={22} className="text-pegasus-red" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-text-primary">Recuperar contraseña</h1>
                    <p className="mt-1 text-sm text-text-secondary">Te mandamos un enlace a tu email para elegir una nueva.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <AuthField
                    label="Email"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {error && <ErrorNote>{error}</ErrorNote>}
                  {aviso && <SuccessNote>{aviso}</SuccessNote>}
                  <Button
                    onClick={enviar}
                    disabled={cargando || !email}
                    className="flex w-full items-center justify-center gap-2 py-2.5 text-[15px] shadow-lg shadow-pegasus-red/20 transition-all hover:shadow-pegasus-red/30 active:scale-[0.98]"
                  >
                    {cargando ? (
                      <>
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        Enviando…
                      </>
                    ) : (
                      'Enviar enlace'
                    )}
                  </Button>
                  <button
                    onClick={() => cambiarModo('entrar')}
                    className="text-center text-xs text-text-muted transition-colors hover:text-text-secondary"
                  >
                    Volver a iniciar sesión
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-7 flex flex-col items-center gap-3 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-pegasus-red/25 bg-pegasus-redSoft">
                    <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" aria-hidden="true" className="h-9 w-9 rounded-lg" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-text-primary">
                      Bienvenido a <span className="text-pegasus-red">Pegasus Coach</span>
                    </h1>
                    <p className="mt-1 text-sm text-text-secondary">Inicia sesión para continuar</p>
                  </div>
                </div>

                <div
                  role="tablist"
                  aria-label="Modo de acceso"
                  className="mb-6 flex gap-1 rounded-control border border-bg-border bg-bg-panel p-1"
                >
                  <button
                    role="tab"
                    aria-selected={modo === 'entrar'}
                    onClick={() => cambiarModo('entrar')}
                    className={`flex-1 rounded-[8px] py-2 text-sm font-semibold transition-colors ${
                      modo === 'entrar' ? 'bg-pegasus-red text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    role="tab"
                    aria-selected={modo === 'registro'}
                    onClick={() => cambiarModo('registro')}
                    className={`flex-1 rounded-[8px] py-2 text-sm font-semibold transition-colors ${
                      modo === 'registro' ? 'bg-pegasus-red text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Crear cuenta
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <InfoNote>
                    Si ya tienes Cuenta Pegasus (por ejemplo de Pegasus Tracker), usa el mismo email y contraseña en
                    "Iniciar sesión" — es la misma cuenta.
                  </InfoNote>

                  {modo === 'registro' && (
                    <>
                      <AuthField
                        label="Nombre"
                        icon={UserRound}
                        autoComplete="name"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                      />
                      <RolPicker value={rol} onChange={setRol} />
                    </>
                  )}

                  <AuthField
                    label="Email"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <AuthField
                    label="Contraseña"
                    icon={Lock}
                    type={mostrarPassword ? 'text' : 'password'}
                    autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setMostrarPassword((v) => !v)}
                        aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={mostrarPassword}
                        className="shrink-0 text-text-muted transition-colors hover:text-text-secondary"
                      >
                        {mostrarPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                      </button>
                    }
                  />

                  {error && <ErrorNote>{error}</ErrorNote>}
                  {aviso && <SuccessNote>{aviso}</SuccessNote>}

                  <Button
                    onClick={enviar}
                    disabled={cargando || !email || !password}
                    className="flex w-full items-center justify-center gap-2 py-2.5 text-[15px] shadow-lg shadow-pegasus-red/20 transition-all hover:shadow-pegasus-red/30 active:scale-[0.98]"
                  >
                    {cargando ? (
                      <>
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        {modo === 'entrar' ? 'Entrando…' : 'Creando cuenta…'}
                      </>
                    ) : (
                      <>
                        {modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}
                        <ArrowRight size={16} aria-hidden="true" />
                      </>
                    )}
                  </Button>

                  {modo === 'entrar' && (
                    <button
                      onClick={() => cambiarModo('recuperar')}
                      className="text-center text-xs text-text-muted transition-colors hover:text-text-secondary"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
              </>
            )}
          </LoginCard>
        </div>
      </div>
    </div>
  )
}

/** Se muestra cuando ya hay una sesión válida de Supabase (p.ej. una cuenta creada desde
 * Pegasus Tracker) pero todavía no existe la fila de profiles específica de Coach. */
export function CompletarPerfil() {
  const { session, refreshProfile } = useSession()
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('personal')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function completar() {
    if (!session) return
    setCargando(true)
    setError(null)
    try {
      await createProfile(session.user.id, rol, nombre, session.user.email ?? null)
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil')
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-3 rounded-card border border-bg-border bg-bg-card p-5">
        <p className="text-sm text-text-secondary">
          Ya tienes Cuenta Pegasus ({session?.user.email}) pero es la primera vez que entras en Pegasus Coach —
          termina de configurarla.
        </p>
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <RolPicker value={rol} onChange={setRol} />
        {error && <p className="text-sm text-pegasus-red">{error}</p>}
        <Button onClick={completar} disabled={cargando || !nombre}>
          Continuar
        </Button>
      </div>
    </AuthShell>
  )
}

/** Se muestra al volver del enlace de "recuperar contraseña" del email. */
export function ActualizarPassword() {
  const { clearRecoveryMode } = useSession()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (password !== password2) {
      setError('Las dos contraseñas no coinciden')
      return
    }
    setCargando(true)
    setError(null)
    try {
      await updatePassword(password)
      clearRecoveryMode()
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-3 rounded-card border border-bg-border bg-bg-card p-5">
        <p className="text-sm text-text-secondary">Elige tu nueva contraseña.</p>
        <Field label="Nueva contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Field label="Repite la contraseña" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        {error && <p className="text-sm text-pegasus-red">{error}</p>}
        <Button onClick={guardar} disabled={cargando || !password || !password2}>
          Guardar contraseña
        </Button>
      </div>
    </AuthShell>
  )
}
