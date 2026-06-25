-- Esquema de base de datos de AyudaVE — SOS Venezuela
-- Ejecuta este archivo en el SQL Editor de Supabase.

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  state text,
  city text,
  address text,
  help_type text not null,
  urgency text not null default 'media',
  description text,
  people_count int default 1,
  latitude double precision,
  longitude double precision,
  status text not null default 'pendiente',
  is_public boolean default true,
  created_at timestamptz default now()
);

create table if not exists safe_reports (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  state text,
  city text,
  message text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz default now()
);

create table if not exists missing_people (
  id uuid primary key default gen_random_uuid(),
  missing_name text not null,
  last_known_location text,
  description text,
  contact_name text not null,
  contact_phone text,
  status text not null default 'buscando',
  created_at timestamptz default now()
);

create table if not exists volunteers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  state text,
  city text,
  skills text,
  has_vehicle boolean default false,
  availability text,
  status text not null default 'disponible',
  created_at timestamptz default now()
);

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text,
  phone text,
  donation_type text not null,
  description text,
  state text,
  city text,
  status text not null default 'pendiente',
  created_at timestamptz default now()
);

create table if not exists case_updates (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  note text not null,
  status text,
  created_at timestamptz default now()
);

-- =====================================================================
-- Seguridad (Row Level Security)
-- ---------------------------------------------------------------------
-- TODO: Antes de producción, habilitar RLS y definir políticas:
--   * INSERT público (anon) para que cualquiera pueda reportar.
--   * SELECT público limitado a columnas no sensibles (sin teléfono)
--     mediante vistas o políticas por columna.
--   * SELECT/UPDATE/DELETE completos solo para el rol admin autenticado.
--
-- Ejemplo de punto de partida (ajustar según necesidades):
--
-- alter table reports enable row level security;
-- create policy "reports_insert_anon" on reports for insert to anon with check (true);
-- create policy "reports_select_admin" on reports for select to authenticated using (true);
--
-- Para la primera versión de desarrollo se puede dejar RLS deshabilitado
-- usando la anon key, pero NO debe lanzarse así a producción.
-- =====================================================================

-- Índices útiles para los filtros del panel y el mapa.
create index if not exists idx_reports_status on reports (status);
create index if not exists idx_reports_urgency on reports (urgency);
create index if not exists idx_reports_created_at on reports (created_at desc);
create index if not exists idx_reports_geo on reports (latitude, longitude);
