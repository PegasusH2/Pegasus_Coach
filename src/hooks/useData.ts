import { useCallback, useEffect, useState } from 'react'

/** Hook genérico: llama a fetcher() al montar y expone refetch() para recargar tras un cambio. */
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

export function useProfile() {
  return useAsyncData(() => window.pegasus.profile.get())
}

export function useMacroPlans() {
  return useAsyncData(() => window.pegasus.macroPlans.list())
}

export function useActiveMacroPlan() {
  return useAsyncData(() => window.pegasus.macroPlans.getActive())
}

export function useWeightEntries() {
  return useAsyncData(() => window.pegasus.weightEntries.list())
}

export function useMeasurements() {
  return useAsyncData(() => window.pegasus.measurements.list())
}

export function useMesociclos() {
  return useAsyncData(() => window.pegasus.mesociclos.list())
}
