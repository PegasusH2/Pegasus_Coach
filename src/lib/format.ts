export function formatFechaCorta(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatNumero(v: number | null | undefined, decimales = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return v.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

export function formatKcal(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const signo = v > 0 ? '+' : ''
  return `${signo}${formatNumero(v, 0)}`
}

export function hoyIso(): string {
  return new Date().toISOString().slice(0, 10)
}
