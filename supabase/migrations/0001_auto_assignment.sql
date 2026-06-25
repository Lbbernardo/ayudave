-- Migración: sistema de asignación automática de AyudaVE
-- Ejecuta este archivo en el SQL Editor de Supabase DESPUÉS de schema.sql.
-- Es idempotente: usa "if not exists", así que se puede correr varias veces.

-- ---------------------------------------------------------------------
-- reports: campos de asignación
-- ---------------------------------------------------------------------
alter table reports add column if not exists assigned_to_type text;        -- 'volunteer' | 'donor' | 'admin'
alter table reports add column if not exists assigned_to_id uuid;
alter table reports add column if not exists assigned_at timestamptz;
alter table reports add column if not exists assignment_status text default 'sin_asignar';
alter table reports add column if not exists distance_km double precision;

-- ---------------------------------------------------------------------
-- volunteers: ubicación, capacidad y estado
-- ---------------------------------------------------------------------
alter table volunteers add column if not exists latitude double precision;
alter table volunteers add column if not exists longitude double precision;
alter table volunteers add column if not exists max_active_cases int default 3;
-- 'status' ya existe en schema.sql con default 'disponible'.

-- ---------------------------------------------------------------------
-- donations: ubicación, capacidad y estado
-- ---------------------------------------------------------------------
alter table donations add column if not exists latitude double precision;
alter table donations add column if not exists longitude double precision;
alter table donations add column if not exists max_active_cases int default 5;
-- 'donations.status' existe con default 'pendiente'; el matching usa 'disponible'
-- como valor activo, pero acepta cualquier estado que no sea 'inactivo'.

-- ---------------------------------------------------------------------
-- assignments: historial de asignaciones (un reporte puede reasignarse)
-- ---------------------------------------------------------------------
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  assigned_to_type text not null,        -- 'volunteer' | 'donor'
  assigned_to_id uuid not null,
  distance_km double precision,
  status text default 'asignado',         -- asignado | aceptado | en_camino | completado | rechazado
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Índices para los filtros del panel y del matching
-- ---------------------------------------------------------------------
create index if not exists idx_reports_assignment_status on reports (assignment_status);
create index if not exists idx_reports_assigned_to on reports (assigned_to_type, assigned_to_id);
create index if not exists idx_volunteers_status on volunteers (status);
create index if not exists idx_donations_status on donations (status);
create index if not exists idx_assignments_report on assignments (report_id);
create index if not exists idx_assignments_person on assignments (assigned_to_type, assigned_to_id, status);
