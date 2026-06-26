-- Agrega ubicación y foto a missing_people, y crea bucket de fotos.

alter table missing_people
  add column if not exists latitude      double precision,
  add column if not exists longitude     double precision,
  add column if not exists city          text,
  add column if not exists state         text,
  add column if not exists photo_url     text;

-- RLS para missing_people (faltaba).
alter table missing_people enable row level security;
drop policy if exists "missing_anon_all" on missing_people;
create policy "missing_anon_all" on missing_people
  for all to anon using (true) with check (true);

-- RLS para safe_reports (faltaba).
alter table safe_reports enable row level security;
drop policy if exists "safe_anon_all" on safe_reports;
create policy "safe_anon_all" on safe_reports
  for all to anon using (true) with check (true);

-- Bucket público para fotos de personas buscadas.
insert into storage.buckets (id, name, public)
  values ('fotos', 'fotos', true)
  on conflict (id) do nothing;

-- Políticas de storage: lectura pública, escritura con anon key.
drop policy if exists "fotos_select" on storage.objects;
create policy "fotos_select" on storage.objects
  for select using (bucket_id = 'fotos');

drop policy if exists "fotos_insert" on storage.objects;
create policy "fotos_insert" on storage.objects
  for insert with check (bucket_id = 'fotos');
