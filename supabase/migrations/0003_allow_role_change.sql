-- Permite cambiar el rol Personal/Entrenador después de crear la cuenta.
-- Antes, `prevent_role_change` bloqueaba cualquier UPDATE que tocara `role`
-- (decisión original: el rol se elegía una sola vez). El usuario pidió poder
-- cambiarlo desde Ajustes, así que se sustituye ese trigger por uno que:
--
--   - permite el cambio,
--   - y si se deja de ser Entrenador, revoca automáticamente los vínculos
--     donde esa cuenta era la entrenadora (aceptados o pendientes). Sin esto,
--     alguien que pasa a Personal seguiría teniendo acceso de lectura a sus
--     antiguos clientes vía las políticas RLS existentes, que solo miran
--     trainer_client_links.status — no el rol actual del perfil.
--
-- Ejecutar en el SQL Editor de Supabase.

drop trigger if exists profiles_role_immutable on profiles;
drop function if exists prevent_role_change();

create or replace function handle_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role and old.role = 'entrenador' then
    update trainer_client_links
      set status = 'revoked', "respondedAt" = now()
      where "trainerId" = new.id and status <> 'revoked';
  end if;
  return new;
end;
$$;

create trigger profiles_role_change
  before update on profiles
  for each row execute function handle_role_change();
