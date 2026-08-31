import { useState } from 'react'
import { signIn, signUp, sendPasswordReset, updatePassword, authErrorMessage, type Rol } from '@/lib/supabase/auth'
import { createProfile } from '@/lib/supabase/profileRepo'
import { useSession } from '@/lib/SessionContext'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { RolPicker } from '@/components/ui/RolPicker'

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="Pegasus" className="h-12 w-12 rounded-xl" />
          <div className="text-lg font-bold">PEGASUS NUTRITION</div>
        </div>
        {children}
      </div>
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

  if (modo === 'recuperar') {
    return (
      <AuthShell>
        <div className="flex flex-col gap-3 rounded-card border border-bg-border bg-bg-card p-5">
          <p className="text-sm text-text-secondary">Te mandamos un enlace a tu email para elegir una nueva contraseña.</p>
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm text-pegasus-red">{error}</p>}
          {aviso && <p className="text-sm text-emerald-400">{aviso}</p>}
          <Button onClick={enviar} disabled={cargando || !email}>
            Enviar enlace
          </Button>
          <button onClick={() => cambiarModo('entrar')} className="text-xs text-text-muted hover:text-text-secondary">
            Volver a iniciar sesión
          </button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="mb-5 flex gap-1 rounded-control bg-bg-panel p-1">
        <button
          onClick={() => cambiarModo('entrar')}
          className={`flex-1 rounded-[8px] py-1.5 text-sm font-semibold transition-colors ${
            modo === 'entrar' ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Iniciar sesión
        </button>
        <button
          onClick={() => cambiarModo('registro')}
          className={`flex-1 rounded-[8px] py-1.5 text-sm font-semibold transition-colors ${
            modo === 'registro' ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Crear cuenta
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-card border border-bg-border bg-bg-card p-5">
        <p className="text-xs text-text-muted">
          Si ya tienes Cuenta Pegasus (por ejemplo de Pegasus Tracker), usa el mismo email y contraseña en
          "Iniciar sesión" — es la misma cuenta.
        </p>
        {modo === 'registro' && (
          <>
            <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <RolPicker value={rol} onChange={setRol} />
          </>
        )}
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="text-sm text-pegasus-red">{error}</p>}
        {aviso && <p className="text-sm text-emerald-400">{aviso}</p>}

        <Button onClick={enviar} disabled={cargando || !email || !password}>
          {modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}
        </Button>
        {modo === 'entrar' && (
          <button onClick={() => cambiarModo('recuperar')} className="text-xs text-text-muted hover:text-text-secondary">
            ¿Olvidaste tu contraseña?
          </button>
        )}
      </div>
    </AuthShell>
  )
}

/** Se muestra cuando ya hay una sesión válida de Supabase (p.ej. una cuenta creada desde
 * Pegasus Tracker) pero todavía no existe la fila de profiles específica de Nutrition. */
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
          Ya tienes Cuenta Pegasus ({session?.user.email}) pero es la primera vez que entras en Nutrition —
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
