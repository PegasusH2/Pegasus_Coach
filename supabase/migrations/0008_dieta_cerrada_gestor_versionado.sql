-- Sistema de gestión y versionado de Dieta Cerrada para el entrenador. Ejecutar en el
-- SQL Editor de Supabase, en el proyecto compartido con Tracker, DESPUÉS de 0001-0007.
--
-- No introduce ningún cálculo nutricional/macro/caloría — sigue siendo alimento +
-- cantidad + unidad, introducidos a mano por el entrenador (sin base de datos de
-- alimentos). Solo modela: unidad de cantidad, archivado, nombre opcional de la dieta,
-- y una biblioteca de plantillas reutilizables entre clientes ("Gestor de dietas").
--
-- El "versionado" en sí NO necesita una columna de número de versión: cada fila de
-- nutrition_closed_diet_plan ya es, desde el principio, una versión fechada (esto ya
-- existía) — el número de versión se calcula en el cliente por orden de fecha, nunca
-- se guarda. Lo que faltaba de verdad era que "Guardar cambios" dejara de sobrescribir
-- la fila existente — eso se corrige en código (DietaCerrada.tsx), no en el esquema.

-- ---------------------------------------------------------------------
-- 1. nutrition_closed_diet_plan: nombre opcional, archivado (sustituye tanto a
-- "archivar" como a "eliminar" del entrenador — ninguna de las dos borra nunca datos,
-- ver comentario en closedDietRepo.ts), motivo del cambio de esta versión.
-- ---------------------------------------------------------------------
alter table nutrition_closed_diet_plan add column if not exists nombre text;
alter table nutrition_closed_diet_plan add column if not exists archivada boolean not null default false;
alter table nutrition_closed_diet_plan add column if not exists "motivoCambio" text;

-- ---------------------------------------------------------------------
-- 2. nutrition_closed_diet_item: unidad de cantidad — "70 g", "1 unidad", etc. en vez
-- de gramos fijos. 'g' por defecto para no romper las filas ya existentes.
-- ---------------------------------------------------------------------
alter table nutrition_closed_diet_item add column if not exists unidad text not null default 'g';

-- ---------------------------------------------------------------------
-- 3. Gestor de dietas — biblioteca de plantillas reutilizables del ENTRENADOR (no de
-- un cliente concreto), para crear la dieta de un cliente nuevo a partir de una ya
-- guardada. Se guarda desde una dieta de cliente ("Guardar en gestor"), pero vive
-- desligada de ese cliente a partir de ahí — no es su historial, es aparte.
-- ---------------------------------------------------------------------
create table if not exists nutrition_closed_diet_template (
  id uuid primary key default gen_random_uuid(),
  "trainerId" uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  categoria text,
  descripcion text,
  "createdAt" timestamptz not null default now()
);
create index if not exists idx_closed_diet_template_trainer on nutrition_closed_diet_template("trainerId");

create table if not exists nutrition_closed_diet_template_item (
  id uuid primary key default gen_random_uuid(),
  "templateId" uuid not null references nutrition_closed_diet_template(id) on delete cascade,
  "diaTipo" text not null default 'unico' check ("diaTipo" in ('on', 'off', 'unico')),
  momento text,
  alimento text not null,
  cantidad double precision not null,
  unidad text not null default 'g',
  orden integer not null default 0
);
create index if not exists idx_closed_diet_template_item_template on nutrition_closed_diet_template_item("templateId");

alter table nutrition_closed_diet_template enable row level security;
alter table nutrition_closed_diet_template_item enable row level security;

-- Propiedad exclusiva del entrenador que la creó — es su biblioteca personal, no se
-- comparte entre entrenadores ni con clientes.
create policy "closed_diet_template_all" on nutrition_closed_diet_template for all using (
  "trainerId" = auth.uid()
) with check (
  "trainerId" = auth.uid()
);

create policy "closed_diet_template_item_all" on nutrition_closed_diet_template_item for all using (
  exists (select 1 from nutrition_closed_diet_template t where t.id = nutrition_closed_diet_template_item."templateId" and t."trainerId" = auth.uid())
) with check (
  exists (select 1 from nutrition_closed_diet_template t where t.id = nutrition_closed_diet_template_item."templateId" and t."trainerId" = auth.uid())
);
