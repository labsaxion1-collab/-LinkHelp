# =============================================================================
# LinkHelp — Aplicar migration 0046 (user_complaints)
#
# Opção A — Supabase CLI (recomendado, usa SUPABASE_DB_URL do .env.local):
#   .\scripts\apply-migration-0046.ps1
#
# Opção B — Management API (requer access token):
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   .\scripts\apply-migration-0046.ps1 -UseManagementApi
# =============================================================================

param(
    [switch]$UseManagementApi
)

$PROJECT_REF = "mttjbaiiaeiqqmnwnzwr"
$API_BASE    = "https://api.supabase.com/v1/projects/$PROJECT_REF"
$MIGRATION   = "supabase\migrations\0046_user_complaints.sql"

function Get-EnvValue([string]$Key) {
    if (-not (Test-Path ".env.local")) { return $null }
    $line = Get-Content ".env.local" | Where-Object { $_ -match "^$Key=" }
    if (-not $line) { return $null }
    return ($line -split "=", 2)[1].Trim()
}

if (-not (Test-Path $MIGRATION)) {
    Write-Host "ERRO: $MIGRATION nao encontrado." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== LinkHelp — migration 0046_user_complaints ===" -ForegroundColor Cyan
Write-Host ""

if ($UseManagementApi) {
    if (-not $env:SUPABASE_ACCESS_TOKEN) {
        Write-Host "ERRO: defina SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)" -ForegroundColor Red
        exit 1
    }

    $headers = @{
        Authorization  = "Bearer $env:SUPABASE_ACCESS_TOKEN"
        "Content-Type" = "application/json"
    }
    $sqlBody = @{ query = (Get-Content -Raw $MIGRATION) } | ConvertTo-Json -Depth 2 -Compress

    try {
        Invoke-RestMethod -Method Post -Uri "$API_BASE/database/query" -Headers $headers -Body $sqlBody | Out-Null
        Write-Host "OK — Migration 0046 aplicada via Management API." -ForegroundColor Green
        exit 0
    } catch {
        Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

$dbUrl = Get-EnvValue "SUPABASE_DB_URL"
if (-not $dbUrl) {
    Write-Host "ERRO: SUPABASE_DB_URL ausente em .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "Aplicando via: npx supabase db push --db-url ..." -ForegroundColor Yellow
$output = npx supabase db push --db-url $dbUrl 2>&1
$output | ForEach-Object { Write-Host $_ }

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "OK — Migrations pendentes aplicadas." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Falha no CLI. Alternativa: cole o SQL no Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "  Dashboard → SQL → New query → conteudo de $MIGRATION"
exit $LASTEXITCODE
