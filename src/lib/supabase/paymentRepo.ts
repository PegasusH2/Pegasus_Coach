import { supabase } from './client'
import type { Payment, PaymentInput } from '@/types'

const TABLE = 'nutrition_payment'

/** Historial completo de pagos de un vínculo entrenador-cliente, más reciente primero. */
export async function listPaymentsByLink(linkId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('linkId', linkId)
    .order('paymentDate', { ascending: false, nullsFirst: false })
    .order('createdAt', { ascending: false })
  if (error) throw new Error(`Error al listar pagos: ${error.message}`)
  return (data ?? []) as Payment[]
}

/** Todos los pagos del entrenador (todos sus clientes) — para calcular el estado actual de cada uno. */
export async function listPaymentsByTrainer(trainerId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('trainerId', trainerId)
    .order('paymentDate', { ascending: false, nullsFirst: false })
    .order('createdAt', { ascending: false })
  if (error) throw new Error(`Error al listar pagos: ${error.message}`)
  return (data ?? []) as Payment[]
}

/** El estado "actual" de cada vínculo es el de su pago más reciente — sin fila, no hay dato (no se asume pendiente). */
export function ultimoPagoPorLink(pagos: Payment[]): Map<string, Payment> {
  const porLink = new Map<string, Payment>()
  for (const p of pagos) if (!porLink.has(p.linkId)) porLink.set(p.linkId, p)
  return porLink
}

export async function createPayment(data: PaymentInput): Promise<void> {
  const { error } = await supabase.from(TABLE).insert(data)
  if (error) throw new Error(`Error al registrar el pago: ${error.message}`)
}
