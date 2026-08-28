-- Permite a un Entrenador invitar a CUALQUIER Cuenta Pegasus por email, incluida
-- una que solo haya usado Pegasus Tracker y nunca haya abierto Nutrition (por lo
-- tanto sin fila en `profiles` todavía). Ejecutar en el SQL Editor de Supabase.
--
-- Antes de esto, find_profile_by_email hacía join con `profiles`, así que una
-- solicitud a un email de Tracker-sin-Nutrition fallaba con "no existe ninguna
-- cuenta" aunque la cuenta compartida sí existiera en auth.users. trainer_client_links
-- ya podía apuntar a cualquier auth.users (su FK no pasa por profiles), así que
-- el único bloqueo real era esta búsqueda.

-- ---------------------------------------------------------------------
-- find_profile_by_email — ahora busca en auth.users directamente, sin
-- exigir que la cuenta ya tenga perfil de Nutrition.
-- ---------------------------------------------------------------------
create or replace function find_profile_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1
$$;

-- ---------------------------------------------------------------------
-- Mientras esa cuenta no tenga perfil (no aparece en `profiles`), la UI del
-- entrenador no tiene nombre que mostrar para la solicitud — se guarda el
-- email tal como se invitó para poder listar "a quién" está esperando.
-- Puramente informativo, nunca se usa para autenticar ni para RLS.
-- ---------------------------------------------------------------------
alter table trainer_client_links add column if not exists "clientEmailAtInvite" text;
