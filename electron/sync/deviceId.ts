import crypto from 'node:crypto'
import { kvGet, kvSet } from '../db'

const KEY = 'deviceId'

let cached: string | null = null

/** UUID persistido una vez por instalación — sin datos personales, igual que js/core/device.js de Pegasus Tracker. */
export function getDeviceId(): string {
  if (cached) return cached
  const existing = kvGet(KEY)
  if (existing) {
    cached = existing
    return existing
  }
  const fresh = crypto.randomUUID()
  kvSet(KEY, fresh)
  cached = fresh
  return fresh
}
