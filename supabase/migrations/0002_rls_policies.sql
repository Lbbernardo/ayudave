-- Migración: políticas RLS para que la app funcione con la anon key.
--
-- CONTEXTO
-- La app de AyudaVE escribe y lee con la "anon key" desde el navegador
-- (formularios, matching automático, panel admin y vista /mi-ayuda).
-- Las tablas volunteers, donations y assignments tienen RLS activado pero
-- SIN políticas, así que bloquean todas las operaciones de anon. Esto rompe:
--   * el registro de voluntarios y donantes,
--   * la asignación automática (insertar en assignments / actualizar reports).
--
-- Esta migración deja esas tablas con el MISMO comportamiento abierto que ya
-- tiene `reports` en esta primera versión.
--
-- ⚠️  SEGURIDAD — LEER ANTES DE PRODUCCIÓN
-- Estas políticas son permisivas (cualquiera con la anon key puede leer/escribir,
-- incluidos teléfonos). Es aceptable para un lanzamiento de emergencia muy rápido,
-- PERO antes de un uso estable se debe endurecer:
--   * Mover lecturas/escrituras sensibles a un backend con service_role.
--   * Limitar SELECT público a columnas no sensibles (sin teléfono) vía vistas.
--   * Proteger el panel /admin con Supabase Auth.
-- Ver también el bloque de seguridad en supabase/schema.sql.
-- Es idempotente: se puede correr varias veces.

-- ---------------------------------------------------------------------
-- volunteers
-- ---------------------------------------------------------------------
alter table volunteers enable row level security;
drop policy if exists "volunteers_anon_all" on volunteers;
create policy "volunteers_anon_all" on volunteers
  for all to anon using (true) with check (true);

-- ---------------------------------------------------------------------
-- donations
-- ---------------------------------------------------------------------
alter table donations enable row level security;
drop policy if exists "donations_anon_all" on donations;
create policy "donations_anon_all" on donations
  for all to anon using (true) with check (true);

-- ---------------------------------------------------------------------
-- assignments
-- ---------------------------------------------------------------------
alter table assignments enable row level security;
drop policy if exists "assignments_anon_all" on assignments;
create policy "assignments_anon_all" on assignments
  for all to anon using (true) with check (true);

-- ---------------------------------------------------------------------
-- reports
-- Ya permitía INSERT y SELECT con anon, pero NO UPDATE/DELETE: por eso el
-- panel admin (cambiar estado) y la asignación automática (marcar el reporte
-- como 'asignado') fallaban en silencio (UPDATE afectaba 0 filas sin error).
-- Una política `for all` cubre también UPDATE y se suma a las existentes.
-- ---------------------------------------------------------------------
alter table reports enable row level security;
drop policy if exists "reports_anon_all" on reports;
create policy "reports_anon_all" on reports
  for all to anon using (true) with check (true);
