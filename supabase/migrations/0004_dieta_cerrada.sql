-- Añade la modalidad "dieta cerrada" (lista de alimentos + gramos, sin macros)
-- como alternativa a la dieta flexible por macronutrientes. Es un ajuste de
-- cuenta (profiles.tipoDieta): las dos modalidades no se muestran a la vez,
-- pero sus datos conviven en la BD — cambiar el tipo solo cambia qué pantalla
-- se ve. Ejecutar en el SQL Editor de Supabase.

alter table profiles add column if not exists "tipoDieta" text not null default 'flexible'
  check ("tipoDieta" in ('flexible', 'cerrada'));
alter table profiles add column if not exists "dietaCerradaDistingueDias" boolean not null default false;

-- ---------------------------------------------------------------------
-- nutrition_closed_diet_plan / nutrition_closed_diet_item — mismo patrón
-- plan+detalle que nutrition_mesociclo/nutrition_semana: el detalle no
-- guarda userId propio, la RLS de escritura/lectura pasa por el plan.
-- ---------------------------------------------------------------------
create table if not exists nutrition_closed_diet_plan (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  "semanaId" uuid references nutrition_semana(id) on delete set null,
  notas text
);
create index if not exists idx_closed_diet_plan_user_fecha on nutrition_closed_diet_plan("userId", fecha);

-- diaTipo = 'unico' cuando la cuenta no distingue Día ON/OFF para su dieta cerrada.
create table if not exists nutrition_closed_diet_item (
  id uuid primary key default gen_random_uuid(),
  "planId" uuid not null references nutrition_closed_diet_plan(id) on delete cascade,
  "diaTipo" text not null default 'unico' check ("diaTipo" in ('on', 'off', 'unico')),
  momento text,
  alimento text not null,
  gramos double precision not null,
  orden integer not null default 0
);
create index if not exists idx_closed_diet_item_plan on nutrition_closed_diet_item("planId");

alter table nutrition_closed_diet_plan enable row level security;
alter table nutrition_closed_diet_item enable row level security;

create policy "closed_diet_plan_select" on nutrition_closed_diet_plan for select using (
  "userId" = auth.uid() or exists (
    select 1 from trainer_client_links l
    where l."trainerId" = auth.uid() and l."clientId" = nutrition_closed_diet_plan."userId" and l.status = 'accepted'
  )
);
create policy "closed_diet_plan_write" on nutrition_closed_diet_plan for all using ("userId" = auth.uid()) with check ("userId" = auth.uid());

create policy "closed_diet_item_select" on nutrition_closed_diet_item for select using (
  exists (
    select 1 from nutrition_closed_diet_plan p where p.id = nutrition_closed_diet_item."planId" and (
      p."userId" = auth.uid() or exists (
        select 1 from trainer_client_links l
        where l."trainerId" = auth.uid() and l."clientId" = p."userId" and l.status = 'accepted'
      )
    )
  )
);
create policy "closed_diet_item_write" on nutrition_closed_diet_item for all using (
  exists (select 1 from nutrition_closed_diet_plan p where p.id = nutrition_closed_diet_item."planId" and p."userId" = auth.uid())
) with check (
  exists (select 1 from nutrition_closed_diet_plan p where p.id = nutrition_closed_diet_item."planId" and p."userId" = auth.uid())
);
