-- Centro de control del entrenador: email en profiles (para listar/buscar
-- clientes), revisiones, pagos, y lectura (nunca escritura) del entrenamiento
-- real del cliente en las tablas de Pegasus Tracker. Ejecutar en el SQL
-- Editor de Supabase, en el proyecto compartido con Tracker.

-- ---------------------------------------------------------------------
-- profiles.email — denormalizado desde auth.users (no accesible en bloque
-- desde el cliente) para poder listar/buscar clientes por email.
-- ---------------------------------------------------------------------
alter table profiles add column if not exists email text;
update profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

-- ---------------------------------------------------------------------
-- nutrition_review — el entrenador programa y hace seguimiento de
-- revisiones de sus clientes. Se marca a mano (Pendiente/Recibida/
-- Revisada) desde Nutrition; el botón "Solicitar revisión" en Tracker
-- (para que el cliente la dispare) queda para más adelante.
-- ---------------------------------------------------------------------
create table if not exists nutrition_review (
  id uuid primary key default gen_random_uuid(),
  "trainerId" uuid not null references auth.users(id) on delete cascade,
  "clientId" uuid not null references auth.users(id) on delete cascade,
  "fechaProgramada" date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'recibida', 'revisada')),
  "fechaRecepcion" date,
  notas text,
  "createdAt" timestamptz not null default now()
);
create index if not exists idx_review_trainer on nutrition_review("trainerId");
create index if not exists idx_review_client on nutrition_review("clientId");

alter table nutrition_review enable row level security;
create policy "review_select" on nutrition_review for select using (
  "trainerId" = auth.uid() or "clientId" = auth.uid()
);
create policy "review_write" on nutrition_review for all using ("trainerId" = auth.uid()) with check ("trainerId" = auth.uid());

-- ---------------------------------------------------------------------
-- nutrition_payment — registro manual de pagos por parte del entrenador.
-- NO gestiona cobros: solo constancia de estado/importe/fechas. Cada fila
-- es un pago/periodo; el historial es la lista completa por linkId. Deja
-- preparados los campos para una futura integración externa (Stripe,
-- PayPal...) sin tener que rehacer el modelo.
-- ---------------------------------------------------------------------
create table if not exists nutrition_payment (
  id uuid primary key default gen_random_uuid(),
  "linkId" uuid not null references trainer_client_links(id) on delete cascade,
  "trainerId" uuid not null references auth.users(id) on delete cascade,
  "clientId" uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('paid', 'pending')),
  source text not null default 'manual' check (source in ('manual', 'external')),
  amount numeric,
  "paymentDate" date,
  "nextPaymentDate" date,
  "externalProvider" text,
  "externalPaymentId" text,
  notes text,
  "createdAt" timestamptz not null default now()
);
create index if not exists idx_payment_link on nutrition_payment("linkId");
create index if not exists idx_payment_trainer on nutrition_payment("trainerId");

alter table nutrition_payment enable row level security;
create policy "payment_select" on nutrition_payment for select using (
  "trainerId" = auth.uid() or "clientId" = auth.uid()
);
create policy "payment_write" on nutrition_payment for all using ("trainerId" = auth.uid()) with check ("trainerId" = auth.uid());

-- ---------------------------------------------------------------------
-- Lectura (SOLO lectura) para el entrenador sobre el entrenamiento real
-- del cliente en las tablas de Pegasus Tracker. Aditivo: no toca ninguna
-- policy existente de esas tablas (siguen siendo de un solo dueño para
-- escritura). Mismo espíritu que trainer_read_body_weight, comentada en
-- 0001_nutrition_schema.sql pero nunca ejecutada.
-- ---------------------------------------------------------------------
create policy "trainer_read_client_training" on workouts for select using (
  exists (select 1 from trainer_client_links l where l."trainerId" = auth.uid() and l."clientId" = workouts.user_id and l.status = 'accepted')
);
create policy "trainer_read_client_training" on workout_exercises for select using (
  exists (select 1 from trainer_client_links l where l."trainerId" = auth.uid() and l."clientId" = workout_exercises.user_id and l.status = 'accepted')
);
create policy "trainer_read_client_training" on sets for select using (
  exists (select 1 from trainer_client_links l where l."trainerId" = auth.uid() and l."clientId" = sets.user_id and l.status = 'accepted')
);
create policy "trainer_read_client_training" on templates for select using (
  exists (select 1 from trainer_client_links l where l."trainerId" = auth.uid() and l."clientId" = templates.user_id and l.status = 'accepted')
);
create policy "trainer_read_client_training" on template_exercises for select using (
  exists (select 1 from trainer_client_links l where l."trainerId" = auth.uid() and l."clientId" = template_exercises.user_id and l.status = 'accepted')
);
create policy "trainer_read_client_training" on exercises for select using (
  exists (select 1 from trainer_client_links l where l."trainerId" = auth.uid() and l."clientId" = exercises.user_id and l.status = 'accepted')
);

-- ---------------------------------------------------------------------
-- Lectura del peso del cliente para el entrenador. Ya estaba diseñada
-- (comentada) en 0001_nutrition_schema.sql pero nunca se ejecutó — el
-- dashboard la necesita de verdad (última actividad real, sparkline de
-- peso), así que se activa ahora. Aditiva: no toca la escritura.
-- ---------------------------------------------------------------------
create policy "trainer_read_body_weight" on body_weight for select using (
  exists (select 1 from trainer_client_links l where l."trainerId" = auth.uid() and l."clientId" = body_weight.user_id and l.status = 'accepted')
);
