-- Pegasus Nutrition — esquema para la Cuenta Pegasus (Personal / Entrenador).
-- Ejecutar en el proyecto Supabase compartido con Pegasus Tracker:
-- Dashboard → SQL Editor → pegar y ejecutar este fichero completo.
--
-- No toca ninguna tabla existente de Tracker (body_weight, etc.) — todo lo
-- nuevo usa el prefijo nutrition_ salvo profiles y trainer_client_links,
-- pensadas para compartirse entre las dos apps del ecosistema.
--
-- El peso corporal NO tiene tabla propia aquí a propósito: Nutrition lee y
-- escribe directo en `body_weight` (creada y gestionada por Tracker, mismo
-- proyecto/cuenta), así un peso registrado en cualquiera de las dos apps
-- aparece en la otra. Ver src/lib/supabase/bodyWeightRepo.ts.

-- ---------------------------------------------------------------------
-- profiles — una fila por cuenta, rol fijo elegido al registrarse
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('personal', 'entrenador')),
  nombre text not null default '',
  "pesoInicial" double precision,
  "fechaInicio" date,
  "neatObjetivoPasos" integer
);

-- ---------------------------------------------------------------------
-- trainer_client_links — el entrenador solicita, el cliente aprueba
-- ---------------------------------------------------------------------
create table if not exists trainer_client_links (
  id uuid primary key default gen_random_uuid(),
  "trainerId" uuid not null references auth.users(id) on delete cascade,
  "clientId" uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  "createdAt" timestamptz not null default now(),
  "respondedAt" timestamptz,
  unique ("trainerId", "clientId")
);
create index if not exists idx_links_trainer on trainer_client_links("trainerId");
create index if not exists idx_links_client on trainer_client_links("clientId");

-- ---------------------------------------------------------------------
-- Datos de Nutrition — un mesociclo/semana debe crearse antes que los
-- planes de macros que lo referencian.
-- ---------------------------------------------------------------------
create table if not exists nutrition_mesociclo (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  numero integer not null,
  nombre text,
  "fechaInicio" date
);
create index if not exists idx_mesociclo_user on nutrition_mesociclo("userId");

create table if not exists nutrition_semana (
  id uuid primary key default gen_random_uuid(),
  "mesocicloId" uuid not null references nutrition_mesociclo(id) on delete cascade,
  numero integer not null,
  "fechaInicio" date
);
create index if not exists idx_semana_mesociclo on nutrition_semana("mesocicloId");

create table if not exists nutrition_macro_plan (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  "semanaId" uuid references nutrition_semana(id) on delete set null,
  "neatObjetivoPasos" integer,
  "aguaLitros" double precision,
  "salGramos" double precision,
  "entrenamientoDiasSemana" integer,
  "entrenamientoDuracionMin" integer,
  "pesoCorporalRef" double precision,
  "porcentajeGraso" double precision,
  normocalorico double precision,
  "diasOn" integer,
  "proteinaOn" double precision,
  "hidratosOn" double precision,
  "grasasOn" double precision,
  "diasOff" integer,
  "proteinaOff" double precision,
  "hidratosOff" double precision,
  "grasasOff" double precision,
  notas text
);
create index if not exists idx_macroplan_user_fecha on nutrition_macro_plan("userId", fecha);

create table if not exists nutrition_measurement (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  pectoral double precision,
  axila double precision,
  triceps double precision,
  subescapular double precision,
  abdomen double precision,
  suprailiaco double precision,
  cuadriceps double precision,
  "porcentajeGraso" double precision,
  brazo double precision,
  cintura double precision,
  cadera double precision,
  muslo double precision,
  pecho double precision,
  cuello double precision,
  notas text
);
create index if not exists idx_measurement_user_fecha on nutrition_measurement("userId", fecha);

-- ---------------------------------------------------------------------
-- RPC: buscar el id de una cuenta por email (para que un entrenador pueda
-- solicitar acceso). SECURITY DEFINER porque auth.users no es consultable
-- directamente por usuarios normales — nunca expone más que el id.
-- Trade-off aceptado: cualquier autenticado puede usarla para comprobar si
-- un email tiene cuenta Pegasus (enumeración). No hay forma de solicitar
-- acceso a un cliente por email sin esto; si se quiere cerrar del todo,
-- la alternativa es un código de invitación en vez de email, fuera de
-- alcance de esta fase.
-- ---------------------------------------------------------------------
create or replace function find_profile_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select u.id
  from auth.users u
  join profiles p on p.id = u.id
  where lower(u.email) = lower(p_email)
  limit 1
$$;
grant execute on function find_profile_by_email(text) to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
alter table trainer_client_links enable row level security;
alter table nutrition_mesociclo enable row level security;
alter table nutrition_semana enable row level security;
alter table nutrition_macro_plan enable row level security;
alter table nutrition_measurement enable row level security;

-- profiles: cada uno ve/edita el suyo; además es visible para la otra parte
-- de un vínculo entrenador-cliente, PERO solo una vez aceptado (l.status =
-- 'accepted') — con una solicitud todavía 'pending' el entrenador no debe
-- ver nada del perfil del cliente (peso inicial, fecha de inicio, NEAT).
create policy "profiles_select" on profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from trainer_client_links l
    where l.status = 'accepted'
      and ((l."trainerId" = auth.uid() and l."clientId" = profiles.id)
        or (l."clientId" = auth.uid() and l."trainerId" = profiles.id))
  )
);
create policy "profiles_insert_self" on profiles for insert with check (id = auth.uid());
create policy "profiles_update_self" on profiles for update using (id = auth.uid());

-- El rol se elige una sola vez al registrarse y no debe poder cambiarse
-- después (ni siquiera por el propio dueño de la fila) — profiles_update_self
-- solo exige id = auth.uid(), así que sin este trigger cualquiera podría
-- auto-promocionarse a 'entrenador' con un simple UPDATE directo a la API.
create or replace function prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role then
    raise exception 'El rol de la cuenta no se puede cambiar';
  end if;
  return new;
end;
$$;
create trigger profiles_role_immutable
  before update on profiles
  for each row execute function prevent_role_change();

-- trainer_client_links: cada parte ve sus propios vínculos. Solo una cuenta
-- con role = 'entrenador' puede CREAR una solicitud (a su propio trainerId)
-- — sin esto, cualquier cuenta 'personal' podía solicitar acceso a otras
-- llamando directo a la API, sin pasar nunca por el registro como Entrenador.
-- Para responder: el cliente puede poner accepted/revoked; el entrenador
-- solo puede revocar (cancelar) su propia solicitud, nunca auto-aceptarse.
create policy "links_select" on trainer_client_links for select using (
  "trainerId" = auth.uid() or "clientId" = auth.uid()
);
create policy "links_insert_trainer" on trainer_client_links for insert with check (
  "trainerId" = auth.uid()
  and status = 'pending'
  and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'entrenador')
);
create policy "links_update" on trainer_client_links for update using (
  "clientId" = auth.uid() or "trainerId" = auth.uid()
) with check (
  "clientId" = auth.uid() or ("trainerId" = auth.uid() and status = 'revoked')
);

-- trainerId/clientId identifican el vínculo — nunca deben poder reescribirse
-- en un UPDATE (solo status/respondedAt cambian). Sin esto, la parte cliente
-- podía reasignar trainerId a una cuenta arbitraria y auto-aceptarla en el
-- mismo UPDATE, saltándose el flujo normal de solicitud.
create or replace function prevent_link_identity_change()
returns trigger
language plpgsql
as $$
begin
  if new."trainerId" <> old."trainerId" or new."clientId" <> old."clientId" then
    raise exception 'trainerId/clientId no se pueden modificar, solo status';
  end if;
  return new;
end;
$$;
create trigger links_identity_immutable
  before update on trainer_client_links
  for each row execute function prevent_link_identity_change();

-- Plantilla de RLS reutilizada por cada tabla de datos "userId + owner o
-- entrenador con vínculo aceptado":
create policy "mesociclo_select" on nutrition_mesociclo for select using (
  "userId" = auth.uid() or exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = nutrition_mesociclo."userId" and l.status = 'accepted'
  )
);
create policy "mesociclo_write" on nutrition_mesociclo for all using ("userId" = auth.uid()) with check ("userId" = auth.uid());

create policy "semana_select" on nutrition_semana for select using (
  exists (
    select 1 from nutrition_mesociclo m where m.id = nutrition_semana."mesocicloId" and (
      m."userId" = auth.uid() or exists (
        select 1 from trainer_client_links l
        where l."trainerId" = auth.uid() and l."clientId" = m."userId" and l.status = 'accepted'
      )
    )
  )
);
create policy "semana_write" on nutrition_semana for all using (
  exists (select 1 from nutrition_mesociclo m where m.id = nutrition_semana."mesocicloId" and m."userId" = auth.uid())
) with check (
  exists (select 1 from nutrition_mesociclo m where m.id = nutrition_semana."mesocicloId" and m."userId" = auth.uid())
);

create policy "macroplan_select" on nutrition_macro_plan for select using (
  "userId" = auth.uid() or exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = nutrition_macro_plan."userId" and l.status = 'accepted'
  )
);
create policy "macroplan_write" on nutrition_macro_plan for all using ("userId" = auth.uid()) with check ("userId" = auth.uid());

create policy "measurement_select" on nutrition_measurement for select using (
  "userId" = auth.uid() or exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = nutrition_measurement."userId" and l.status = 'accepted'
  )
);
create policy "measurement_write" on nutrition_measurement for all using ("userId" = auth.uid()) with check ("userId" = auth.uid());

-- ---------------------------------------------------------------------
-- OPCIONAL — NO ejecutar sin confirmarlo antes: da a un entrenador con
-- vínculo aceptado permiso de SOLO LECTURA sobre `body_weight`, una tabla
-- que pertenece a Tracker. Sin esto, la pantalla "Ver progreso" de un
-- entrenador en Nutrition mostrará el peso vacío (la RLS actual de Tracker
-- es "cada usuario solo ve las suyas", sin excepción para entrenadores).
-- Es aditiva (una política PERMISSIVE más, nunca quita acceso a nadie que
-- ya lo tenga), pero afecta a la visibilidad de datos de usuarios de
-- Tracker que no tienen por qué estar usando Nutrition — pide confirmación
-- antes de ejecutar esta parte.
-- ---------------------------------------------------------------------
-- create policy "trainer_read_body_weight" on body_weight for select using (
--   exists (
--     select 1 from trainer_client_links l
--     where l."trainerId" = auth.uid() and l."clientId" = body_weight.user_id and l.status = 'accepted'
--   )
-- );
