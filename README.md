# pronostidamus

Monorepo del MVP de `pronostidamus`, una aplicacion web para gestionar pollas deportivas de futbol enfocada inicialmente en el Mundial 2026.

## Estructura

```text
pronostidamus/
|-- backend/
|-- frontend/
|-- docs/
|-- docker-compose.yml
|-- .gitignore
|-- README.md
`-- AGENTS.md
```

## Stack

- Backend: NestJS + TypeScript + Yarn
- Frontend: React + Vite + TypeScript + Yarn
- Base de datos local: PostgreSQL con Docker
- Base de datos de produccion: Supabase PostgreSQL
- Deploy frontend: Vercel
- Deploy backend: Render
- Autenticacion: JWT

## Desarrollo local

### PostgreSQL con Docker

La base local usa estos valores por defecto:

- Servicio: `postgres`
- Imagen: `postgres:16-alpine`
- Base de datos: `pronostidamus`
- Usuario: `pronostidamus_user`
- Password: `pronostidamus_password`
- Puerto: `5432`

Levantar PostgreSQL:

```bash
docker compose up -d postgres
```

Detener servicios:

```bash
docker compose down
```

Ver logs:

```bash
docker compose logs -f postgres
```

Eliminar contenedor y volumen:

```bash
docker compose down -v
```

### Variables de entorno

El repositorio no incluye secretos reales. Solo se versionan ejemplos:

- `backend/.env.example`
- `frontend/.env.example`

Preparacion local recomendada:

1. Copiar `backend/.env.example` a `backend/.env`.
2. Copiar `frontend/.env.example` a `frontend/.env`.
3. Ajustar valores solo si el entorno local lo necesita.

En desarrollo local, el backend usa `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD` y `DATABASE_NAME`.

En produccion, el backend acepta `DATABASE_URL` y `DATABASE_SSL=true`, por lo que puede conectarse a Supabase sin romper la configuracion de Docker local.

### Seed inicial

El backend incluye un seed idempotente para cargar los datos iniciales del MVP.

Ejecutar el seed:

```bash
cd backend
yarn seed
```

El seed crea o actualiza estos usuarios de desarrollo:

- `diego` con roles `user` y `admin`, password temporal `diego123`
- `salva` con rol `user`, password temporal `salva123`
- `josue` con rol `user`, password temporal `josue123`
- `paolo` con rol `user`, password temporal `paolo123`

Tambien crea o actualiza la sala inicial `pronostidamus mundialcillo` con codigo `PRONOSTIDAMUS-MUNDIALCILLO` y asegura la membresia de los cuatro usuarios.

## Deploy

### Frontend en Vercel

Crear el proyecto en Vercel usando:

- Root Directory: `frontend`
- Build Command: `yarn build`
- Output Directory: `dist`

Variable de entorno de produccion:

```env
VITE_API_URL=https://url-del-backend-en-render
```

No hardcodear la URL del backend en el codigo. Vercel debe inyectarla desde sus variables de entorno.

### Backend en Render

Crear un Web Service en Render usando:

- Root Directory: `backend`
- Build Command: `yarn install --frozen-lockfile && yarn build`
- Start Command: `yarn start:prod`

Variables de entorno de produccion:

```env
PORT=10000
DATABASE_URL=postgresql://usuario:password@host:5432/database
DATABASE_SSL=true
JWT_SECRET=definir-un-secreto-seguro
JWT_EXPIRES_IN=1d
FRONTEND_URL=https://url-del-frontend-en-vercel
```

Notas del backend para produccion:

- Si `DATABASE_URL` esta definido, el backend lo prioriza sobre `DATABASE_HOST` y el resto de variables locales.
- Si `DATABASE_SSL=true`, TypeORM habilita SSL para conexiones a Supabase.
- CORS usa `FRONTEND_URL`, por lo que debe apuntar al dominio final del frontend en Vercel.
- `GET /health` queda disponible para health checks y uptime monitoring.

### Base de datos en Supabase

Crear un proyecto PostgreSQL en Supabase y copiar la connection string en `DATABASE_URL` del backend en Render.

Para produccion:

- Usar la cadena PostgreSQL de Supabase en `DATABASE_URL`.
- Mantener `DATABASE_SSL=true`.
- No guardar credenciales reales en el repositorio.

## Verificacion recomendada

Antes de desplegar:

```bash
cd backend
yarn build
```

```bash
cd frontend
yarn build
```

Despues del deploy:

1. Abrir el frontend en Vercel.
2. Verificar login contra el backend en Render.
3. Consultar `GET https://url-del-backend-en-render/health`.
4. Confirmar que el backend conecta a Supabase con SSL activo.

## Notas

- El archivo `AGENTS.md` define el contexto operativo y funcional del proyecto.
- Se prioriza un MVP simple, mantenible y compatible con Docker local y Supabase en produccion.
