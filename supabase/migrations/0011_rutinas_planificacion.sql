-- Rutina -> Día -> Ejercicios: agrupa varios `templates` (cada uno, un día/sesión
-- suelto) bajo una rutina común. Hoy "templates" es una entidad plana en ambas
-- apps (ver Pegasus_Tracker/js/views/templates.js, donde CADA template se llama
-- "rutina") — sin una tabla de agrupación no hay forma de representar que
-- "Día 1, Día 2, Día 3, Día 4" pertenecen a la misma rutina. Aditivo: ningún
-- dato existente se pierde, `templates.routine_id` es nullable (un template ya
-- creado queda "sin agrupar" hasta que se le asigne una rutina).
--
-- Mismo patrón de propiedad/RLS que ya usan las 11 tablas de Tracker (ver
-- pegasus_set_owner_and_timestamps y trainer_manage_client_training en
-- 0007_control_total_entrenador.sql): el cliente es el dueño natural de la
-- fila, el entrenador con vínculo aceptado gana acceso ADITIVO (nunca se le
-- quita nada al cliente). Ejecutar en el SQL Editor de Supabase, proyecto
-- compartido con Tracker. No toca ningún fichero de Pegasus_Tracker.

-- id SIN default: igual que templates/exercises en Pegasus_Tracker/supabase/schema.sql,
-- siempre se genera en el cliente (crypto.randomUUID()), nunca en el servidor.
create table if not exists template_routines (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text,
  name text not null,
  sort_order integer default 0,
  -- null = activa; con fecha = archivada. Mismo patrón "tombstone" que
  -- deleted_at, para no inventar un booleano nuevo — "archivar" y "eliminar
  -- definitivamente" quedan claramente diferenciados (deleted_at es aparte).
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table templates add column if not exists routine_id uuid references template_routines(id) on delete set null;

-- Mismo trigger de ownership/timestamps que ya usan las 11 tablas de Tracker —
-- permite que el entrenador cree una rutina atribuida al cliente (nunca a sí
-- mismo), igual que ya hace con templates/exercises/etc.
drop trigger if exists trg_owner_timestamps on template_routines;
create trigger trg_owner_timestamps before insert or update on template_routines
  for each row execute function pegasus_set_owner_and_timestamps();

alter table template_routines enable row level security;

drop policy if exists pegasus_owner_all on template_routines;
create policy pegasus_owner_all on template_routines for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists trainer_manage_client_training on template_routines;
create policy trainer_manage_client_training on template_routines for all using (
  exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = template_routines.user_id and l.status = 'accepted'
  )
) with check (
  exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = template_routines.user_id and l.status = 'accepted'
  )
);

create index if not exists idx_template_routines_user_updated on template_routines (user_id, updated_at);
create index if not exists idx_templates_routine on templates (routine_id);
