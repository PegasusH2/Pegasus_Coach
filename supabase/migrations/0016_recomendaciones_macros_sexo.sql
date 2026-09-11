-- Checkbox "Aplicar recomendaciones de macros según sexo" en la configuración de
-- macros (MacrosFlexibles.tsx) — muestra u oculta una leyenda puramente informativa,
-- no cambia ningún cálculo. Preferencia del entrenador (no del cliente ni del plan:
-- es él quien decide si quiere ver esa ayuda mientras configura macros), así que vive
-- en trainer_settings, igual que el resto de columnas de esa tabla — no se crea
-- ninguna tabla ni mecanismo de configuración nuevo.
--
-- Ejecutar en el SQL Editor de Supabase, en el proyecto compartido con Tracker.

alter table trainer_settings add column if not exists "mostrarRecomendacionesMacrosPorSexo" boolean not null default false;
