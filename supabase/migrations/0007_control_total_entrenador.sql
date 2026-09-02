-- Control total del entrenador sobre la ficha del cliente vinculado (peso, medidas,
-- entrenamiento realizado y planificación de rutinas/ejercicios). Ejecutar en el SQL
-- Editor de Supabase, en el proyecto compartido con Tracker, DESPUÉS de 0001-0006.
--
-- Decisión de producto: modelo ADITIVO. El cliente conserva exactamente el acceso que
-- ya tenía (pegasus_owner_all, sin tocar) — el entrenador gana escritura ADEMÁS, nunca
-- se le quita nada al cliente. Pensado para revisiones presenciales entrenador-cliente.
--
-- Motivo por el que esto no funcionaba con solo una policy nueva: las 11 tablas de
-- Tracker tienen un trigger (pegasus_set_owner_and_timestamps, ver schema.sql) que en
-- cada INSERT fuerza user_id := auth.uid(), sin excepción. Sin tocar el trigger, una
-- fila creada por el entrenador quedaría atribuida a su propia cuenta, no a la del
-- cliente — el paso 1 de abajo es el que de verdad desbloquea todo lo demás.

-- ---------------------------------------------------------------------
-- 1. Trigger de ownership: permite que un entrenador con vínculo aceptado inserte una
-- fila atribuida al cliente (en vez de a sí mismo), sin abrir la puerta a que
-- cualquier autenticado se atribuya filas de otro. Comportamiento sin vínculo
-- aceptado: idéntico al de siempre (fuerza auth.uid()). Rama UPDATE sin cambios
-- (sigue sin poder "regalarse" una fila a otro usuario).
-- ---------------------------------------------------------------------
create or replace function pegasus_set_owner_and_timestamps()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    if new.user_id is distinct from auth.uid() then
      if exists (
        select 1 from trainer_client_links l
        where l."trainerId" = auth.uid() and l."clientId" = new.user_id and l.status = 'accepted'
      ) then
        -- entrenador con vínculo aceptado: se respeta el user_id enviado (el cliente)
        null;
      else
        new.user_id := auth.uid();
      end if;
    else
      new.user_id := auth.uid();
    end if;
    new.created_at := now();
    new.updated_at := now();
  elsif TG_OP = 'UPDATE' then
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. RLS aditiva en las 11 tablas de Tracker: sustituye las policies de SOLO LECTURA
-- de 0005 (trainer_read_client_training / trainer_read_body_weight) por una única
-- policy FOR ALL por tabla — lectura Y escritura para el entrenador vinculado,
-- siempre ADEMÁS de pegasus_owner_all (que no se toca, el cliente no pierde nada).
-- measurement_types/skinfold_sites no tenían ninguna policy de entrenador hasta
-- ahora (ni de lectura) — se crean aquí por primera vez.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'exercises', 'templates', 'measurement_types', 'skinfold_sites',
    'workouts', 'workout_exercises', 'sets', 'template_exercises',
    'body_weight', 'measurements', 'skinfold_entries'
  ]
  loop
    execute format('drop policy if exists trainer_read_client_training on %I;', t);
    execute format('drop policy if exists trainer_read_body_weight on %I;', t);
    execute format('drop policy if exists trainer_manage_client_training on %I;', t);
    execute format(
      'create policy trainer_manage_client_training on %I for all using (
         exists (
           select 1 from trainer_client_links l
           where l."trainerId" = auth.uid() and l."clientId" = %I.user_id and l.status = ''accepted''
         )
       ) with check (
         exists (
           select 1 from trainer_client_links l
           where l."trainerId" = auth.uid() and l."clientId" = %I.user_id and l.status = ''accepted''
         )
       );',
      t, t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. nutrition_measurement: la exclusividad de 0006 nunca llegó a esta tabla (seguía
-- siendo self-write-only). Se extiende ahora, en modo ADITIVO (no exclusivo como
-- macroplan_write) — coherente con la decisión de producto de esta migración.
-- ---------------------------------------------------------------------
drop policy if exists "measurement_write" on nutrition_measurement;
create policy "measurement_write" on nutrition_measurement for all using (
  "userId" = auth.uid() or exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = nutrition_measurement."userId" and l.status = 'accepted'
  )
) with check (
  "userId" = auth.uid() or exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = nutrition_measurement."userId" and l.status = 'accepted'
  )
);

-- ---------------------------------------------------------------------
-- 4. templates.assigned_by — puramente informativo (nullable, aditivo). Permite
-- distinguir en el futuro, tanto en Coach como algún día en Tracker, una rutina
-- creada por el propio cliente de una asignada por su entrenador. Tracker no lee
-- esta columna todavía — no se toca ningún fichero de Tracker en esta migración.
-- ---------------------------------------------------------------------
alter table templates add column if not exists assigned_by uuid references auth.users(id);
