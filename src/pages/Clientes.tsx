import { useState } from 'react'
import { Check, Eye, UserPlus, X } from 'lucide-react'
import { useSession } from '@/lib/SessionContext'
import { useAsyncData } from '@/hooks/useData'
import { listAsClient, listAsTrainer, requestAccess, respondToRequest, revokeLink } from '@/lib/supabase/trainerRepo'
import { Card, CardLabel } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Route } from '@/lib/nav'

export function Clientes({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const { session, setClienteActivo } = useSession()
  const trainerId = session?.user.id ?? ''
  const { data: links, refetch } = useAsyncData(() => listAsTrainer(trainerId), [trainerId])
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function solicitar() {
    setCargando(true)
    setError(null)
    try {
      await requestAccess(trainerId, email)
      setEmail('')
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud')
    } finally {
      setCargando(false)
    }
  }

  function verCliente(id: string, nombre: string) {
    setClienteActivo({ id, nombre })
    onNavigate({ section: 'inicio' })
  }

  const aceptados = (links ?? []).filter((l) => l.status === 'accepted')
  const pendientes = (links ?? []).filter((l) => l.status === 'pending')

  return (
    <div className="max-w-3xl">
      <PageHeader title="Clientes" subtitle="Solicita acceso a un cliente y revisa el estado de tus vínculos" />

      <Card>
        <CardLabel icon={<UserPlus size={13} />}>Solicitar acceso a un cliente</CardLabel>
        <div className="flex items-end gap-3">
          <Field label="Email del cliente" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={solicitar} disabled={cargando || !email}>
            Solicitar
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-pegasus-red">{error}</p>}
        <p className="mt-2 text-xs text-text-muted">
          El cliente debe tener ya una Cuenta Pegasus y aprobar la solicitud desde su Ajustes.
        </p>
      </Card>

      <Card className="mt-4">
        <CardLabel>Mis clientes</CardLabel>
        {aceptados.length === 0 && <p className="text-sm text-text-muted">Todavía no tienes clientes vinculados.</p>}
        <div className="flex flex-col gap-2">
          {aceptados.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-control border border-bg-border p-3">
              <span className="text-sm font-medium">{l.otroNombre || 'Cliente'}</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => verCliente(l.clientId, l.otroNombre || 'Cliente')}>
                  <span className="flex items-center gap-1">
                    <Eye size={13} /> Ver progreso
                  </span>
                </Button>
                <Button variant="ghost" onClick={() => revokeLink(l.id).then(refetch)}>
                  Revocar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {pendientes.length > 0 && (
        <Card className="mt-4">
          <CardLabel>Solicitudes pendientes</CardLabel>
          <div className="flex flex-col gap-2">
            {pendientes.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-control border border-bg-border p-3">
                <span className="text-sm text-text-secondary">{l.otroNombre || 'Cliente'} · esperando aprobación</span>
                <Button variant="ghost" onClick={() => revokeLink(l.id).then(refetch)}>
                  <span className="flex items-center gap-1">
                    <X size={13} /> Cancelar
                  </span>
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export function SolicitudesPendientesCliente() {
  const { session } = useSession()
  const clientId = session?.user.id ?? ''
  const { data: links, refetch } = useAsyncData(() => listAsClient(clientId), [clientId])
  const pendientes = (links ?? []).filter((l) => l.status === 'pending')
  if (pendientes.length === 0) return null

  async function responder(id: string, accept: boolean) {
    await respondToRequest(id, accept)
    await refetch()
  }

  return (
    <Card>
      <CardLabel>Solicitudes de entrenador</CardLabel>
      <div className="flex flex-col gap-2">
        {pendientes.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-control border border-bg-border p-3">
            <span className="text-sm">{l.otroNombre || 'Un entrenador'} quiere ver tu progreso</span>
            <div className="flex gap-2">
              <Button onClick={() => responder(l.id, true)}>
                <span className="flex items-center gap-1">
                  <Check size={13} /> Aceptar
                </span>
              </Button>
              <Button variant="ghost" onClick={() => responder(l.id, false)}>
                Rechazar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
