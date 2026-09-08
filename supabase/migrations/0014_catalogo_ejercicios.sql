-- Catálogo global de ejercicios (dataset externo hasaneyldrm/exercises-dataset,
-- MIT) + vínculo opcional desde el ejercicio propio de cada usuario. Aditivo:
-- un ejercicio creado a mano sigue teniendo catalog_id en null, y los
-- ejercicios de cada usuario siguen sin ser visibles entre usuarios (RLS
-- existente de `exercises`, sin tocar).
--
-- SOLO los datos de texto (nombre/categoría/equipo/instrucciones), sin
-- imágenes ni vídeos — decisión explícita del usuario, para no entrar en la
-- licencia aparte de las imágenes/GIFs del dataset (© Gym visual, ver
-- NOTICE.md). Al no usar esa media, tampoco aplica su atribución.
--
-- El catálogo es de SOLO LECTURA desde la app (cliente y entrenador por
-- igual) — se rellena una única vez con
-- supabase/scripts/import-exercise-catalog.mjs, ejecutado por el usuario con
-- la service_role key (el código de la app solo tiene la clave anon/publicable
-- y no puede escribir aquí).
--
-- Ejecutar en el SQL Editor de Supabase, en el proyecto compartido con Tracker.

create table if not exists exercise_catalog (
  id text primary key,
  name text not null,
  category text not null,
  equipment text not null,
  instructions text not null default '',
  created_at timestamptz not null default now()
);

alter table exercise_catalog enable row level security;

drop policy if exists "catalog_read" on exercise_catalog;
create policy "catalog_read" on exercise_catalog for select using (auth.role() = 'authenticated');
-- Sin policy de insert/update/delete: bloqueado para anon y authenticated.
-- Solo el import script (service_role, que ignora RLS) puede escribir aquí.

alter table exercises add column if not exists catalog_id text references exercise_catalog(id) on delete set null;
