-- Rediseño de Ajustes: centro de configuración del entrenador. Ver conversación
-- para el contexto completo. Tres piezas nuevas, todas aditivas:
--   1. Campos nuevos en profiles (perfil público del entrenador + visibilidad).
--   2. trainer_settings — singleton 1:1 con el entrenador (mismo patrón de PK
--      que profiles), agrupa servicio/precios/entrenamiento/nutrición/
--      seguimiento/preferencias. Sin JSON: columnas tipadas, igual que el
--      resto del esquema.
--   3. trainer_service_prices — catálogo de servicios del entrenador (lista,
--      no una fila fija, para que "otros servicios" no necesite una columna
--      por tipo).
--   4. trainer_client_links: 2 columnas nullable de override por cliente
--      (precio e intervalo de revisión), + un trigger que las deja escribir
--      sin chocar con las reglas ya existentes de status.
--
-- Ejecutar en el SQL Editor de Supabase, en el proyecto compartido con Tracker.

-- ---------------------------------------------------------------------
-- 1. profiles: perfil público del entrenador + visibilidad de cara al
-- cliente. Los edita siempre el propio dueño (profiles_update_self) — no
-- hace falta tocar ningún trigger/policy existente, no interfieren con
-- tipoDieta/dietaCerradaDistingueDias (profiles_tipo_dieta_guard).
-- ---------------------------------------------------------------------
alter table profiles add column if not exists apellidos text;
alter table profiles add column if not exists "nombreProfesional" text;
alter table profiles add column if not exists telefono text;
alter table profiles add column if not exists ciudad text;
alter table profiles add column if not exists pais text;
alter table profiles add column if not exists especialidad text;
alter table profiles add column if not exists biografia text;

-- Qué ve el cliente del perfil de su entrenador — sin consumidor todavía
-- (no existe hoy ninguna pantalla donde un cliente vea esto), se guarda
-- listo para cuando exista.
alter table profiles add column if not exists "perfilVisibleNombreProfesional" boolean not null default true;
alter table profiles add column if not exists "perfilVisibleEspecialidad" boolean not null default true;
alter table profiles add column if not exists "perfilVisibleBiografia" boolean not null default true;
alter table profiles add column if not exists "perfilVisibleTelefono" boolean not null default false;
alter table profiles add column if not exists "perfilVisibleEmail" boolean not null default false;

-- ---------------------------------------------------------------------
-- 2. trainer_settings — un entrenador, una fila. Política calcada de
-- "closed_diet_template_all" (propietario único, sin cliente involucrado).
-- ---------------------------------------------------------------------
create table if not exists trainer_settings (
  id uuid primary key references auth.users(id) on delete cascade,

  -- Servicio / revisiones
  "reviewIntervalDays" integer not null default 30,
  "reviewDefaultWeekday" integer, -- 0=domingo … 6=sábado, null = sin preferencia
  "reviewReminderDaysBefore" integer not null default 2,
  "inactivityDays" integer not null default 7,
  "attentionDays" integer not null default 14,
  "prolongedInactivityDays" integer not null default 30,

  -- Precios (config global — no automatiza cobros, no existe esa infraestructura)
  currency text not null default 'EUR',
  "paymentGraceDays" integer,
  "showPaymentStatus" boolean not null default true,

  -- Entrenamiento (preferencias que prellenan la Planificación en Coach —
  -- no cambian el esquema ni la ejecución de Pegasus Tracker)
  "weightUnit" text not null default 'kg' check ("weightUnit" in ('kg', 'lb')),
  "distanceUnit" text not null default 'km' check ("distanceUnit" in ('km', 'mi')),
  "useRir" boolean not null default true,
  "useRpe" boolean not null default false,
  "defaultRestSeconds" integer default 90,

  -- Nutrición (tipoDieta sigue siendo 100% por cliente en profiles — esto
  -- solo sugiere el valor inicial al vincular un cliente nuevo)
  "nutritionEnabled" boolean not null default true,
  "defaultTipoDieta" text not null default 'macros' check ("defaultTipoDieta" in ('macros', 'cerrada')),

  -- Seguimiento: medidas a pedir en una revisión
  "trackWeight" boolean not null default true,
  "trackHeight" boolean not null default true,
  "trackWaist" boolean not null default true,
  "trackHip" boolean not null default true,
  "trackChest" boolean not null default true,
  "trackArm" boolean not null default true,
  "trackLeg" boolean not null default true,

  -- Seguimiento: qué secciones de "progreso" mostrar (fotos/rendimiento
  -- todavía no existen como feature — se guarda listo para cuando exista)
  "progressWeight" boolean not null default true,
  "progressPhotos" boolean not null default true,
  "progressMeasurements" boolean not null default true,
  "progressPerformance" boolean not null default true,
  "progressAdherence" boolean not null default true,
  "progressTrainerNotes" boolean not null default true,

  -- Preferencias
  "startScreen" text not null default 'inicio' check ("startScreen" in ('inicio', 'clientes', 'calendario')),
  "dateFormat" text not null default 'dd/mm/yyyy',
  "exportFormat" text not null default 'json' check ("exportFormat" in ('json', 'csv')),

  "updatedAt" timestamptz not null default now()
);

alter table trainer_settings enable row level security;
drop policy if exists "trainer_settings_all" on trainer_settings;
create policy "trainer_settings_all" on trainer_settings for all using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. trainer_service_prices — catálogo de servicios del entrenador.
-- ---------------------------------------------------------------------
create table if not exists trainer_service_prices (
  id uuid primary key default gen_random_uuid(),
  "trainerId" uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('mensual', 'alta', 'revision_individual', 'sesion_individual', 'plan_nutricional', 'otro')),
  nombre text,
  precio numeric,
  periodicidad text check (periodicidad in ('mensual', 'trimestral', 'anual')),
  activo boolean not null default true,
  "sortOrder" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table trainer_service_prices enable row level security;
drop policy if exists "service_prices_all" on trainer_service_prices;
create policy "service_prices_all" on trainer_service_prices for all using ("trainerId" = auth.uid()) with check ("trainerId" = auth.uid());

-- ---------------------------------------------------------------------
-- 4. trainer_client_links: override de precio/intervalo por cliente.
-- ---------------------------------------------------------------------
alter table trainer_client_links add column if not exists "reviewIntervalDaysOverride" integer;
alter table trainer_client_links add column if not exists "standardPriceOverride" numeric;

-- La policy "links_update" (ver 0001 + 0012) exige, cuando el actor es el
-- entrenador, que el status RESULTANTE sea 'revoked'/'pending' — eso
-- bloquearía escribir estos 2 overrides en un vínculo 'accepted' (el caso
-- normal de un cliente activo, donde SÍ queremos que status siga
-- 'accepted'). Se relaja la policy para permitir también 'accepted' como
-- resultado del entrenador, y se traslada a un trigger (mismo patrón que
-- profiles_tipo_dieta_guard, 0006) la restricción fina que el WITH CHECK ya
-- no puede expresar por sí solo (comparar status ANTES vs DESPUÉS):
--   - El entrenador NUNCA puede hacer que status pase A 'accepted' si no lo
--     era ya (eso solo lo decide el cliente — invariante que antes garantizaba
--     la propia policy al no incluir 'accepted' entre los valores permitidos).
--   - Si el vínculo YA estaba 'accepted' y sigue 'accepted', el entrenador
--     solo puede tocar los 2 overrides — nada más de la fila.
-- Las demás transiciones (revoked/pending en cualquier combinación) quedan
-- exactamente igual que hasta ahora: sin restricción de qué otras columnas
-- cambian (p.ej. requestAccess ya reescribe clientEmailAtInvite/respondedAt
-- a la vez que status pasa a 'pending').
drop policy if exists "links_update" on trainer_client_links;
create policy "links_update" on trainer_client_links for update using (
  "clientId" = auth.uid() or "trainerId" = auth.uid()
) with check (
  "clientId" = auth.uid() or "trainerId" = auth.uid()
);

create or replace function handle_link_overrides_change()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = new."trainerId" then
    if new.status = 'accepted' and old.status is distinct from 'accepted' then
      raise exception 'El entrenador no puede aceptar un vínculo — debe hacerlo el cliente';
    end if;
    if old.status = 'accepted' and new.status = 'accepted' then
      if (to_jsonb(new) - 'reviewIntervalDaysOverride' - 'standardPriceOverride')
        is distinct from (to_jsonb(old) - 'reviewIntervalDaysOverride' - 'standardPriceOverride') then
        raise exception 'Un entrenador solo puede modificar el override de precio/intervalo de un vínculo activo, no su estado ni el resto de columnas';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trainer_client_links_overrides_guard on trainer_client_links;
create trigger trainer_client_links_overrides_guard
  before update on trainer_client_links
  for each row execute function handle_link_overrides_change();
