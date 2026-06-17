param(
  [Parameter(Mandatory = $true)]
  [string]$SupabasePassword,

  [string]$SupabaseHost = "aws-1-us-east-2.pooler.supabase.com",
  [string]$SupabasePort = "5432",
  [string]$SupabaseDatabase = "postgres",
  [string]$SupabaseUser = "postgres.nyefoppsyedecwbekscq",

  [string]$LocalHost = "host.docker.internal",
  [string]$LocalPort = "5432",
  [string]$LocalDatabase = "pronostidamus",
  [string]$LocalUser = "pronostidamus_user",
  [string]$LocalPassword = "pronostidamus_password"
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$tempDir = Join-Path $workspaceRoot ".tmp"
$dumpPath = Join-Path $tempDir "pronostidamus-public.sql"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker no esta disponible en PATH."
}

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

Write-Host "Exportando esquema public y datos desde la base local '$LocalDatabase'..."

$dumpCommand = @(
  "run", "--rm",
  "-e", "PGPASSWORD=$LocalPassword",
  "postgres:17-alpine",
  "pg_dump",
  "--host=$LocalHost",
  "--port=$LocalPort",
  "--username=$LocalUser",
  "--dbname=$LocalDatabase",
  "--schema=public",
  "--clean",
  "--if-exists",
  "--no-owner",
  "--no-privileges",
  "--quote-all-identifiers",
  "--encoding=UTF8"
)

$dumpOutput = & docker @dumpCommand 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Fallo la exportacion local: $dumpOutput"
}

$dumpOutput = $dumpOutput -replace '"public"\."uuid_generate_v4"\(\)', '"extensions"."uuid_generate_v4"()'

Set-Content -LiteralPath $dumpPath -Value $dumpOutput -Encoding UTF8

Write-Host "Restaurando dump en Supabase usando session pooler..."

$restoreCommand = @(
  "run", "--rm",
  "-e", "PGPASSWORD=$SupabasePassword",
  "-e", "PGSSLMODE=require",
  "-v", "${tempDir}:/work",
  "postgres:17-alpine",
  "psql",
  "--host=$SupabaseHost",
  "--port=$SupabasePort",
  "--dbname=$SupabaseDatabase",
  "--username=$SupabaseUser",
  "-v", "ON_ERROR_STOP=1",
  "-f", "/work/pronostidamus-public.sql"
)

$restoreOutput = & docker @restoreCommand 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Fallo la restauracion en Supabase: $restoreOutput"
}

Write-Host "Migracion completada."
Write-Host "Dump temporal: $dumpPath"
