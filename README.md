# Pronostidamus

Pronostidamus es un backend para una polla deportiva de futbol. Esta primera fase deja una base funcional con NestJS, PostgreSQL, TypeORM, Swagger, validaciones, Docker y seed inicial.

## Requisitos

- Node.js 24+
- Yarn 1.x
- Docker y Docker Compose

## Estructura actual

- `backend/`: API NestJS
- `docker-compose.yml`: servicios `postgres` y `backend`

## Instalar dependencias

```bash
cd backend
yarn install
```

## Variables de entorno

Crear `backend/.env` tomando como base `backend/.env.example`.

Variables principales:

- `PORT=3000`
- `TZ=America/La_Paz`
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USERNAME=postgres`
- `DB_PASSWORD=postgres`
- `DB_NAME=pronostidamus`
- `DB_SYNCHRONIZE=true`
- `DB_LOGGING=false`

## Levantar PostgreSQL con Docker

Desde la raiz del proyecto:

```bash
docker-compose up -d postgres
```

Si quieres levantar tambien el backend en Docker:

```bash
docker-compose up -d --build
```

## Ejecutar el backend localmente

```bash
cd backend
yarn start:dev
```

La API quedara disponible en:

- `http://localhost:3000/api`

## Swagger

Swagger queda disponible en:

- `http://localhost:3000/api/docs`

Notas de fechas:

- `matchDate` debe enviarse en formato ISO 8601.
- La referencia de negocio es `America/La_Paz`.
- En base de datos se usan columnas `timestamptz`.

Ejemplo valido:

```text
2026-06-18T20:00:00-04:00
```

## Ejecutar el seed

Con PostgreSQL ya levantado:

```bash
cd backend
yarn seed
```

El seed crea:

- 4 usuarios iniciales
- 1 sala: `apuestillas mundialcillo`
- membresias de los 4 usuarios en esa sala
- 3 partidos de ejemplo

## Conectarte desde TablePlus

Usa estos datos:

- Host: `localhost`
- Port: `5432`
- Database: `pronostidamus`
- User: `postgres`
- Password: `postgres`

## Endpoints base de esta fase

- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `POST /api/rooms`
- `GET /api/rooms`
- `GET /api/rooms/:id`
- `PATCH /api/rooms/:id`
- `POST /api/rooms/:roomId/users/:userId`
- `DELETE /api/rooms/:roomId/users/:userId`
- `POST /api/rooms/:roomId/matches`
- `GET /api/rooms/:roomId/matches`
- `GET /api/matches/:id`
- `PATCH /api/matches/:id`
- `POST /api/matches/:matchId/predictions`
- `GET /api/matches/:matchId/predictions`
- `GET /api/predictions/:id`
- `PATCH /api/predictions/:id`
- `GET /api/auth/status`
- `POST /api/auth/preview-login`

## Notas tecnicas

- TypeORM esta configurado con `synchronize: true` para desarrollo inicial.
- No usar `synchronize` en produccion.
- En una siguiente fase conviene generar la primera migracion base y apagar `synchronize`.
- La estructura ya queda lista para incorporar `@nestjs/schedule`, auth real, cierre de predicciones, calculo de puntos y leaderboard.

## Pendiente para Fase 2

- Login preview por `username` y `password`
- Roles y permisos
- cierre de predicciones 5 minutos antes del partido
- calculo de puntos
- leaderboard
- migraciones TypeORM
