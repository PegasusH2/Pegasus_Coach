-- Identidad básica del perfil, para la ficha de usuario rediseñada:
-- fecha de nacimiento (-> edad, SIEMPRE calculada en el cliente, nunca
-- almacenada), altura en cm (-> IMC calculado) y sexo. Aditiva y nullable,
-- mismo patrón que pesoInicial/fechaInicio: autoeditable por el propio
-- dueño de la fila, la policy profiles_update_self ya vigente cubre estas
-- columnas nuevas sin cambios de RLS.

alter table profiles add column if not exists "fechaNacimiento" date;
alter table profiles add column if not exists altura numeric;
alter table profiles add column if not exists sexo text
  check (sexo in ('mujer', 'hombre', 'otro', 'prefiero_no_decir'));
