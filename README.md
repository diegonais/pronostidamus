# pronostidamus

Monorepo base para el MVP de `pronostidamus`, una aplicación web para gestionar pollas deportivas de fútbol enfocada inicialmente en el Mundial 2026.

## Estructura inicial

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

## Stack definido

- Backend: NestJS + TypeScript + Yarn
- Frontend: React + Vite + TypeScript + Yarn
- Base de datos local: PostgreSQL con Docker
- Base de datos de producción: Supabase PostgreSQL
- Deploy frontend: Vercel
- Deploy backend: Render
- Autenticación: JWT
- Variables de entorno: archivos `.env.example` por aplicación

## Estado actual

Esta base prepara la estructura del monorepo, PostgreSQL local con Docker y la documentación inicial del proyecto.

Todavía no incluye:

- Backend NestJS generado
- Frontend React generado
- Entidades ni migraciones
- Lógica de negocio
- Seeds o importadores de partidos

## Desarrollo local

### PostgreSQL local con Docker

La base de datos local se ejecuta con Docker Compose usando estos valores:

- Servicio: `postgres`
- Imagen: `postgres:16-alpine`
- Base de datos: `pronostidamus`
- Usuario: `pronostidamus_user`
- Password: `pronostidamus_password`
- Puerto local: `5432`
- Volumen persistente: `postgres_data`

Levantar PostgreSQL local:

```bash
docker compose up -d postgres
```

Detener servicios:

```bash
docker compose down
```

Ver logs del contenedor:

```bash
docker compose logs -f postgres
```

Eliminar contenedor y volumen local:

```bash
docker compose down -v
```

### Variables de entorno

El repositorio no incluye archivos `.env` reales. Solo se versionan ejemplos:

- `backend/.env.example`
- `frontend/.env.example`

Uso recomendado durante desarrollo:

1. Copiar `backend/.env.example` a `backend/.env`.
2. Copiar `frontend/.env.example` a `frontend/.env`.
3. Ajustar valores solo si el entorno local lo necesita.

Para desarrollo local, el backend debe conectarse usando `DATABASE_HOST=localhost` y `DATABASE_PORT=5432`.

Para producción, la aplicación debe quedar preparada para usar Supabase PostgreSQL mediante `DATABASE_URL` y `DATABASE_SSL=true` según la configuración del entorno desplegado.

## Siguientes pasos recomendados

1. Crear la base del backend NestJS en `backend/`.
2. Crear la base del frontend React + Vite en `frontend/`.
3. Conectar el backend a PostgreSQL local usando las variables de `backend/.env`.
4. Mantener compatibilidad con Supabase PostgreSQL para producción.

## Notas

- El archivo `AGENTS.md` define el contexto operativo y funcional del proyecto.
- Se prioriza un MVP simple, mantenible y compatible con Docker local y Supabase en producción.
