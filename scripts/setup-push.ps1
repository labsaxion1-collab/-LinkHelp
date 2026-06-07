# =============================================================================
# LinkHelp — Push Notifications Setup Script
#
# O que este script faz:
#   1. Aplica a migration 0040 (fila de eventos + triggers)
#   2. Configura os secrets VAPID na edge function
#   3. Registra o Database Webhook (push_notification_queue → send-push)
#   4. Faz o deploy da edge function send-push
#
# PRÉ-REQUISITO:
#   Supabase Access Token  →  https://supabase.com/dashboard/account/tokens
#
# USO:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   .\scripts\setup-push.ps1
# =============================================================================

$PROJECT_REF    = "mttjbaiiaeiqqmnwnzwr"
$SUPABASE_URL   = "https://mttjbaiiaeiqqmnwnzwr.supabase.co"
$API_BASE       = "https://api.supabase.com/v1/projects/$PROJECT_REF"
$FUNCTION_URL   = "$SUPABASE_URL/functions/v1/send-push"

$VAPID_PUBLIC   = "BI_3otb9S59Oh6UvsyTBjL0S04-zwdmTcakmVgHHR2mPfUHPfeIafWIBelPeHpxEQGXGC6TfeyrZIU9K5SiM1Ig"
$VAPID_PRIVATE  = "PAEsmSjXFEzpEW499CUdegLm5BfeeVXVMXrFzmmRlrg"
$VAPID_SUBJECT  = "mailto:support@linkhelp.ca"

# Lê a service role key do .env.local (necessária para o cabeçalho do webhook)
function Get-EnvValue([string]$Key) {
    if (-not (Test-Path ".env.local")) { return $null }
    $line = Get-Content ".env.local" | Where-Object { $_ -match "^$Key=" }
    if (-not $line) { return $null }
    return ($line -split "=", 2)[1].Trim()
}

$SERVICE_ROLE_KEY = Get-EnvValue "SUPABASE_SERVICE_ROLE_KEY"

# ---------------------------------------------------------------------------
# Verificações iniciais
# ---------------------------------------------------------------------------
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host ""
    Write-Host "ERRO: SUPABASE_ACCESS_TOKEN nao encontrado." -ForegroundColor Red
    Write-Host "Obtenha em: https://supabase.com/dashboard/account/tokens"
    Write-Host 'Execute:  $env:SUPABASE_ACCESS_TOKEN = "sbp_..."'
    Write-Host ""
    exit 1
}

if (-not $SERVICE_ROLE_KEY) {
    Write-Host "ERRO: SUPABASE_SERVICE_ROLE_KEY nao encontrado em .env.local" -ForegroundColor Red
    exit 1
}

$headers = @{
    Authorization  = "Bearer $env:SUPABASE_ACCESS_TOKEN"
    "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "=== LinkHelp Push Setup ===" -ForegroundColor Cyan
Write-Host "Projeto: $PROJECT_REF"
Write-Host ""

# ---------------------------------------------------------------------------
# 1. Aplicar migration via Management API
# ---------------------------------------------------------------------------
Write-Host "[1/4] Aplicando migration 0040..." -ForegroundColor Yellow

$migrationSql = Get-Content -Raw "supabase\migrations\0040_push_notification_triggers.sql"
$sqlBody = @{ query = $migrationSql } | ConvertTo-Json -Depth 2 -Compress

try {
    Invoke-RestMethod -Method Post -Uri "$API_BASE/database/query" -Headers $headers -Body $sqlBody | Out-Null
    Write-Host "  OK — Migration aplicada." -ForegroundColor Green
} catch {
    Write-Host "  AVISO — Erro na migration: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  Execute manualmente no Supabase SQL Editor se necessario."
}

# ---------------------------------------------------------------------------
# 2. Configurar secrets VAPID na edge function
# ---------------------------------------------------------------------------
Write-Host "[2/4] Configurando secrets VAPID..." -ForegroundColor Yellow

$secretsBody = @(
    @{ name = "VAPID_PUBLIC_KEY";  value = $VAPID_PUBLIC  }
    @{ name = "VAPID_PRIVATE_KEY"; value = $VAPID_PRIVATE }
    @{ name = "VAPID_SUBJECT";     value = $VAPID_SUBJECT }
) | ConvertTo-Json -Compress

try {
    Invoke-RestMethod -Method Post -Uri "$API_BASE/secrets" -Headers $headers -Body $secretsBody | Out-Null
    Write-Host "  OK — Secrets configurados." -ForegroundColor Green
} catch {
    Write-Host "  AVISO — Erro ao setar secrets: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  Configure manualmente: Dashboard → Edge Functions → send-push → Secrets"
}

# ---------------------------------------------------------------------------
# 3. Registrar Database Webhook (push_notification_queue INSERT → send-push)
# ---------------------------------------------------------------------------
Write-Host "[3/4] Registrando Database Webhook..." -ForegroundColor Yellow

# Remove webhook existente com mesmo nome (se houver) antes de criar
try {
    $existing = Invoke-RestMethod -Method Get -Uri "$API_BASE/database/hooks" -Headers $headers -ErrorAction SilentlyContinue
    $old = $existing | Where-Object { $_.name -eq "push_queue_to_send_push" }
    if ($old) {
        Invoke-RestMethod -Method Delete -Uri "$API_BASE/database/hooks/$($old.id)" -Headers $headers | Out-Null
        Write-Host "  Webhook anterior removido." -ForegroundColor Gray
    }
} catch { }

$webhookBody = @{
    name           = "push_queue_to_send_push"
    enabled        = $true
    event_type     = "INSERT"
    schema         = "public"
    table          = "push_notification_queue"
    function_args  = @{
        type      = "http"
        method    = "POST"
        url       = $FUNCTION_URL
        headers   = @{
            "Content-Type"  = "application/json"
            "Authorization" = "Bearer $SERVICE_ROLE_KEY"
        }
        timeout_ms = 5000
    }
} | ConvertTo-Json -Depth 5 -Compress

try {
    Invoke-RestMethod -Method Post -Uri "$API_BASE/database/hooks" -Headers $headers -Body $webhookBody | Out-Null
    Write-Host "  OK — Webhook registrado." -ForegroundColor Green
} catch {
    Write-Host "  AVISO — Nao foi possivel registrar o webhook via API." -ForegroundColor Yellow
    Write-Host "  Configure MANUALMENTE no Dashboard (ver instrucoes abaixo)."
    Write-Host ""
    Write-Host "  Dashboard → Database → Webhooks → Create new webhook:" -ForegroundColor Cyan
    Write-Host "    Table:  push_notification_queue"
    Write-Host "    Event:  INSERT"
    Write-Host "    Method: POST"
    Write-Host "    URL:    $FUNCTION_URL"
    Write-Host "    Header: Authorization: Bearer $SERVICE_ROLE_KEY"
}

# ---------------------------------------------------------------------------
# 4. Deploy da edge function
# ---------------------------------------------------------------------------
Write-Host "[4/4] Deploy da edge function send-push..." -ForegroundColor Yellow

$deployOutput = npx supabase functions deploy send-push --project-ref $PROJECT_REF 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK — Edge function deployada." -ForegroundColor Green
} else {
    Write-Host "  AVISO — Erro no deploy: $deployOutput" -ForegroundColor Yellow
    Write-Host "  Tente manualmente: npx supabase functions deploy send-push --project-ref $PROJECT_REF"
}

# ---------------------------------------------------------------------------
# Resumo final
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== SETUP CONCLUIDO ===" -ForegroundColor Green
Write-Host ""
Write-Host "Ainda necessario (manualmente):" -ForegroundColor Cyan
Write-Host "  1. Vercel → Settings → Environment Variables:"
Write-Host "     VITE_VAPID_PUBLIC_KEY = $VAPID_PUBLIC"
Write-Host ""
Write-Host "  2. Testar em: http://localhost:3000/admin/push-test"
Write-Host ""
