// Importa el dataset externo de ejercicios (hasaneyldrm/exercises-dataset,
// MIT) al catálogo global `exercise_catalog` — SOLO los datos de texto
// (nombre/categoría/equipo/instrucciones), sin imágenes ni vídeos (decisión
// explícita: evita la licencia aparte de esa media, © Gym visual). Script de
// UN SOLO USO, ejecutado a mano por el usuario con su service_role key —
// nunca se llama desde la app (que solo tiene la clave anon). Ver
// supabase/migrations/0014_catalogo_ejercicios.sql.
//
// Idempotente: usa upsert, así que se puede volver a ejecutar sin duplicar
// nada si se corta a mitad.
//
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/import-exercise-catalog.mjs <ruta-al-dataset-clonado>
//
// <ruta-al-dataset-clonado> es la carpeta del `git clone` de
// https://github.com/hasaneyldrm/exercises-dataset — debe contener
// data/exercises.json.

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const SUPABASE_URL = 'https://vftvabshqcxnzgxthisv.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATASET_DIR = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno (Supabase → Settings → API → service_role).')
  process.exit(1)
}
if (!DATASET_DIR) {
  console.error('Uso: node scripts/import-exercise-catalog.mjs <ruta-al-dataset-clonado>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function procesarEnLotes(items, tamaño, fn) {
  for (let i = 0; i < items.length; i += tamaño) {
    await fn(items.slice(i, i + tamaño))
    console.log(`  ${Math.min(i + tamaño, items.length)}/${items.length}`)
  }
}

async function main() {
  const raw = await readFile(path.join(DATASET_DIR, 'data', 'exercises.json'), 'utf-8')
  const exercises = JSON.parse(raw)
  console.log(`${exercises.length} ejercicios en el dataset.`)

  console.log('Escribiendo catálogo…')
  const filas = exercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    category: ex.category,
    equipment: ex.equipment,
    instructions: ex.instructions?.es || ex.instructions?.en || '',
  }))
  await procesarEnLotes(filas, 200, async (lote) => {
    const { error } = await supabase.from('exercise_catalog').upsert(lote)
    if (error) throw new Error(`Escribiendo catálogo: ${error.message}`)
  })

  console.log('Listo.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
