-- Refugios y centros de acopio. Aparecen en el mapa con marcador diferente.
create table if not exists refugios (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null check (type in ('refugio', 'centro_acopio')),
  address       text,
  city          text,
  state         text,
  latitude      double precision,
  longitude     double precision,
  capacity      integer,
  contact_name  text,
  contact_phone text,
  notes         text,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

create index if not exists idx_refugios_type on refugios (type);
create index if not exists idx_refugios_state on refugios (state);

-- Acceso público de lectura/escritura (igual que reports en esta fase).
alter table refugios enable row level security;
drop policy if exists "refugios_anon_all" on refugios;
create policy "refugios_anon_all" on refugios
  for all to anon using (true) with check (true);
