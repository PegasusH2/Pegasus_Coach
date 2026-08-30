import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/lib/SessionContext'
import { listWeightEntries } from '@/lib/supabase/bodyWeightRepo'
import { listMacroPlans, getActiveMacroPlan } from '@/lib/supabase/macroPlanRepo'
import { listMeasurements } from '@/lib/supabase/measurementRepo'
import { listMesociclos } from '@/lib/supabase/mesocicloRepo'
import { getActiveClosedDietPlan, listClosedDietItems } from '@/lib/supabase/closedDietRepo'
import { getProfile } from '@/lib/supabase/profileRepo'

/** Hook genérico: llama a fetcher() al montar/cuando cambian deps y expone refetch(). */
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    fetcher()
      .then((res) => {
        setData(res)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

/** Todos los hooks de datos siguen al `targetUserId` de la sesión: el propio usuario,
 * o el cliente que un entrenador tenga seleccionado (ver SessionContext). */

export function useMacroPlans() {
  const { targetUserId } = useSession()
  return useAsyncData(() => (targetUserId ? listMacroPlans(targetUserId) : Promise.resolve([])), [targetUserId])
}

export function useActiveMacroPlan() {
  const { targetUserId } = useSession()
  return useAsyncData(
    () => (targetUserId ? getActiveMacroPlan(targetUserId) : Promise.resolve(undefined)),
    [targetUserId],
  )
}

export function useWeightEntries() {
  const { targetUserId } = useSession()
  return useAsyncData(() => (targetUserId ? listWeightEntries(targetUserId) : Promise.resolve([])), [targetUserId])
}

export function useMeasurements() {
  const { targetUserId } = useSession()
  return useAsyncData(() => (targetUserId ? listMeasurements(targetUserId) : Promise.resolve([])), [targetUserId])
}

export function useMesociclos() {
  const { targetUserId } = useSession()
  return useAsyncData(() => (targetUserId ? listMesociclos(targetUserId) : Promise.resolve([])), [targetUserId])
}

export function useActiveClosedDietPlan() {
  const { targetUserId } = useSession()
  return useAsyncData(
    () => (targetUserId ? getActiveClosedDietPlan(targetUserId) : Promise.resolve(undefined)),
    [targetUserId],
  )
}

export function useClosedDietItems(planId: string | null) {
  return useAsyncData(() => (planId ? listClosedDietItems(planId) : Promise.resolve([])), [planId])
}

/** Perfil de a quién apuntan las pantallas ahora mismo (uno mismo, o el cliente que
 * un entrenador esté viendo) — necesario para saber qué UI mostrar (p.ej. tipoDieta)
 * según el perfil que se está viendo, no el de quien ha iniciado sesión. */
export function useTargetProfile() {
  const { session, profile, targetUserId } = useSession()
  const esUnoMismo = targetUserId === (session?.user.id ?? null)
  const fetched = useAsyncData(
    () => (!esUnoMismo && targetUserId ? getProfile(targetUserId) : Promise.resolve(undefined)),
    [targetUserId, esUnoMismo],
  )
  return esUnoMismo ? { data: profile, loading: false, error: null, refetch: fetched.refetch } : fetched
}
