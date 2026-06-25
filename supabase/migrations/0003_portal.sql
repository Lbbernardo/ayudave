-- Migración: portal con login (Supabase Auth), notificaciones in-app y timeline.
-- Ejecutar en el SQL Editor de Supabase. Idempotente.

-- ---------------------------------------------------------------------
-- profiles: vincula una cuenta de auth.users con su rol
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'helper',   -- 'helper' | 'admin'
  created_at timestamptz default now()
);

alter table profiles enable row level security;
drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- Vincular voluntarios/donantes con su cuenta (opcional, nullable)
-- ---------------------------------------------------------------------
alter table volunteers add column if not exists user_id uuid references auth.users on delete set null;
alter table donations  add column if not exists user_id uuid references auth.users on delete set null;
create index if not exists idx_volunteers_user on volunteers (user_id);
create index if not exists idx_donations_user on donations (user_id);

-- ---------------------------------------------------------------------
-- notifications: bandeja de entrada in-app
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null default 'info',     -- 'assignment' | 'status' | 'info'
  title text not null,
  body text,
  report_id uuid references reports(id) on delete cascade,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user on notifications (user_id, read, created_at desc);

alter table notifications enable row level security;
-- El que reporta (anon) o el sistema crea notificaciones para el ayudante.
drop policy if exists "notif_insert" on notifications;
create policy "notif_insert" on notifications
  for insert to anon, authenticated with check (true);
-- Cada quien solo LEE/actualiza sus propias notificaciones.
drop policy if exists "notif_select_own" on notifications;
create policy "notif_select_own" on notifications
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "notif_update_own" on notifications;
create policy "notif_update_own" on notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: que la bandeja se actualice en vivo.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- case_updates: timeline por caso (ya existe; añadimos columna actor)
-- ---------------------------------------------------------------------
alter table case_updates add column if not exists actor text; -- 'sistema'|'voluntario'|'donante'|'coordinador'

alter table case_updates enable row level security;
-- Insertable por anon (matching) y autenticados; legible por ambos (no tiene
-- datos sensibles: solo notas de avance del caso).
drop policy if exists "cu_insert" on case_updates;
create policy "cu_insert" on case_updates
  for insert to anon, authenticated with check (true);
drop policy if exists "cu_select" on case_updates;
create policy "cu_select" on case_updates
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- Marcar al coordinador como admin (se aplica cuando ya exista su profile,
-- es decir, después de su primer inicio de sesión). Re-ejecutable.
-- ---------------------------------------------------------------------
update profiles set role = 'admin' where email = 'luisbaezbernardo@gmail.com';
