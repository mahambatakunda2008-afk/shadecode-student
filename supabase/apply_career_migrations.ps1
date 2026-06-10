# Apply career-related migrations (0012-0014)
# Usage: set environment variable DATABASE_URL (Postgres) or use SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_URL for supabase client.
# This script runs the SQL migration files in order. Review them before running in production.

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$migDir = Join-Path $repo 'supabase\migrations'
$migrations = @('0012_create_careers_table.sql','0013_create_skills_and_mappings.sql','0014_seed_careers.sql')

if (-not (Test-Path $migDir)) { Write-Error "Migrations directory not found: $migDir"; exit 1 }

# Prefer using psql with DATABASE_URL
if ($env:DATABASE_URL) {
  foreach ($m in $migrations) {
    $file = Join-Path $migDir $m
    if (-not (Test-Path $file)) { Write-Error "Migration file missing: $file"; exit 1 }
    Write-Host "Applying $m ..."
    & psql $env:DATABASE_URL -f $file
    if ($LASTEXITCODE -ne 0) { Write-Error "psql failed on $m"; exit $LASTEXITCODE }
  }
  Write-Host "Migrations applied successfully."
  exit 0
}

# Fallback: use supabase CLI if available and env vars set
if ($env:NEXT_PUBLIC_SUPABASE_URL -and $env:SUPABASE_SERVICE_ROLE_KEY) {
  if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) { Write-Error "supabase CLI not found. Please install supabase CLI or set DATABASE_URL."; exit 1 }
  Write-Host "Using supabase CLI to apply raw SQL migrations"
  foreach ($m in $migrations) {
    $file = Join-Path $migDir $m
    Write-Host "Applying $m via supabase db query --file"
    supabase db query --file "$file" --project-ref $env:NEXT_PUBLIC_SUPABASE_URL --service-role $env:SUPABASE_SERVICE_ROLE_KEY
    if ($LASTEXITCODE -ne 0) { Write-Error "supabase CLI failed on $m"; exit $LASTEXITCODE }
  }
  Write-Host "Migrations applied via supabase CLI."
  exit 0
}

Write-Error "No supported DB client found. Set DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY."; exit 1
