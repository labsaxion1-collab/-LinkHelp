# Migration Status — LinkHelp

> Atualizado em: 2026-07-04  
> Projeto remoto: `mttjbaiiaeiqqmnwnzwr` (`supabase/config.toml`)

---

## Inventário — migrations

| Pasta | Arquivos | Papel |
|-------|----------|-------|
| `supabase/migrations/` | **45** | Chain ativo — uma migration por versão, de 0001 a 0045 |
| `supabase/deprecated_migrations/` | **3** | Arquivo histórico — **não** processado pelo CLI |

### `supabase/migrations/` (ativo)

| # | Arquivo | Status |
|---|---------|--------|
| 0001 | `0001_linkhelp_production.sql` | ativo |
| 0002 | `0002_profiles_insert_and_google_meta.sql` | ativo |
| 0003 | `0003_applications_cancelled_profiles_location.sql` | ativo |
| 0004 | `0004_profiles_terms_acceptance.sql` | ativo |
| 0005 | `0005_profiles_insert_policy.sql` | ativo |
| 0006 | `0006_storage_and_portfolio.sql` | ativo |
| 0007 | `0007_security_hardening.sql` | ativo |
| 0008 | `0008_cleanup_demo_data.sql` | ativo |
| 0009 | `0009_request_location_schedule.sql` | ativo |
| 0010 | `0010_profiles_region.sql` | ativo |
| 0011 | `0011_profiles_region_auth_and_backfill.sql` | ativo |
| 0012 | `0012_helper_credit_marketplace.sql` | ativo |
| 0013 | `0013_helper_credit_foundation.sql` | ativo |
| 0014 | `0014_request_address_columns.sql` | ativo |
| 0015 | `0015_onboarding_linkcredits_rewards.sql` | ativo |
| 0016 | `0016_fix_applications_insert_rls.sql` | **ativo (canônico)** |
| 0017 | `0017_requests_address_budget_columns.sql` | **ativo (canônico)** |
| 0018 | `0018_profile_spoken_languages.sql` | ativo |
| 0019 | `0019_fix_signup_profile_trigger.sql` | ativo |
| 0020 | `0020_push_subscriptions.sql` | ativo |
| 0021 | `0021_profile_role_locked.sql` | ativo |
| 0022 | `0022_helper_category_preferences.sql` | ativo |
| 0023 | `0023_application_proposed_amount.sql` | ativo |
| 0024 | `0024_helper_signup_20_lc.sql` | ativo |
| 0025 | `0025_ensure_helper_wallet_signup_20.sql` | ativo |
| 0026 | `0026_reviews_unique_and_rating_sync.sql` | ativo |
| 0027 | `0027_helper_paid_credit_model.sql` | ativo |
| 0028 | `0028_conversation_single_thread.sql` | ativo |
| 0029 | `0029_request_preferred_period.sql` | ativo |
| 0030 | `0030_timezone_market_signals.sql` | ativo |
| 0031 | `0031_lead_quality_and_market_analytics.sql` | ativo |
| 0032 | `0032_helper_base_address.sql` | **ativo (canônico)** |
| 0033 | `0033_helper_base_address_lock.sql` | ativo |
| 0034 | `0034_fix_client_hire_helper_flow.sql` | ativo |
| 0035 | `0035_fix_lead_quality_budget_columns.sql` | ativo |
| 0036 | `0036_stripe_linkcredits_payments.sql` | ativo |
| 0037 | `0037_helper_not_interested_select.sql` | ativo |
| 0038 | `0038_helper_debit_application_interest.sql` | ativo |
| 0039 | `0039_helper_submit_application.sql` | ativo |
| 0040 | `0040_push_notification_triggers.sql` | ativo |
| 0041 | `0041_exclusive_helper_applications.sql` | ativo |
| 0042 | `0042_opportunity_unlock_refunds.sql` | ativo |
| 0043 | `0043_user_gamification.sql` | ativo — gamificação |
| 0044 | `0044_user_gamification_hero_progress.sql` | ativo — gamificação |
| 0045 | `0045_user_gamification_realtime.sql` | ativo — gamificação |

### `supabase/deprecated_migrations/` (fora do CLI)

| Arquivo original (duplicata incorreta) | Motivo do arquivamento |
|----------------------------------------|------------------------|
| `0016_helper_signup_12_lc_DEPRECATED.sql` | Signup 12 LC obsoleto → `0024` / `0025` (20 LC) |
| `0017_signup_profile_recovery_DEPRECATED.sql` | Signup recovery obsoleto → `0019` |
| `0032_reconcile_helper_signup_bonus_20_lc_DEPRECATED.sql` | Backfill one-off → `0024` / `0025` |

---

## Duplicatas resolvidas

### 0016 — duas migrations com o mesmo prefixo

| Arquivo | Conteúdo | Decisão |
|---------|----------|---------|
| `0016_fix_applications_insert_rls.sql` | RLS em `requests` + `applications` (helpers podem aplicar em pedidos `open`) | **Manter** — único no chain; ainda necessário |
| `0016_helper_signup_12_lc_DEPRECATED.sql` | `grant_user_reward` com **12 LC** no signup; valores de profile rewards errados (`PROFILE_PHOTO` = 2000) | **Deprecated** — substituído por `0024_helper_signup_20_lc.sql` (20 LC) e `0025_ensure_helper_wallet_signup_20.sql` |

### 0017 — duas migrations com o mesmo prefixo

| Arquivo | Conteúdo | Decisão |
|---------|----------|---------|
| `0017_requests_address_budget_columns.sql` | Colunas em `requests`: `latitude`, `longitude`, `budget_type`, `budget_amount`, `currency` (+ endereço já parcialmente em 0009/0014) | **Manter** — mais colunas; complementa 0014 |
| `0017_signup_profile_recovery_DEPRECATED.sql` | Colunas de profile, `grant_user_reward` (12 LC), `ensure_profile_for_current_user`, trigger de signup | **Deprecated** — superseded por `0019_fix_signup_profile_trigger.sql` (+ `0018` spoken_languages); signup bonus obsoleto (12 LC) |

### 0032 — duas migrations com o mesmo prefixo

| Arquivo | Conteúdo | Decisão |
|---------|----------|---------|
| `0032_helper_base_address.sql` | 6 colunas `helper_base_*` em `profiles` | **Manter** — `0033_helper_base_address_lock.sql` depende destas colunas |
| `0032_reconcile_helper_signup_bonus_20_lc_DEPRECATED.sql` | `reconcile_helper_signup_bonus()`, backfill 20 LC, sobrescreve `ensure_helper_credit_wallet` | **Deprecated** — lógica de signup canônica está em `0024` + `0025`; reconcile era backfill one-off |

---

## Reconciliação local concluída — 2026-07-04

As três migrations obsoletas ainda estavam duplicadas em `supabase/migrations/`, apesar de já existirem cópias idênticas em `supabase/deprecated_migrations/`. Nesta reconciliação, elas foram removidas somente do chain ativo:

```
0016_helper_signup_12_lc.sql
0017_signup_profile_recovery.sql
0032_reconcile_helper_signup_bonus_20_lc.sql
```

As cópias históricas permanecem preservadas fora do alcance do Supabase CLI:

```
supabase/deprecated_migrations/
├── 0016_helper_signup_12_lc_DEPRECATED.sql
├── 0017_signup_profile_recovery_DEPRECATED.sql
└── 0032_reconcile_helper_signup_bonus_20_lc_DEPRECATED.sql
```

As migrations canônicas 0016, 0017 e 0032 não foram alteradas. O chain ativo ficou com 45 arquivos, um por versão de 0001 a 0045. As versões 0043–0045 pertencem à gamificação; consolidações futuras devem começar em 0046 ou número superior livre.
## `supabase db diff` — resultado

### Status: **NÃO EXECUTADO** neste ambiente

| Tentativa | Resultado |
|-----------|-----------|
| `supabase` no PATH | Não instalado |
| `npx supabase@2.107.0 db diff --linked` | Falha: binário `supabase.exe` não executa no Windows desta máquina (`spawnSync UNKNOWN` / `ENOENT`) |
| `DATABASE_URL` / `SUPABASE_DB_URL` em `.env` / `.env.local` | **Não configurados** (apenas `VITE_SUPABASE_URL` presente) |

### Como rodar localmente

```bash
# 1. Instalar CLI (Windows: scoop install supabase ou binário oficial)
supabase login
supabase link --project-ref mttjbaiiaeiqqmnwnzwr

# 2. Diff remoto vs migrations locais
supabase db diff --linked

# Alternativa com Postgres direto
set DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
supabase db diff --db-url "%DATABASE_URL%"
```

Salvar saída:

```bash
supabase db diff --linked > supabase/db_diff_output.sql
```

---

## Análise estática — schema esperado (chain ativo) vs. riscos de drift

Como o `db diff` não rodou, esta seção resume o que **as migrations ativas** definem como estado final e onde o banco remoto pode divergir se migrations deprecated já foram aplicadas no passado.

### Estado esperado após chain ativo (0001 → 0042, excl. `_DEPRECATED`)

#### `public.profiles` — colunas relevantes acumuladas

- Identidade: `phone`, `region`, `country`, `province`, `preferred_language`, `spoken_languages[]`
- Termos: `accepted_terms`, `accepted_terms_at`, `helper_terms_accepted`, `helper_terms_accepted_at`
- Helper base: `helper_base_address`, `helper_base_city`, `helper_base_province`, `helper_base_postal_code`, `helper_base_lat`, `helper_base_lng` (0032)
- Helper base lock: `helper_base_updated_at`, `helper_base_change_unlocked_by_admin` (0033)
- Créditos cliente: `credits` (legado; normalizado em scripts `apply_normalize_client_profile_credits.sql`)

#### `public.requests` — colunas relevantes

- Localização: `address`, `city`, `region`, `postal_code`, `latitude`, `longitude` (0009, 0014, 0017)
- Agenda: `preferred_date`, `preferred_time_window`, `preferred_time`, `preferred_period` (0029)
- Orçamento: `budget_min`, `budget_max` (0014), `budget_type`, `budget_amount`, `currency` (0017)
- Qualidade: `lead_quality_score` (0031)
- Exclusivo: `exclusive_helper_id` (0041 area)

#### Funções críticas — versão canônica (última no chain ativo)

| Função | Definida por (ativo) | Comportamento esperado |
|--------|----------------------|------------------------|
| `grant_user_reward` | `0024_helper_signup_20_lc.sql` | `SIGNUP_HELPER` = **20 LC**; profile rewards = 0 LC |
| `ensure_helper_credit_wallet` | `0025_ensure_helper_wallet_signup_20.sql` | Cria wallet + grant 20 LC uma vez |
| `ensure_profile_for_current_user` | `0019` / `0018` (trigger path) | Signup recovery com `spoken_languages` |
| `linkhelp_handle_new_user` | `0019_fix_signup_profile_trigger.sql` | Trigger auth.users |
| `helper_debit_application_interest` | `0038` → `0039` → `0042` | Débito LC por candidatura |
| `helper_submit_application` | `0039` → `0041` → `0042` | RPC de candidatura |
| `compute_request_lead_quality` | `0035_fix_lead_quality_budget_columns.sql` | Usa `budget` text + urgency (não `budget_min/max`) |

### Drift provável — remoto vs. chain ativo pós-deprecation

| Item | Se remoto rodou deprecated | Se fresh install só ativos |
|------|---------------------------|---------------------------|
| `reconcile_helper_signup_bonus()` | **Existe** (0032 reconcile) | **Não existe** |
| `ensure_helper_credit_wallet` | Pode chamar `reconcile_*` (deprecated) ou `grant_user_reward` (0025) | Usa `grant_user_reward` 20 LC (0025) |
| `grant_user_reward` SIGNUP_HELPER | Pode ter passado por 12 LC (0016/0017 deprecated) antes de 0024 | 20 LC direto |
| Helpers antigos com 12 LC | Podem ter sido corrigidos pelo reconcile deprecated | Sem backfill automático |
| RLS `applications_insert_helper` | Presente se `0016_fix_applications_insert_rls` rodou | Presente |
| `requests.latitude/longitude` | Presente se `0017_requests_address_budget_columns` rodou | Presente |

### Verificações SQL sugeridas (rodar no SQL Editor remoto)

```sql
-- 1) Migrations aplicadas (nomes duplicados)
select version, name, inserted_at
from supabase_migrations.schema_migrations
order by version;

-- 2) Função reconcile ainda existe?
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('reconcile_helper_signup_bonus', 'ensure_helper_credit_wallet', 'grant_user_reward');

-- 3) Colunas helper base (0032 ativo)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name like 'helper_base_%'
order by column_name;

-- 4) Colunas requests budget/geo (0017 ativo)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'requests'
  and column_name in ('latitude','longitude','budget_type','budget_amount','currency','preferred_period')
order by column_name;

-- 5) Signup bonus scale (esperado: 20, não 12000)
select reward_type, amount, count(*)
from public.user_bonus_rewards
where reward_type = 'SIGNUP_HELPER'
group by 1, 2;
```

Scripts de verificação existentes no repo (complementares):

- `supabase/verify_no_legacy_linkcredits.sql` — escala ×1000 legada
- `supabase/verify_helper_application_flow.sql`
- `supabase/verify_opportunity_unlock_refunds.sql`

---

## Scripts `supabase/apply_*.sql` (fora de `migrations/`)

Estes arquivos **não** entram no chain automático do CLI. Podem representar drift se foram aplicados manualmente no remoto sem migration correspondente:

- `apply_profiles_region.sql`, `apply_client_welcome_30_onboarding.sql`
- `apply_helper_application_flow.sql`, `apply_accept_proposal_flow.sql`
- `apply_fix_linkcredits_scale.sql`, `apply_credit_backend_fix.sql`
- `apply_lead_quality_score_fix.sql`, `apply_requests_address_budget.sql`
- … e outros em `supabase/apply_*.sql`

**Ação recomendada:** após obter `db diff`, consolidar patches `apply_*` já aplicados em produção numa migration `0046_*` ou número superior livre ou marcar como histórico.

---

## Próximos passos

1. Rodar `supabase db diff --linked` numa máquina com CLI funcional + credenciais.
2. Colar saída em `supabase/db_diff_output.sql` e atualizar esta seção.
3. Confirmar `schema_migrations` remoto vs. nomes `_DEPRECATED`.
4. Duplicatas removidas do chain ativo e preservadas em `supabase/deprecated_migrations/` — **feito em 2026-07-04**.
5. Se `reconcile_helper_signup_bonus` existir só no remoto, decidir: manter função via nova migration ou dropar após backfill confirmado.
