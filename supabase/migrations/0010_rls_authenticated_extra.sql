-- Migración: extender al rol `authenticated` las políticas de las tablas
-- creadas después de 0004 (refugios, missing_people, safe_reports,
-- centros_exterior).
--
-- MISMO PROBLEMA que 0004: las políticas estaban definidas solo `to anon`.
-- Cuando un usuario inicia sesión (magic link del portal), sus peticiones
-- usan el rol `authenticated`, que NO tenía política → 403.
-- Ejemplo real: subir una foto en "Buscar familiar" estando logueado fallaba
-- con 403 al insertar en missing_people.
--
-- SOLUCIÓN: recrear las políticas para `anon` Y `authenticated`. Idempotente.

-- refugios (0007)
drop policy if exists "refugios_anon_all" on refugios;
drop policy if exists "refugios_all" on refugios;
create policy "refugios_all" on refugios
  for all to anon, authenticated using (true) with check (true);

-- missing_people (0008)
drop policy if exists "missing_anon_all" on missing_people;
drop policy if exists "missing_all" on missing_people;
create policy "missing_all" on missing_people
  for all to anon, authenticated using (true) with check (true);

-- safe_reports (0008)
drop policy if exists "safe_anon_all" on safe_reports;
drop policy if exists "safe_all" on safe_reports;
create policy "safe_all" on safe_reports
  for all to anon, authenticated using (true) with check (true);

-- centros_exterior (0009)
drop policy if exists "centros_exterior_anon_all" on centros_exterior;
drop policy if exists "centros_exterior_all" on centros_exterior;
create policy "centros_exterior_all" on centros_exterior
  for all to anon, authenticated using (true) with check (true);

-- Storage: asegurar que subir/leer fotos funciona para ambos roles.
drop policy if exists "fotos_select" on storage.objects;
create policy "fotos_select" on storage.objects
  for select to anon, authenticated using (bucket_id = 'fotos');

drop policy if exists "fotos_insert" on storage.objects;
create policy "fotos_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'fotos');
