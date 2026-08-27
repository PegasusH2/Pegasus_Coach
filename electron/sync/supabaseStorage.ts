import { kvDelete, kvGet, kvSet } from '../db'

/**
 * Adaptador de storage para el cliente de Supabase Auth (sesión, refresh
 * token) respaldado por la tabla sync_kv de SQLite — el proceso principal
 * de Electron no tiene localStorage. Mismo rol que
 * js/core/supabase-storage-adapter.js de Pegasus Tracker, pero sobre disco
 * en vez de IndexedDB.
 */
export const supabaseStorage = {
  getItem(key: string): string | null {
    return kvGet(key)
  },
  setItem(key: string, value: string): void {
    kvSet(key, value)
  },
  removeItem(key: string): void {
    kvDelete(key)
  },
}
