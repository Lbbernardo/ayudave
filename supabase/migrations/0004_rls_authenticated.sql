-- Migración: extender las políticas RLS al rol `authenticated`.
--
-- PROBLEMA: las políticas de 0002 estaban definidas solo `to anon`. Cuando un
-- usuario inicia sesión, sus peticiones usan el rol `authenticated`, que NO
-- tenía política → Supabase respondía 403 (p. ej. al registrarse como
-- voluntario estando logueado).
--
-- SOLUCIÓN: recrear las políticas para que apliquen a `anon` Y `authenticated`.
-- Mantiene la misma postura abierta de esta primera versión.
-- (El cierre de seguridad fino —esconder teléfonos, etc.— sigue pendiente.)
-- Idempotente.

-- volunteers
drop policy if exists "volunteers_anon_all" on volunteers;
drop policy if exists "volunteers_all" on volunteers;
create policy "volunteers_all" on volunteers
  for all to anon, authenticated using (true) with check (true);

-- donations
drop policy if exists "donations_anon_all" on donations;
drop policy if exists "donations_all" on donations;
create policy "donations_all" on donations
  for all to anon, authenticated using (true) with check (true);

-- assignments
drop policy if exists "assignments_anon_all" on assignments;
drop policy if exists "assignments_all" on assignments;
create policy "assignments_all" on assignments
  for all to anon, authenticated using (true) with check (true);

-- reports
drop policy if exists "reports_anon_all" on reports;
drop policy if exists "reports_all" on reports;
create policy "reports_all" on reports
  for all to anon, authenticated using (true) with check (true);
