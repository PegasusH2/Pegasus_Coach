-- Calendario: agenda de revisiones presenciales y entrenos. Se reutiliza por
-- completo la tabla nutrition_review (fecha programada, estado, notas, RLS,
-- CRUD ya existentes) en vez de crear un sistema de citas aparte — solo se
-- añade una columna para distinguir qué tipo de evento es cada fila. Aditivo:
-- default 'revision' para que las filas ya existentes conserven su
-- significado actual sin ningún cambio de comportamiento.

alter table nutrition_review add column if not exists tipo text not null default 'revision' check (tipo in ('revision', 'entreno'));
