// Cliente Supabase para la Cuenta Pegasus — mismo proyecto que usa Pegasus
// Tracker (compartir proyecto es lo que hace que iniciar sesión con el mismo
// email en las dos apps identifique al mismo usuario sin trabajo adicional).
//
// La "publishable key" está diseñada por Supabase para ser pública — la
// protección real de los datos es Row Level Security en Postgres (ver
// supabase/migrations/), NO el secreto de esta clave.
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vftvabshqcxnzgxthisv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_nx_3bj5brR6nWEvw2J9zpA_P2NNDB0s'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
