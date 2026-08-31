-- Modelo de nutrición excluyente: profiles.tipoDieta pasa a ser la única
-- fuente de verdad de qué modalidad está activa ('macros' | 'cerrada'), y
-- se cierra quién puede cambiarlo y quién puede escribir el contenido:
--
--   - Un cliente SIN entrenador vinculado sigue gestionando su propio
--     tipoDieta y su propio contenido (macros / dieta cerrada) libremente.
--   - Un cliente CON entrenador vinculado (trainer_client_links.status =
--     'accepted') deja de poder tocar tipoDieta y el contenido nutricional
--     — pasa a ser de solo lectura para él, gestionado por su entrenador.
--   - El entrenador vinculado puede cambiar el tipoDieta de ese cliente y
--     escribir su contenido nutricional (macros o dieta cerrada), pero
--     nada más de su perfil (ni nombre, ni peso inicial, ni rol...).
--
-- Cambiar de modalidad NUNCA borra planes anteriores — nutrition_macro_plan
-- y nutrition_closed_diet_plan/_item conservan todo su histórico; tipoDieta
-- solo decide qué pantalla se muestra ahora. Ejecutar en el SQL Editor de
-- Supabase, en el proyecto compartido con Tracker.

-- ---------------------------------------------------------------------
-- 1. Renombrar el valor 'flexible' -> 'macros' (terminología definitiva).
--
-- IMPORTANTE: el nombre del constraint va ENTRE COMILLAS DOBLES ("...").
-- Postgres pliega a minúsculas cualquier identificador sin comillas; el
-- constraint real, generado automáticamente en 0004_dieta_cerrada.sql a
-- partir de la columna "tipoDieta" (con mayúsculas), se llama literalmente
-- profiles_tipoDieta_check con esa mayúscula — sin las comillas aquí,
-- `drop constraint if exists profiles_tipoDieta_check` busca en realidad
-- "profiles_tipodieta_check" (todo minúsculas), no encuentra nada, y
-- `IF EXISTS` lo deja pasar en silencio sin haber borrado el constraint
-- viejo. Verificado ejecutando esta migración contra una instancia Postgres
-- real (PGlite): sin las comillas, el UPDATE de abajo falla porque el
-- constraint antiguo (que solo permite 'flexible'/'cerrada') sigue activo.
-- ---------------------------------------------------------------------
alter table profiles drop constraint if exists "profiles_tipoDieta_check";
update profiles set "tipoDieta" = 'macros' where "tipoDieta" = 'flexible';
alter table profiles alter column "tipoDieta" set default 'macros';
alter table profiles add constraint "profiles_tipoDieta_check" check ("tipoDieta" in ('macros', 'cerrada'));

-- ---------------------------------------------------------------------
-- 2. profiles: el entrenador vinculado puede actualizar la fila de su
-- cliente, pero el trigger de abajo restringe ESE update a solo tocar
-- tipoDieta/dietaCerradaDistingueDias — nunca nombre, peso inicial, rol...
-- ---------------------------------------------------------------------
create policy "profiles_update_trainer_managed" on profiles for update using (
  exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = profiles.id and l.status = 'accepted'
  )
) with check (
  exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = profiles.id and l.status = 'accepted'
  )
);

-- Guarda de negocio para el cambio de tipoDieta/dietaCerradaDistingueDias,
-- válida tanto si el UPDATE llega por profiles_update_self (el propio
-- dueño) como por profiles_update_trainer_managed (el entrenador):
--   - El propio dueño NO puede tocar esas dos columnas si tiene un
--     entrenador vinculado y aceptado (las gestiona el entrenador).
--   - Cualquier otra cuenta que llegue aquí solo puede ser el entrenador
--     vinculado (es lo único que permiten las policies de UPDATE) y solo
--     puede tocar esas dos columnas — nada más del resto de la fila.
-- to_jsonb(new) - 'col' compara "todo lo demás sin esas columnas" sin
-- enumerar el resto de columnas de profiles, para no tener que tocar este
-- trigger si el esquema de profiles crece más adelante.
create or replace function handle_tipo_dieta_change()
returns trigger
language plpgsql
as $$
begin
  if (new."tipoDieta" is distinct from old."tipoDieta")
    or (new."dietaCerradaDistingueDias" is distinct from old."dietaCerradaDistingueDias") then
    if auth.uid() = old.id then
      if exists (select 1 from trainer_client_links l where l."clientId" = old.id and l.status = 'accepted') then
        raise exception 'No puedes cambiar el tipo de nutrición: lo gestiona tu entrenador';
      end if;
    else
      if not exists (
        select 1 from trainer_client_links l
        where l."trainerId" = auth.uid() and l."clientId" = old.id and l.status = 'accepted'
      ) then
        raise exception 'No tienes permiso para modificar este perfil';
      end if;
      if (to_jsonb(new) - 'tipoDieta' - 'dietaCerradaDistingueDias')
        is distinct from (to_jsonb(old) - 'tipoDieta' - 'dietaCerradaDistingueDias') then
        raise exception 'Un entrenador solo puede modificar el tipo de nutrición del cliente, no el resto del perfil';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_tipo_dieta_guard
  before update on profiles
  for each row execute function handle_tipo_dieta_change();

-- ---------------------------------------------------------------------
-- 3. Contenido nutricional: el entrenador vinculado gana escritura sobre
-- el plan/dieta del cliente (antes solo tenía SELECT); el cliente pierde
-- su propia escritura mientras tenga un entrenador vinculado y aceptado.
-- Sin entrenador, todo sigue exactamente igual que antes (self = self).
--
-- IMPORTANTE: USING y WITH CHECK llevan la MISMA expresión completa (con la
-- rama "and not exists(...)"), no una versión más permisiva en USING. Para
-- DELETE, Postgres solo evalúa USING (WITH CHECK no aplica a filas
-- borradas) — con un USING más laxo ("userId" = auth.uid() a secas, sin la
-- exclusión del cliente gestionado), un cliente con entrenador podría
-- BORRAR un plan que le escribió su entrenador aunque no pudiera editarlo.
-- Verificado ejecutando esta policy contra Postgres real: con USING laxo,
-- el DELETE del cliente gestionado pasaba; con USING igual a WITH CHECK,
-- se bloquea correctamente.
-- ---------------------------------------------------------------------
drop policy if exists "macroplan_write" on nutrition_macro_plan;
create policy "macroplan_write" on nutrition_macro_plan for all using (
  (
    "userId" = auth.uid()
    and not exists (select 1 from trainer_client_links l where l."clientId" = auth.uid() and l.status = 'accepted')
  )
  or exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = nutrition_macro_plan."userId" and l.status = 'accepted'
  )
) with check (
  (
    "userId" = auth.uid()
    and not exists (select 1 from trainer_client_links l where l."clientId" = auth.uid() and l.status = 'accepted')
  )
  or exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = nutrition_macro_plan."userId" and l.status = 'accepted'
  )
);

drop policy if exists "closed_diet_plan_write" on nutrition_closed_diet_plan;
create policy "closed_diet_plan_write" on nutrition_closed_diet_plan for all using (
  (
    "userId" = auth.uid()
    and not exists (select 1 from trainer_client_links l where l."clientId" = auth.uid() and l.status = 'accepted')
  )
  or exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = nutrition_closed_diet_plan."userId" and l.status = 'accepted'
  )
) with check (
  (
    "userId" = auth.uid()
    and not exists (select 1 from trainer_client_links l where l."clientId" = auth.uid() and l.status = 'accepted')
  )
  or exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = nutrition_closed_diet_plan."userId" and l.status = 'accepted'
  )
);

drop policy if exists "closed_diet_item_write" on nutrition_closed_diet_item;
create policy "closed_diet_item_write" on nutrition_closed_diet_item for all using (
  exists (
    select 1 from nutrition_closed_diet_plan p
    where p.id = nutrition_closed_diet_item."planId" and (
      (
        p."userId" = auth.uid()
        and not exists (select 1 from trainer_client_links l where l."clientId" = auth.uid() and l.status = 'accepted')
      )
      or exists (
        select 1 from trainer_client_links l
        where l."trainerId" = auth.uid() and l."clientId" = p."userId" and l.status = 'accepted'
      )
    )
  )
) with check (
  exists (
    select 1 from nutrition_closed_diet_plan p
    where p.id = nutrition_closed_diet_item."planId" and (
      (
        p."userId" = auth.uid()
        and not exists (select 1 from trainer_client_links l where l."clientId" = auth.uid() and l.status = 'accepted')
      )
      or exists (
        select 1 from trainer_client_links l
        where l."trainerId" = auth.uid() and l."clientId" = p."userId" and l.status = 'accepted'
      )
    )
  )
);
