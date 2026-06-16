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

## Estado actual

Esta primera base solo prepara la estructura del monorepo y la documentación principal del proyecto.

Todavía no incluye:

- Backend NestJS generado
- Frontend React generado
- Entidades ni migraciones
- Lógica de negocio
- Seeds o importadores de partidos

## Desarrollo local

Levantar PostgreSQL local:

```bash
docker compose up -d
```

Detener servicios:

```bash
docker compose down
```

## Siguientes pasos recomendados

1. Crear la base del backend NestJS en `backend/`.
2. Crear la base del frontend React + Vite en `frontend/`.
3. Configurar variables de entorno por aplicación.
4. Conectar backend a PostgreSQL local.

## Notas

- El archivo `AGENTS.md` define el contexto operativo y funcional del proyecto.
- Se prioriza un MVP simple, mantenible y compatible con Docker local y Supabase en producción.
