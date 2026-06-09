# Apply curriculum-related migrations in proper order
# Usage: set PGHOST/PGUSER/PGPASSWORD/PGDATABASE and run in repository root (PowerShell):
#   $env:PGHOST='...'; $env:PGUSER='...'; $env:PGPASSWORD='...'; $env:PGDATABASE='...'; .\apply_curriculum_migrations.ps1

$files = @( 
  'supabase/migrations/0009_dedupe_lesson_prerequisites.sql',
  'supabase/migrations/0008_add_constraints_lesson_prerequisites.sql',
  'supabase/migrations/0007_add_country_examboard_to_user_profiles.sql'
)

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Host "psql not found in PATH. Install PostgreSQL client tools or ensure psql is on PATH." -ForegroundColor Red
  exit 1
}

foreach ($f in $files) {
  if (-not (Test-Path $f)) {
    Write-Host "Migration file not found: $f" -ForegroundColor Red
    exit 1
  }
}

foreach ($f in $files) {
  Write-Host "Applying $f..."
  & psql "host=$env:PGHOST user=$env:PGUSER dbname=$env:PGDATABASE" -f $f
  if ($LASTEXITCODE -ne 0) {
    Write-Host "psql failed on $f with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

Write-Host "All migrations applied successfully." -ForegroundColor Green
