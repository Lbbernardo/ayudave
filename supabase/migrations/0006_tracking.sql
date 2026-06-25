-- Migración: seguimiento de casos por enlace (para quien pide ayuda, sin login).
-- Idempotente. Solo agrega columnas.

-- Correo opcional de quien reporta (para enviarle el enlace de seguimiento).
alter table reports add column if not exists email text;

-- Token público de seguimiento. Se autogenera en cada reporte (incluye los
-- existentes). La persona ve su caso en /seguir/<token> sin iniciar sesión.
alter table reports add column if not exists tracking_token uuid default gen_random_uuid();
create index if not exists idx_reports_tracking on reports (tracking_token);
