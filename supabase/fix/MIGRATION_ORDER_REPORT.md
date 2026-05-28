# Relatório — ordem das migrations Supabase (sistema de créditos)

**Data:** 2026-05-28  
**Problema reportado:** `0027_helper_paid_credit_model.sql` falhou com  
`relation "public.credit_transactions" does not exist`

---

## Causa raiz

A migration **0027** assume que **0012** (e idealmente **0013** / **0015** / **0025**) já foram aplicadas.  
Ela faz `ALTER TABLE public.credit_transactions` — tabela criada apenas em:

| Objeto | Migration que cria |
|--------|-------------------|
| `public.credit_wallets` | `0012_helper_credit_marketplace.sql` |
| `public.credit_transactions` | `0012_helper_credit_marketplace.sql` |
| `public.opportunity_unlocks` | `0012_helper_credit_marketplace.sql` |
| `public.credit_packages` | `0012_helper_credit_marketplace.sql` |
| `public.user_bonus_rewards` | `0015_onboarding_linkcredits_rewards.sql` |
| Colunas `request_id`, `application_id`, `balance_before` | `0027` |
| Tipos `APPLICATION_INTEREST`, `APPLICATION_SELECTED` | `0027` (constraint) |
| RPC `helper_debit_application_interest` | `0027` |
| RPC `ensure_conversation` | `0028` (requer `conversations`) |
| Coluna `requests.preferred_period` | `0029` |

**Nota:** `0001_linkhelp_production.sql` contém `drop table if exists public.credit_transactions` no bootstrap inicial — o sistema de créditos **não** vem do 0001; vem do **0012**.

---

## Migrations encontradas (31 arquivos)

Ordem lexicográfica (como o Supabase CLI aplica):

1. `0001_linkhelp_production.sql` — schema base (profiles, requests, applications, conversations…)
2. `0002_profiles_insert_and_google_meta.sql`
3. `0003_applications_cancelled_profiles_location.sql`
4. `0004_profiles_terms_acceptance.sql`
5. `0005_profiles_insert_policy.sql`
6. `0006_storage_and_portfolio.sql`
7. `0007_security_hardening.sql`
8. `0008_cleanup_demo_data.sql`
9. `0009_request_location_schedule.sql`
10. `0010_profiles_region.sql`
11. `0011_profiles_region_auth_and_backfill.sql`
12. **`0012_helper_credit_marketplace.sql`** ← **cria credit_transactions e credit_wallets**
13. **`0013_helper_credit_foundation.sql`** ← RPCs ledger, `ensure_helper_credit_wallet`
14. `0014_request_address_columns.sql`
15. **`0015_onboarding_linkcredits_rewards.sql`** ← `user_bonus_rewards`
16. `0016_fix_applications_insert_rls.sql` ⚠️ duplicado `0016`
17. `0016_helper_signup_12_lc.sql` ⚠️ duplicado `0016`
18. `0017_requests_address_budget_columns.sql` ⚠️ duplicado `0017` (`budget_type` — usado em 0027)
19. `0017_signup_profile_recovery.sql` ⚠️ duplicado `0017`
20. `0018_profile_spoken_languages.sql`
21. `0019_fix_signup_profile_trigger.sql`
22. `0020_push_subscriptions.sql`
23. `0021_profile_role_locked.sql`
24. `0022_helper_category_preferences.sql`
25. `0023_application_proposed_amount.sql`
26. `0024_helper_signup_20_lc.sql`
27. `0025_ensure_helper_wallet_signup_20.sql`
28. `0026_reviews_unique_and_rating_sync.sql`
29. **`0027_helper_paid_credit_model.sql`** ← depende de 0012+
30. **`0028_conversation_single_thread.sql`** ← depende de conversations/messages
31. **`0029_request_preferred_period.sql`** ← depende de requests

⚠️ **Conflito de numeração:** existem dois `0016_*` e dois `0017_*`. Em ambientes novos, renomear para `0016a`/`0016b` evita ambiguidade.

---

## Ordem correta para o sistema de créditos

Mínimo antes de **0027**:

```
0001 → 0012 → 0013 → 0015 → 0017_requests_address_budget_columns → 0024 → 0025 → 0027
```

Para **0028** e **0029**:

```
… → 0027 → 0028 → 0029
```

(0028 e 0029 não dependem de créditos, mas fazem parte do pacote recente do app.)

---

## O que estava faltando no seu banco

Provavelmente **não executado**:

- `0012_helper_credit_marketplace.sql` (tabelas `credit_*`)
- Possivelmente `0013`, `0015`, `0025` (wallet + bônus signup 20 LC)

Por isso **0027** falhou na primeira linha (`alter table credit_transactions`).

---

## Arquivo consolidado gerado

**`supabase/fix/full_credit_system_setup.sql`**

Conteúdo idempotente (`IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP CONSTRAINT IF EXISTS`):

| Seção | Origem consolidada |
|-------|-------------------|
| Pré-requisitos | Verifica `profiles`, `requests`, `applications` |
| Tabelas credit_* | 0012 |
| Colunas 0027 + budget em requests | 0027 + 0017 |
| `user_bonus_rewards` | 0015 |
| Índices, triggers, RLS | 0012 |
| Constraint de tipos de transação | 0027 |
| `request_market_metrics` | 0027 |
| Pacotes LC atualizados | 0027 |
| RPCs foundation | 0013 + 0024/0025 |
| RPCs helper-paid | 0027 |
| Chat single-thread | 0028 |
| `preferred_period` | 0029 |

**Não remove dados.** Duplicatas de conversa em 0028 são fundidas (mensagens migradas, linha duplicada apagada).

---

## Como aplicar no Supabase SQL Editor

### Opção A — banco sem créditos (seu caso)

1. Executar **`supabase/fix/full_credit_system_setup.sql`** (uma vez).
2. Opcional: reexecutar `0027`, `0028`, `0029` — seções já cobertas serão no-op ou `IF NOT EXISTS`.

### Opção B — migrations incrementais

Aplicar na ordem da tabela acima, **nunca** pular 0012 antes de 0027.

---

## Validação 0027 / 0028 / 0029

| Migration | Depende de | Coberta no fix? |
|-----------|------------|-----------------|
| **0027** | `credit_transactions`, `credit_wallets`, `credit_packages`, `requests.budget_*`, `applications` | Sim |
| **0028** | `conversations`, `messages` | Sim (skip se `conversations` ausente) |
| **0029** | `requests` | Sim |

### Checks SQL pós-deploy

```sql
select to_regclass('public.credit_transactions');
select to_regclass('public.credit_wallets');
select column_name from information_schema.columns
  where table_name = 'credit_transactions' and column_name in ('request_id','balance_before');
select proname from pg_proc where proname like 'helper_debit_application%';
select proname from pg_proc where proname = 'ensure_conversation';
select column_name from information_schema.columns
  where table_name = 'requests' and column_name = 'preferred_period';
```

---

## Próximo passo recomendado

No painel Supabase → SQL → colar e executar:

`supabase/fix/full_credit_system_setup.sql`

Depois confirmar com os `SELECT` acima.
