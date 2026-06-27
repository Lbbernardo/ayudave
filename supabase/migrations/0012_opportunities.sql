-- ============================================================================
-- AyudaVE — Sistema de oportunidades de ayuda (estilo "Amazon Flex" solidario)
-- ----------------------------------------------------------------------------
-- 100% ADITIVO y seguro para producción:
--   * Solo CREATE TABLE IF NOT EXISTS y ALTER TABLE ADD COLUMN IF NOT EXISTS.
--   * No borra ni renombra nada. No toca reports/volunteers/donations existentes
--     (solo agrega columnas opcionales a volunteers).
-- ============================================================================

-- ── Centros de acopio (con aprobación + clave de acceso) ───────────────────
create table if not exists collection_centers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  manager_name  text,
  phone         text,
  email         text,
  state         text,
  city          text,
  address       text,
  latitude      double precision,
  longitude     double precision,
  schedule      text,
  description   text,
  access_code   text,
  status        text default 'pendiente_aprobacion', -- pendiente_aprobacion | aprobado | rechazado
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_centers_status on collection_centers (status);

-- ── Casos de ayuda (individual / grupo / centro) ───────────────────────────
create table if not exists help_cases (
  id              uuid primary key default gen_random_uuid(),
  case_type       text default 'individual', -- individual | group | center
  center_id       uuid references collection_centers(id) on delete set null,
  requester_name  text,
  requester_phone text,
  state           text,
  city            text,
  address         text,
  latitude        double precision,
  longitude       double precision,
  description     text,
  urgency         text default 'media',
  status          text default 'abierto', -- abierto | cerrado | cancelado
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_cases_status on help_cases (status);
create index if not exists idx_cases_city on help_cases (city);

-- ── Necesidades dentro de un caso (cada una = una oportunidad) ──────────────
create table if not exists help_needs (
  id                 uuid primary key default gen_random_uuid(),
  case_id            uuid references help_cases(id) on delete cascade,
  need_type          text not null,
  title              text not null,
  description        text,
  quantity_needed    int default 1,
  quantity_claimed   int default 0,
  quantity_completed int default 0,
  unit               text default 'personas',
  urgency            text default 'media',
  status             text default 'abierta', -- abierta | llena | completada | cancelada
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
create index if not exists idx_needs_case on help_needs (case_id);
create index if not exists idx_needs_status on help_needs (status);
create index if not exists idx_needs_type on help_needs (need_type);

-- ── Cupos tomados por voluntarios ──────────────────────────────────────────
create table if not exists help_claims (
  id              uuid primary key default gen_random_uuid(),
  need_id         uuid references help_needs(id) on delete cascade,
  volunteer_id    uuid,
  volunteer_name  text,
  volunteer_phone text,
  status          text default 'reservado', -- reservado | confirmado | en_camino | completado | cancelado | no_asistio
  claimed_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_claims_need on help_claims (need_id);
create index if not exists idx_claims_phone on help_claims (volunteer_phone);
-- Evita doble reserva activa del mismo teléfono en la misma necesidad.
create unique index if not exists uq_active_claim
  on help_claims (need_id, volunteer_phone)
  where status not in ('cancelado', 'no_asistio');

-- ── Capacidades de voluntarios (booleanas) ─────────────────────────────────
alter table volunteers add column if not exists can_cook              boolean default false;
alter table volunteers add column if not exists can_first_aid         boolean default false;
alter table volunteers add column if not exists is_nurse              boolean default false;
alter table volunteers add column if not exists is_doctor             boolean default false;
alter table volunteers add column if not exists has_truck             boolean default false;
alter table volunteers add column if not exists has_tools             boolean default false;
alter table volunteers add column if not exists can_remove_debris     boolean default false;
alter table volunteers add column if not exists can_load_boxes        boolean default false;
alter table volunteers add column if not exists can_sort_donations    boolean default false;
alter table volunteers add column if not exists can_distribute_food   boolean default false;
alter table volunteers add column if not exists can_distribute_water  boolean default false;
alter table volunteers add column if not exists can_transport_people  boolean default false;
alter table volunteers add column if not exists can_transport_supplies boolean default false;
alter table volunteers add column if not exists can_help_children     boolean default false;
alter table volunteers add column if not exists can_help_elderly      boolean default false;
-- (volunteers ya tiene has_vehicle, availability, latitude, longitude, status)

-- ── RLS abierta (misma postura que el resto del proyecto; anon + authenticated)
alter table collection_centers enable row level security;
drop policy if exists "centers_all" on collection_centers;
create policy "centers_all" on collection_centers for all to anon, authenticated using (true) with check (true);

alter table help_cases enable row level security;
drop policy if exists "cases_all" on help_cases;
create policy "cases_all" on help_cases for all to anon, authenticated using (true) with check (true);

alter table help_needs enable row level security;
drop policy if exists "needs_all" on help_needs;
create policy "needs_all" on help_needs for all to anon, authenticated using (true) with check (true);

alter table help_claims enable row level security;
drop policy if exists "claims_all" on help_claims;
create policy "claims_all" on help_claims for all to anon, authenticated using (true) with check (true);
