# Supabase and Render Notes

## Current local backend config

For local work today, the backend is configured to use local Postgres:

```env
PORT=3000
TZ=America/La_Paz

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=pronostidamus

DB_SYNCHRONIZE=true
DB_LOGGING=false
```

## Supabase project info

- Project name: `pronostidamus`
- Project ID: `nyefoppsyedecwbekscq`
- Direct connection URI pattern:

```text
postgresql://postgres:[YOUR-PASSWORD]@db.nyefoppsyedecwbekscq.supabase.co:5432/postgres
```

- Direct host shown by Supabase:

```text
db.nyefoppsyedecwbekscq.supabase.co
```

## Important note

The direct Supabase connection did not work from the current local network during testing.
Supabase indicates that direct connections use IPv6 by default, so tomorrow we may need to use:

- the pooler connection string from Supabase, or
- Render network connectivity if direct connection works there

## Render env vars for tomorrow

Use these values as the base for the Render backend service:

```env
PORT=3000
TZ=America/La_Paz

DB_HOST=<supabase-host-or-pooler-host>
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<supabase-password>
DB_NAME=postgres

DB_SYNCHRONIZE=false
DB_LOGGING=false
```

## Recommended deployment order

1. Confirm the working Supabase connection string.
2. Create the backend service in Render.
3. Set Render environment variables.
4. Deploy backend and verify `/api/docs`.
5. Point the frontend to the deployed backend with `VITE_API_URL`.
