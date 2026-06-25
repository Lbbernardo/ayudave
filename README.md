# AyudaVE — SOS Venezuela

> **Reporta ayuda, encuentra familiares y coordina voluntarios.**

AyudaVE es una aplicación web de emergencia, _mobile first_, creada para ayudar
a coordinar la respuesta tras un terremoto en Venezuela. Permite que las
personas reporten necesidades, avisen que están bien, busquen familiares, se
registren como voluntarios y ofrezcan donaciones, y que un equipo de
coordinación gestione los casos desde un panel de administración.

> ⚠️ **AVISO IMPORTANTE**
> Esta plataforma **NO reemplaza** a Protección Civil, bomberos, policía,
> ambulancias ni servicios oficiales de emergencia. Si estás en peligro
> inmediato, contacta a los servicios oficiales o a personas cercanas.

---

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (base de datos; Auth preparado para el admin)
- **Mapbox GL** (mapa de reportes, con _fallback_ a lista)
- **Vercel** (deploy)

## Funcionalidades

| Ruta                 | Descripción                                            |
| -------------------- | ------------------------------------------------------ |
| `/`                  | Home con accesos directos y aviso de emergencia        |
| `/reportar-ayuda`    | Formulario para reportar una necesidad                 |
| `/estoy-bien`        | Avisar que estás a salvo                                |
| `/buscar-familiar`   | Reportar a una persona desaparecida                    |
| `/voluntario`        | Registro de voluntarios                                |
| `/donar`             | Ofrecimiento de donaciones                             |
| `/mapa`              | Mapa de reportes (Mapbox) con filtros y _fallback_     |
| `/admin`             | Dashboard con estadísticas                             |
| `/admin/reportes`    | Tabla de reportes con filtros y cambio de status       |
| `/admin/personas`    | Personas reportadas bien y personas buscadas           |
| `/admin/voluntarios` | Voluntarios con cambio de status                       |
| `/privacidad`        | Política de privacidad                                 |

> **Modo demo:** si no configuras Supabase, la app sigue funcionando: los
> formularios simulan el envío y los listados aparecen vacíos. Así puedes ver la
> interfaz sin credenciales.

---

## Instalación

Requisitos: **Node.js 20+** y **npm**.

```bash
npm install
cp .env.example .env.local   # luego rellena las variables
npm run dev
```

La app queda en [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Crea un archivo `.env.local` (basado en `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
```

## Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **Project Settings → API** copia la **Project URL** y la **anon public
   key** a `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. **Ejecutar el SQL:** abre **SQL Editor**, pega el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo. Esto crea las tablas
   `reports`, `safe_reports`, `missing_people`, `volunteers`, `donations` y
   `case_updates`.

> **Seguridad (importante):** el esquema deja comentarios `TODO` sobre Row Level
> Security (RLS). Para producción debes habilitar RLS y definir políticas
> (INSERT público, SELECT/UPDATE solo para admins autenticados). No publiques la
> app con las tablas abiertas.

## Configurar Mapbox

1. Crea una cuenta en [mapbox.com](https://www.mapbox.com).
2. Copia tu **default public token** a `NEXT_PUBLIC_MAPBOX_TOKEN`.
3. Si **no** defines el token, `/mapa` muestra automáticamente una **lista de
   reportes** como alternativa.

## Correr localmente

```bash
npm run dev     # desarrollo
npm run lint    # linting
npm run build   # build de producción
npm start       # servir el build
```

## Desplegar en Vercel

1. Sube el proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) importa el repositorio.
3. Añade las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`) en
   **Settings → Environment Variables**.
4. Deploy. Vercel detecta Next.js automáticamente.

```bash
# o desde la CLI
npm i -g vercel
vercel
```

---

## Privacidad

- Los **teléfonos nunca se muestran** en páginas públicas (mapa, listados).
- Existe un helper `maskPhone()` en `lib/utils.ts` para ofuscar números
  (`+58******1234`) si se necesita mostrarlos parcialmente.
- Los datos se usan **únicamente** para coordinación de ayuda humanitaria.
- Más detalles en la página `/privacidad`.

## Autenticación del admin

En esta primera versión el panel `/admin` **no requiere login** para facilitar
el desarrollo. El código incluye comentarios `TODO` indicando dónde proteger las
rutas con **Supabase Auth** antes de pasar a producción.

## Próximas mejoras

- [ ] Proteger `/admin` con Supabase Auth y roles.
- [ ] Habilitar RLS con políticas por tabla y por columna.
- [ ] Notas/seguimiento por caso usando la tabla `case_updates`.
- [ ] Notificaciones a voluntarios cuando se les asigna un caso.
- [ ] Clustering de marcadores en el mapa para zonas con muchos reportes.
- [ ] Búsqueda y paginación en las tablas del admin.
- [ ] Exportar reportes (CSV) para organizaciones.
- [ ] Soporte multilenguaje e indicaciones offline.

---

### Estructura del proyecto

```
app/                 # rutas (App Router)
components/
  ui/                # componentes reutilizables (Button, Card, ...)
  layout/            # PublicLayout, AdminLayout
  forms/             # LocationButton, FormSuccess
  map/               # ReportsMap (Mapbox)
lib/
  supabase/client.ts # cliente de Supabase
  types.ts           # tipos y constantes
  utils.ts           # helpers (maskPhone, formatDate, ...)
  submit.ts          # inserción con modo demo
supabase/
  schema.sql         # esquema de la base de datos
```
