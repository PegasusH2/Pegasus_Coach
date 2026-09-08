-- Permite al entrenador reabrir (pending) un vínculo que él mismo revocó antes,
-- en vez de quedar bloqueado para siempre por la restricción unique(trainerId,
-- clientId) de trainer_client_links: revokeLink nunca borra la fila (solo pone
-- status='revoked'), así que un segundo intento de requestAccess siempre
-- chocaba con esa fila al intentar un INSERT nuevo.
--
-- La policy links_update de 0001_nutrition_schema.sql solo dejaba al
-- entrenador mover una fila A 'revoked' (nunca a 'pending') — sin este cambio,
-- ni siquiera reescribiendo requestAccess para hacer UPDATE en vez de INSERT
-- se podría reabrir la solicitud. El entrenador SIGUE sin poder poner
-- status='accepted' por su cuenta (eso solo lo decide el cliente, vía
-- clientId = auth.uid(), sin cambios aquí) — solo se añade 'pending' a la
-- lista de estados que el entrenador puede escribir.

drop policy if exists "links_update" on trainer_client_links;
create policy "links_update" on trainer_client_links for update using (
  "clientId" = auth.uid() or "trainerId" = auth.uid()
) with check (
  "clientId" = auth.uid() or ("trainerId" = auth.uid() and status in ('revoked', 'pending'))
);
