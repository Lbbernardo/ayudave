-- Migración: puntuación de compatibilidad y capacidades del ayudante.
-- Idempotente. No borra datos ni renombra tablas.
--
-- Nota: la "tabla matches" del plan ya existe como `assignments` (misma forma);
-- aquí solo se le agrega el `score`. Las columnas de match en `reports` ya
-- existen como assignment_status / assigned_to_* / distance_km; se agrega
-- `match_score`.

-- Puntuación del match (0-100) en la asignación.
alter table assignments add column if not exists score int;

-- Puntuación del match en el reporte.
alter table reports add column if not exists match_score int;

-- Capacidades que ofrece un voluntario (tags separados por coma).
-- Ej: "herramientas, transporte_carga, medico". Ver CAPABILITIES en lib/types.ts.
alter table volunteers add column if not exists capabilities text;
