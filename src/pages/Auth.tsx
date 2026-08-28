import { useState } from 'react'
import { PieChart } from 'lucide-react'
import { signIn, signUp, authErrorMessage, type Rol } from '@/lib/supabase/auth'
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pegasus-red text-white">
            <PieChart size={22} />
          </div>
          <div className="text-lg font-bold">PEGASUS NUTRITION</div>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Auth() {
  const [modo, setModo] = useState<'entrar' | 'registro'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('personal')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function enviar() {
    setCargando(true)
    setError(null)
    setAviso(null)
    try {
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
    <AuthShell>
      <div className="mb-5 flex gap-1 rounded-control bg-bg-panel p-1">
        <button
          onClick={() => setModo('entrar')}
          className={`flex-1 rounded-[8px] py-1.5 text-sm font-semibold transition-colors ${
            modo === 'entrar' ? 'bg-pegasus-red text-white' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Iniciar sesión
        </button>
        <button
          onClick={() => setModo('registro')}
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
      await createProfile(session.user.id, rol, nombre)
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
