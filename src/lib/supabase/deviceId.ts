// Identificador estable de este navegador/instalación — solo informativo en
// body_weight.device_id (columna de solo lectura para depuración, nunca se usa
// para autorización). Mismo rol que electron/sync/deviceId.ts tenía en la app
// de escritorio, pero respaldado por localStorage en vez de la BD local.
const KEY = 'pegasus-nutrition:deviceId'

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
