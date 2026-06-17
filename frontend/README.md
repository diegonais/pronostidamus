# Pronostidamus Frontend

Frontend visual para consumir el backend de Pronostidamus con separación por rol `ADMIN` y `USER`.

## Stack

- React
- Vite
- TypeScript
- Yarn
- React Router DOM
- Axios

## Requisitos

- Node.js 20+
- Yarn 1.x o Yarn moderno compatible
- Backend disponible en `http://localhost:3000/api` o una URL equivalente

## Instalación

```bash
cd frontend
yarn install
```

## Variables de entorno

Crear `.env` a partir de `.env.example`.

```bash
VITE_API_URL=http://localhost:3000/api
```

## Ejecución

```bash
cd frontend
yarn dev
```

## Build

```bash
cd frontend
yarn build
```

## Rutas principales

- `/login`
- `/admin`
- `/admin/users`
- `/admin/rooms`
- `/admin/matches`
- `/admin/leaderboard`
- `/user`
- `/user/profile`
- `/user/rooms`
- `/user/predictions`
- `/user/leaderboard`

## Roles

- `ADMIN`: gestiona usuarios, salas, partidos y una tabla derivada visualmente.
- `USER`: gestiona su perfil, consulta sus salas y crea o edita pronósticos.

## Logos oficiales

Se usan los archivos oficiales encontrados en la raíz del proyecto:

- `pronostidamus.png`
- `ball.png`

## Endpoints conectados

- `POST /auth/preview-login`
- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `GET /rooms`
- `GET /rooms/:id`
- `POST /rooms`
- `PATCH /rooms/:id`
- `POST /rooms/:roomId/users/:userId`
- `DELETE /rooms/:roomId/users/:userId`
- `GET /rooms/:roomId/matches`
- `POST /rooms/:roomId/matches`
- `PATCH /matches/:id`
- `GET /matches/:matchId/predictions`
- `POST /matches/:matchId/predictions`
- `PATCH /predictions/:id`

## Funcionalidades listas

- Login preview con `username` y `email`
- Persistencia mínima de sesión en `localStorage`
- Redirección automática por rol
- Rutas protegidas
- Panel administrativo separado por vistas
- Panel de usuario separado por vistas
- CRUD visual básico de usuarios, salas y partidos
- Gestión de membresías de salas
- Registro y edición de pronósticos
- Formato de fechas orientado a `America/La_Paz`
- Bloqueo visual de pronósticos a 5 minutos del partido
- Tabla derivada visualmente a partir de partidos y predicciones disponibles

## Pendientes detectados del backend

Los siguientes puntos no tienen endpoint específico en la API actual, por lo que el frontend los deja preparados o los resuelve de forma visual:

- Login real con JWT o sesión
- Endpoint de leaderboard oficial
- Endpoint de cálculo de puntos
- Endpoint para cerrar partidos automáticamente
- Endpoint para listar solo las salas del usuario autenticado
- Endpoint para listar solo los partidos/predicciones del usuario autenticado
- Endpoint para registrar resultados reales por una acción dedicada
- Endpoint para deshabilitar o borrar partidos mediante una operación explícita

## Notas

- La seguridad real sigue dependiendo del backend.
- El frontend oculta acciones fuera de rol, pero no reemplaza validaciones del servidor.
- Para pruebas rápidas con seed actual del backend: `diego`, `salva`, `josue`, `paolo`.
