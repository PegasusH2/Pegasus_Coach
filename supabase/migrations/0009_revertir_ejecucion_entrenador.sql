-- Simplificación funcional de Coach: el entrenador PLANIFICA y CONSULTA el
-- entrenamiento del cliente, pero ya no MODIFICA la ejecución que el propio
-- cliente registra en Pegasus Tracker (peso/reps/RIR/series hechas, crear o
-- borrar entrenamientos). Ejecutar en el SQL Editor de Supabase, en el
-- proyecto compartido con Tracker.
--
-- 0007_control_total_entrenador.sql concedió, en un mismo bucle, escritura
-- aditiva sobre 11 tablas de Tracker a la vez (planificación, progreso Y
-- ejecución). Esta migración retira ÚNICAMENTE la parte de ejecución
-- (workouts/workout_exercises/sets), sustituyéndola por una policy de SOLO
-- LECTURA — el mismo patrón "trainer_read_client_training" que ya existía
-- (de solo lectura) en 0005_dashboard_entrenador.sql antes del "control
-- total". El resto de 0007 sigue intacto sin tocarlo:
--   - Planificación (templates/template_exercises/exercises): el entrenador
--     conserva escritura completa — es la función que Coach sí debe cubrir.
--   - Progreso (body_weight/measurements/skinfold_sites/skinfold_entries):
--     el entrenador conserva escritura completa — pertenece a Coach.
--
-- No se toca `pegasus_set_owner_and_timestamps()` (el trigger de ownership):
-- es compartido por las 11 tablas y sigue siendo necesario para las que sí
-- conservan escritura del entrenador. Sin una policy de INSERT/UPDATE/DELETE
-- para el entrenador en workouts/workout_exercises/sets, cualquier intento
-- de escritura suya sobre esas 3 tablas queda bloqueado por RLS
-- independientemente de lo que haga el trigger.

drop policy if exists "trainer_manage_client_training" on workouts;
drop policy if exists "trainer_manage_client_training" on workout_exercises;
drop policy if exists "trainer_manage_client_training" on sets;

create policy "trainer_read_client_training" on workouts for select using (
  exists (select 1 from trainer_client_links l where l."trainerId" = auth.uid() and l."clientId" = workouts.user_id and l.status = 'accepted')
);
create policy "trainer_read_client_training" on workout_exercises for select using (
  exists (select 1 from trainer_client_links l where l."trainerId" = auth.uid() and l."clientId" = workout_exercises.user_id and l.status = 'accepted')
);
create policy "trainer_read_client_training" on sets for select using (
  exists (select 1 from trainer_client_links l where l."trainerId" = auth.uid() and l."clientId" = sets.user_id and l.status = 'accepted')
);
