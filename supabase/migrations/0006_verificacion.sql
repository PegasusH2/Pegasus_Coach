-- Verificación manual de 0006_tipo_nutricion_exclusivo.sql — NO es parte del
-- esquema, no crea ni modifica nada por sí sola. Ejecutar a mano en el SQL
-- Editor de Supabase DESPUÉS de aplicar 0006, bloque a bloque.
--
-- No existe infraestructura de tests automatizados de RLS en este repo (sin
-- pgTAP, sin Supabase local en Docker) — este script sustituye a eso mediante
-- `set local role authenticated` + `request.jwt.claims`, la misma técnica que
-- usa PostgREST en producción para simular auth.uid() = <usuario concreto>,
-- así que los resultados reflejan fielmente lo que vería cada usuario real.
--
-- Antes de nada, verifica el esquema (no necesita usuarios de prueba):

select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'profiles_tipoDieta_check';
-- esperado: CHECK (("tipoDieta" = ANY (ARRAY['macros'::text, 'cerrada'::text])))

select policyname from pg_policies where tablename = 'profiles' order by policyname;
-- esperado: profiles_insert_self, profiles_select, profiles_update_self, profiles_update_trainer_managed

select tgname from pg_trigger where tgrelid = 'profiles'::regclass and not tgisinternal order by tgname;
-- esperado: profiles_role_change, profiles_tipo_dieta_guard

-- ---------------------------------------------------------------------
-- Para los escenarios 3/4/5: sustituye estos dos ids por dos cuentas de
-- prueba reales (auth.users.id) — una "cliente" y otra "entrenador" — y crea
-- (o verifica) un vínculo aceptado entre ellas:
--
--   update trainer_client_links set status = 'accepted'
--     where "trainerId" = '<entrenador_id>' and "clientId" = '<cliente_id>';
-- ---------------------------------------------------------------------

-- Escenario 3 (punto 19): cliente gestionado intenta cambiar su propio
-- tipoDieta -> debe fallar con "No puedes cambiar el tipo de nutrición: lo
-- gestiona tu entrenador".
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<cliente_id>"}';
  update profiles set "tipoDieta" = 'cerrada' where id = '<cliente_id>';
rollback;

-- Escenario 4: el entrenador vinculado cambia el tipoDieta del cliente ->
-- debe funcionar y afectar solo esas dos columnas.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<entrenador_id>"}';
  update profiles set "tipoDieta" = 'cerrada' where id = '<cliente_id>';
  select "tipoDieta" from profiles where id = '<cliente_id>'; -- esperado: 'cerrada'
rollback;

-- Escenario 5: un entrenador SIN vínculo con ese cliente intenta tocar su
-- perfil -> el UPDATE no debe afectar ninguna fila (RLS lo bloquea en
-- silencio, comportamiento estándar de Postgres RLS sin WITH CHECK que
-- lance error — confirmar con un SELECT posterior que el valor no cambió).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<otro_entrenador_sin_vinculo_id>"}';
  update profiles set "tipoDieta" = 'macros' where id = '<cliente_id>';
  select "tipoDieta" from profiles where id = '<cliente_id>'; -- esperado: sigue en 'cerrada', no cambió
rollback;
