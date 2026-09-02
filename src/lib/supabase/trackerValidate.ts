// Validación defensiva mínima, espejo de `Pegasus_Tracker/js/core/validate.js` — las
// mismas reglas de negocio (peso no negativo, fecha real, nombre obligatorio...)
// reimplementadas en TS. Necesario porque los repos nuevos de esta carpeta escriben
// directo en tablas propiedad de Tracker sin pasar por su repository.js (repos/apps
// independientes) — sin esto, una fila creada desde Coach podría saltarse reglas que
// Tracker sí garantiza siempre desde su propia UI.
//
// Misma distinción que el original: clean* nunca lanza (campos opcionales), require*
// lanza si el campo es indispensable.

export function cleanNonNegativeNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === ('' as unknown)) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function cleanNonNegativeInt(v: unknown): number | null {
  const n = cleanNonNegativeNumber(v)
  return n == null ? null : Math.round(n)
}

export function isValidDateString(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [year, month, day] = v.split('-').map(Number)
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}

export function requireNonEmptyString(v: unknown, fieldLabel: string): string {
  const trimmed = typeof v === 'string' ? v.trim() : ''
  if (!trimmed) throw new Error(`${fieldLabel} es obligatorio.`)
  return trimmed
}

export function requirePositiveNumber(v: unknown, fieldLabel: string): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${fieldLabel} debe ser un número mayor que 0.`)
  return n
}

export function requireValidDate(v: unknown, fieldLabel: string): string {
  if (!isValidDateString(v)) throw new Error(`${fieldLabel} no es una fecha válida.`)
  return v
}
