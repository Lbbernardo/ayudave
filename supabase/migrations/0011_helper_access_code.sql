-- Clave de acceso de 4 dígitos para voluntarios y donantes.
-- Se genera al registrarse, se muestra en pantalla y se envía por correo
-- (si dejaron email). Idempotente: solo agrega columnas.

alter table volunteers add column if not exists email       text;
alter table volunteers add column if not exists access_code  text;

alter table donations  add column if not exists email       text;
alter table donations  add column if not exists access_code  text;
