// Agregaciones para el panel de control del entrenador (pantalla Inicio).
// Combina datos propios de Nutrition con la lectura real (nunca escritura)
// del entrenamiento del cliente en Pegasus Tracker — ver trackerReadRepo.ts.
import { listWeightEntries } from './bodyWeightRepo'
import { getActiveClosedDietPlan } from './closedDietRepo'
import { getActiveMacroPlan } from './macroPlanRepo'
import { listPaymentsByTrainer, ultimoPagoPorLink } from './paymentRepo'
import { listPendingReviews, listRevisionesRecibidasEsteMes } from './reviewRepo'
import { listAsTrainer } from './trainerRepo'
import { getUltimoWorkout } from './trackerReadRepo'
import type { Payment, Review, WeightEntry } from '@/types'

export interface ClienteResumen {
  linkId: string
  clientId: string
  nombre: string
  email: string | null
  ultimaActividad: string | null
  ultimaActividadOrigen: 'nutrition' | 'tracker' | null
  proximaRevision: Review | null
  pago: Payment | null
  pesos: WeightEntry[]
}

export interface ResumenEntrenador {
  clientesTotal: number
  clientesActivos: number
  proximasRevisiones: Review[]
  revisionesRecibidasEsteMes: Review[]
  clientesPendientesPago: { clientId: string; nombre: string; amount: number | null }[]
  totalPendiente: number
  clientes: ClienteResumen[]
}

/** Última fecha con datos propios de Nutrition (peso, macros o dieta cerrada) — sin inventar tracking nuevo. */
async function getUltimaActividadNutrition(clientId: string): Promise<{ fecha: string | null; pesos: WeightEntry[] }> {
  const [pesos, macro, dieta] = await Promise.all([
    listWeightEntries(clientId).catch(() => [] as WeightEntry[]),
    getActiveMacroPlan(clientId).catch(() => undefined),
    getActiveClosedDietPlan(clientId).catch(() => undefined),
  ])
  const ultimoPeso = pesos.length > 0 ? [...pesos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha : null
  const fechas = [ultimoPeso, macro?.fecha ?? null, dieta?.fecha ?? null].filter((f): f is string => f !== null)
  const fecha = fechas.length > 0 ? [...fechas].sort().reverse()[0] : null
  return { fecha, pesos }
}

async function getClienteBase(linkId: string, clientId: string, nombre: string, email: string | null): Promise<ClienteResumen> {
  const [nutrition, workout] = await Promise.all([
    getUltimaActividadNutrition(clientId),
    getUltimoWorkout(clientId).catch(() => undefined),
  ])
  let ultimaActividad: string | null = null
  let origen: ClienteResumen['ultimaActividadOrigen'] = null
  if (nutrition.fecha && (!workout || nutrition.fecha >= workout.date)) {
    ultimaActividad = nutrition.fecha
    origen = 'nutrition'
  } else if (workout) {
    ultimaActividad = workout.date
    origen = 'tracker'
  }
  return {
    linkId,
    clientId,
    nombre,
    email,
    ultimaActividad,
    ultimaActividadOrigen: origen,
    proximaRevision: null,
    pago: null,
    pesos: nutrition.pesos,
  }
}

export async function getResumenEntrenador(trainerId: string): Promise<ResumenEntrenador> {
  const links = await listAsTrainer(trainerId)
  const aceptados = links.filter((l) => l.status === 'accepted')

  const [clientesBase, pendientes, revisionesRecibidasEsteMes, pagos] = await Promise.all([
    Promise.all(aceptados.map((l) => getClienteBase(l.id, l.clientId, l.otroNombre || l.otroEmail || 'Cliente', l.otroEmail ?? null))),
    listPendingReviews(trainerId),
    listRevisionesRecibidasEsteMes(trainerId),
    listPaymentsByTrainer(trainerId),
  ])

  // Por cliente: su revisión pendiente más próxima, sea cual sea la fecha (ya viene ordenada).
  const proximaPendientePorCliente = new Map<string, Review>()
  for (const r of pendientes) if (!proximaPendientePorCliente.has(r.clientId)) proximaPendientePorCliente.set(r.clientId, r)

  const en7dias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const proximasRevisiones = pendientes.filter((r) => r.fechaProgramada <= en7dias)

  const pagoPorLink = ultimoPagoPorLink(pagos)
  const clientes = clientesBase.map((c) => ({
    ...c,
    pago: pagoPorLink.get(c.linkId) ?? null,
    proximaRevision: proximaPendientePorCliente.get(c.clientId) ?? null,
  }))

  const hace7dias = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const clientesActivos = clientes.filter((c) => c.ultimaActividad !== null && c.ultimaActividad >= hace7dias).length

  const clientesPendientes = clientes.filter((c) => c.pago?.status === 'pending')
  const totalPendiente = clientesPendientes.reduce((sum, c) => sum + (c.pago?.amount ?? 0), 0)

  return {
    clientesTotal: aceptados.length,
    clientesActivos,
    proximasRevisiones,
    revisionesRecibidasEsteMes,
    clientesPendientesPago: clientesPendientes.map((c) => ({ clientId: c.clientId, nombre: c.nombre, amount: c.pago?.amount ?? null })),
    totalPendiente,
    clientes,
  }
}
