-- Centros de acopio fuera de Venezuela.
-- Lista pública, sin relación con el mapa interno.

create table if not exists centros_exterior (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  organization text,
  country      text not null,
  city         text not null,
  address      text,
  phone        text,
  email        text,
  website      text,
  schedule     text,
  notes        text,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

create index if not exists idx_centros_exterior_country on centros_exterior (country);

alter table centros_exterior enable row level security;
drop policy if exists "centros_exterior_anon_all" on centros_exterior;
create policy "centros_exterior_anon_all" on centros_exterior
  for all to anon using (true) with check (true);
