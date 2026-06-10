# Backup important tables before running curriculum migrations
# Usage (PowerShell):
#   $env:PGHOST = 'db.host'; $env:PGUSER = 'dbuser'; $env:PGPASSWORD = 'secret'; $env:PGDATABASE = 'dbname'; .\backup_db_before_curriculum_migrations.ps1

$required = @('PGHOST','PGUSER','PGPASSWORD','PGDATABASE')
$missing = $required | Where-Object { -not $env:$_ }
if ($missing) {
  Write-Host "Missing env vars: $($missing -join ', ')" -ForegroundColor Yellow
  Write-Host "Please set PGHOST, PGUSER, PGPASSWORD, PGDATABASE and optionally PGPORT before running this script."
  exit 1
}

$ts = Get-Date -Format "yyyyMMddHHmmss"
$backupFile = "curriculum_backup_$ts.sql"

# Ensure pg_dump is available
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Host "pg_dump not found in PATH. Install PostgreSQL client tools or ensure pg_dump is on PATH." -ForegroundColor Red
  exit 1
}

Write-Host "Creating backup file: $backupFile"

# Backup the specific tables involved in curriculum changes
$tables = @('public.learn_lessons','public.lesson_prerequisites','public.user_profiles')
$tablesArgs = $tables | ForEach-Object { "--table=$_" } | Out-String
$tablesArgs = $tablesArgs -replace "\r|\n"," "

# Run pg_dump
& pg_dump --host $env:PGHOST --username $env:PGUSER --dbname $env:PGDATABASE --file $backupFile --format=plain --no-owner $tablesArgs

if ($LASTEXITCODE -eq 0) {
  Write-Host "Backup succeeded: $backupFile" -ForegroundColor Green
} else {
  Write-Host "pg_dump failed with exit code $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE
}
