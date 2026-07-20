# Pronostidamus

Pronostidamus es un backend para una polla deportiva de futbol. Esta primera fase deja una base funcional con NestJS, PostgreSQL, TypeORM, Swagger, validaciones, Docker y seed inicial.

## Requisitos

- Node.js 24+
- Yarn 1.x
- Docker y Docker Compose

## Estructura actual

- `backend/`: API NestJS
- `frontend/`: app React/Vite
- `docker-compose.yml`: servicios `postgres` y `backend`

## Instalar dependencias

```bash
cd backend
yarn install
```

## Variables de entorno

Crear `backend/.env` tomando como base `backend/.env.example`.

Variables principales:

- `PORT=3001`
- `TZ=America/La_Paz`
- `DB_HOST=localhost`
- `DB_PORT=5439`
- `DB_USERNAME=pronostidamus_user`
- `DB_PASSWORD=pronostidamus_password`
- `DB_NAME=pronostidamus`
- `DB_SYNCHRONIZE=true`
- `DB_LOGGING=false`

## Levantar PostgreSQL con Docker

Desde la raiz del proyecto:

```bash
docker-compose up -d postgres
```

Puertos locales reservados para este proyecto:

- `5439`: PostgreSQL local de Pronostidamus
- `3001`: backend NestJS
- `5173`: frontend Vite

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

- `http://localhost:3001/api`

## Ejecutar el frontend localmente

```bash
cd frontend
yarn dev --host 127.0.0.1 --port 5173
```

La app quedara disponible en:

- `http://127.0.0.1:5173`

## Swagger

Swagger queda disponible en:

- `http://localhost:3001/api/docs`

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

El seed carga un snapshot de demostracion basado en la data actual de Supabase:

- 4 usuarios iniciales
- 1 sala: `apuestillas mundialcillo`
- membresias de los 4 usuarios en esa sala
- 48 equipos con banderas y metadata
- 92 partidos terminados
- 253 pronosticos con puntajes calculados

Credenciales utiles para pruebas locales:

- `diego / diego123`
- `salva / salva123`
- `josue / josue123`
- `paolo / paolo123`

## Conectarte desde TablePlus

Usa estos datos:

- Host: `localhost`
- Port: `5439`
- Database: `pronostidamus`
- User: `pronostidamus_user`
- Password: `pronostidamus_password`

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
