// Cliente Supabase para la Cuenta Pegasus — capa de sincronización opcional,
// NUNCA sustituye a SQLite (que sigue siendo la fuente de verdad local, ver
// electron/db/). Mismo proyecto que usa Pegasus Tracker (ver
// js/core/supabase-client.js): compartir proyecto es lo que hace que
// iniciar sesión con el mismo email en las dos apps identifique al mismo
// usuario sin ningún trabajo adicional.
//
// La "publishable key" está diseñada por Supabase para ser pública — la
// protección real de los datos es Row Level Security en Postgres (ver
// supabase/schema.sql en Pegasus Tracker), NO el secreto de esta clave.
// Nunca debe usarse aquí la "secret key" (equivalente a la antigua
// service_role key) — esa nunca debe salir de un backend de confianza, y un
// ejecutable Electron distribuido al usuario no lo es.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseStorage } from './supabaseStorage'

const SUPABASE_URL = 'https://vftvabshqcxnzgxthisv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_nx_3bj5brR6nWEvw2J9zpA_P2NNDB0s'

let client: SupabaseClient | null = null
let overrideClient: SupabaseClient | null = null

/** Solo para tests: inyecta un cliente simulado en vez del real. */
export function __setSupabaseClientForTests(fake: SupabaseClient | null): void {
  overrideClient = fake
}

/** Siempre configurado en esta build (mismo proyecto que Tracker) — existe por si en el futuro se hace configurable. */
export function isSupabaseConfigured(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY
}

export function getSupabaseClient(): SupabaseClient | null {
  if (overrideClient) return overrideClient
  if (!isSupabaseConfigured()) return null
  if (client) return client
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: supabaseStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Sin recuperación de contraseña por enlace de email dentro de
      // Nutrition (v1): capturar el "?code=..." de un deep link exigiría
      // registrar un protocolo custom en Electron — fuera de alcance, ver
      // la propuesta de integración. Solo signInWithPassword.
      detectSessionInUrl: false,
    },
  })
  return client
}
