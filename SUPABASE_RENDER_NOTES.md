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

DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SYNCHRONIZE=true
DB_LOGGING=false
```

## Supabase project info

- Project name: `pronostidamus`
- Project ID: `nyefoppsyedecwbekscq`
- Session pooler connection URI pattern:

```text
postgresql://postgres.nyefoppsyedecwbekscq:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

- Session pooler host shown by Supabase:

```text
aws-1-us-east-2.pooler.supabase.com
```

## Verified Supabase guidance

- Supabase currently documents the session pooler on port `5432` as the recommended alternative when connecting from an IPv4-only network.
- Transaction pooler is meant for serverless-style workloads and may require disabling prepared statements.
- SSL should be enabled for hosted connections. For Node/Postgres clients, a practical starting point is:

```env
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

`DB_SSL_REJECT_UNAUTHORIZED=false` is a compatibility choice often used with managed Postgres clients when you are not mounting a root certificate locally.

## Recommended backend env vars for Supabase session pooler

Use these values as the base for local validation or Render:

```env
PORT=3000
TZ=America/La_Paz

DATABASE_URL=postgresql://postgres.nyefoppsyedecwbekscq:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres

DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false

DB_SYNCHRONIZE=false
DB_LOGGING=false
```

If `DATABASE_URL` is present, the backend now prefers it over `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_NAME`.

## Local migration workflow

1. Keep local Docker/Postgres as source of truth in `pronostidamus`.
2. Point Supabase target through `DATABASE_URL` using the session pooler.
3. Run the migration helper script from the project root:

```powershell
.\scripts\migrate-pronostidamus-to-supabase.ps1 -SupabasePassword "YOUR_PASSWORD"
```

The script exports data from the local Docker Postgres and restores it into the Supabase `postgres` database using Dockerized Postgres tooling.

## Recommended deployment order

1. Confirm the Supabase password and session pooler string.
2. Run the migration script against Supabase.
3. Set backend env vars with `DATABASE_URL` and SSL enabled.
4. Deploy backend and verify `/api/docs`.
5. Point the frontend to the deployed backend with `VITE_API_URL`.
