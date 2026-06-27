# LinkHelp — Status de Migrations e Scripts SQL

**Data da auditoria:** 2026-06-18  
**Última atualização:** 2026-06-18 (verify em produção concluído)  
**Escopo:** auditoria estática do repo + confirms read-only via `verify_*.sql` em produção.

---

## Resumo executivo

| Métrica | Valor |
|--------|-------|
| Arquivos em `supabase/migrations/` | **45** (42 números únicos: 0001–0042) |
| Números duplicados | **3** pares: `0016`, `0017`, `0032` |
| Scripts `apply_*.sql` | **25** |
| Scripts `verify_*.sql` | **20** |
| Scripts `audit_*.sql` | **6** |
| Última migration numerada | `0042_opportunity_unlock_refunds.sql` |

### Situação geral

O LinkHelp evoluiu com **duas vias paralelas**:

1. **Migrations numeradas** (`0001`–`0042`) — histórico versionado no repo.
2. **Scripts manuais** (`apply_*`, `verify_*`, `audit_*`) — colados no SQL Editor do Supabase quando algo quebrava em produção.

Produção foi **confirmada via verify read-only** em 2026-06-18 ([checklist](./VERIFY_PRODUCTION_CHECKLIST.md)). Scripts `apply_*` ainda precisam virar migrations numeradas para reprodutibilidade — ver **[MIGRATION_CONSOLIDATION_PLAN.md](./MIGRATION_CONSOLIDATION_PLAN.md)** (Etapa 3).

### Achados críticos

1. **Números de migration duplicados** — `supabase db push` / CLI não sabe qual arquivo aplicar primeiro dentro do mesmo número.
2. **`helper_submit_application` redefinida 6+ vezes** no repo (0039 → 0041 → 0042 → vários `apply_*`). Em produção vale a **última versão aplicada manualmente**, não necessariamente a migration mais alta.
3. **0041 vs `apply_helper_exclusive_application_fix`** — a migration adiciona `is_exclusive` e estende o RPC; o apply adiciona também `requests.exclusive_helper_id`, `request_has_exclusive_lock` e trigger de sync. **Divergência de schema.**
4. **Fluxos de cliente recentes só existem em `apply_*`** — `client_publish_request`, `confirm_client_stripe_linkcredit_purchase`, `complete_client_onboarding`, ledger `client_credit_ledger`. Não há migration numerada equivalente.
5. **`refund_opportunity_unlock`** — criada em `0012`, **removida** em `0042` (substituída por job automático `process_expired_unlock_refunds`). Código legado que ainda chame o RPC antigo falhará após 0042.
6. **`apply_service_workflow.sql`** — workflow de serviço (awaiting confirmation, review +3 LC) **sem migration numerada** no repo.

### Status confirmado em produção

**Fonte:** `verify_*.sql` read-only no Supabase SQL Editor, 2026-06-18 — [detalhes](./VERIFY_PRODUCTION_CHECKLIST.md).

| Script / área | Verify | Evidência |
|---------------|--------|-----------|
| `apply_normalize_client_profile_credits.sql` | `verify_client_profile_credits` | ✅ suspect_count = 0; RPCs sem literais legados |
| `apply_client_welcome_30_onboarding.sql` | `verify_client_welcome_30_onboarding` | ✅ ledger, onboarding RPC, CLIENT_WELCOME_30 |
| `apply_client_publish_request_debit.sql` | `verify_client_publish_request_debit` | ✅ `client_publish_request`; ledger `REQUEST_PUBLISH` |
| `apply_client_stripe_credit_purchase.sql` | `verify_client_stripe_credit_purchase` | ✅ `confirm_client_stripe_linkcredit_purchase`; ledger `CREDIT_PURCHASE` |
| `0036` + `apply_fix_stripe_credit_purchase.sql` | `verify_stripe_purchase` | ✅ `payment_events` paid; colunas Stripe OK (read-only, sem RPC test) |
| `apply_vip_partial_refund.sql` | `verify_vip_partial_refund` | ✅ partial refund; bypass cap 3 apps |
| `0022` / `apply_helper_category_preferences.sql` | `verify_helper_category_preferences` | ✅ colunas categoria |
| `0032+0033` / `apply_update_helper_base_address.sql` | `verify_update_helper_base_address` | ✅ `helper_base_*`, RPC, trigger |
| `apply_client_reject_vip_application.sql` | `verify_client_reject_vip_application` | ✅ RPC reject + sync trigger; 0 stale locks |
| `apply_fix_linkcredits_scale.sql` | `verify_no_legacy_linkcredits` | ✅ escala real; wallets helper OK |

**Ledger cliente em produção:** `FREE_BONUS`, `REQUEST_PUBLISH`, `CREDIT_PURCHASE` operacionais.

**Inferido (prereq dos verifies VIP/reject):** `apply_helper_exclusive_application_fix.sql` — `exclusive_helper_id`, `is_exclusive`, `request_has_exclusive_lock` presentes (verify reject + VIP passaram).

Demais `apply_*`: ainda **⏳ não verify** nesta rodada — ver tabela abaixo.

---

## Produção — verify concluído

**Rodada:** 2026-06-18 — **10/10 OK** (read-only).  
→ **[VERIFY_PRODUCTION_CHECKLIST.md](./VERIFY_PRODUCTION_CHECKLIST.md)**

| Prioridade | Script verify | Resultado | Confirma apply / migration |
|------------|---------------|-----------|----------------------------|
| **P0** | `verify_client_profile_credits` | ✅ | `apply_normalize_client_profile_credits` |
| **P0** | `verify_client_welcome_30_onboarding` | ✅ | `apply_client_welcome_30_onboarding` |
| **P0** | `verify_client_publish_request_debit` | ✅ | `apply_client_publish_request_debit` |
| **P0** | `verify_client_stripe_credit_purchase` | ✅ | `apply_client_stripe_credit_purchase` |
| **P0** | `verify_stripe_purchase` | ✅ | `0036` + `apply_fix_stripe_credit_purchase` |
| **P0** | `verify_vip_partial_refund` | ✅ | `apply_vip_partial_refund` |
| **P1** | `verify_helper_category_preferences` | ✅ | `0022` / `apply_helper_category_preferences` |
| **P1** | `verify_update_helper_base_address` | ✅ | `0032+0033` / `apply_update_helper_base_address` |
| **P1** | `verify_client_reject_vip_application` | ✅ | `apply_client_reject_vip_application` |
| **P2** | `verify_no_legacy_linkcredits` | ✅ | `apply_fix_linkcredits_scale` |

**Ainda não verify nesta rodada:** `verify_accept_proposal_flow`, `verify_service_workflow`, `verify_opportunity_unlock_refunds`, `verify_helper_exclusive_application` (tem `NOTIFY`), demais da lista excluída no checklist.

**Scripts verify excluídos** (contêm `NOTIFY pgrst` ou RPC manual): ver checklist.

---

## Plano de consolidação (Etapa 3)

**Documento:** [MIGRATION_CONSOLIDATION_PLAN.md](./MIGRATION_CONSOLIDATION_PLAN.md)

Resumo:

- **Não renomear** migrations `0001`–`0042` nem deletar `apply_*.sql`.
- **Novas migrations** apenas a partir de **`0043`**, idempotentes, espelhando estado já em prod.
- **Ordem P0:** stack cliente (`0043`–`0046`) → Stripe helper (`0047`–`0048`) → VIP/exclusive consolidado (`0049`–`0051`).
- **`supabase db push` em prod:** proibido sem revisar `schema_migrations` e checklist do plano.
- **Duplicatas 0016 / 0017 / 0032:** contornar com migrations novas; arquivos antigos permanecem.

---

## Tabela de migrations (`supabase/migrations/`)

Ordem alfabética. **⚠️** = número duplicado.

| # | Arquivo | Conteúdo principal |
|---|---------|-------------------|
| 0001 | `0001_linkhelp_production.sql` | Schema base: `profiles` (incl. `credits`), `requests`, `applications`, triggers signup |
| 0002 | `0002_profiles_insert_and_google_meta.sql` | Insert policy + meta Google |
| 0003 | `0003_applications_cancelled_profiles_location.sql` | Status cancelled + location |
| 0004 | `0004_profiles_terms_acceptance.sql` | Termos |
| 0005 | `0005_profiles_insert_policy.sql` | RLS insert profiles |
| 0006 | `0006_storage_and_portfolio.sql` | Storage + portfolio |
| 0007 | `0007_security_hardening.sql` | Hardening |
| 0008 | `0008_cleanup_demo_data.sql` | Limpeza demo |
| 0009 | `0009_request_location_schedule.sql` | Localização/agenda request |
| 0010 | `0010_profiles_region.sql` | `profiles.region` |
| 0011 | `0011_profiles_region_auth_and_backfill.sql` | Region auth + backfill |
| 0012 | `0012_helper_credit_marketplace.sql` | `credit_wallets`, `credit_transactions`, `refund_opportunity_unlock` |
| 0013 | `0013_helper_credit_foundation.sql` | Fundação créditos helper |
| 0014 | `0014_request_address_columns.sql` | Colunas endereço request |
| 0015 | `0015_onboarding_linkcredits_rewards.sql` | `grant_user_reward`, signup credits (valores legados ×1000) |
| ⚠️ 0016 | `0016_fix_applications_insert_rls.sql` | Fix RLS insert applications |
| ⚠️ 0016 | `0016_helper_signup_12_lc.sql` | Bônus signup 12 LC |
| ⚠️ 0017 | `0017_requests_address_budget_columns.sql` | `address`, `budget_min/max` em requests |
| ⚠️ 0017 | `0017_signup_profile_recovery.sql` | Recovery signup profile |
| 0018 | `0018_profile_spoken_languages.sql` | `spoken_languages` |
| 0019 | `0019_fix_signup_profile_trigger.sql` | Fix trigger signup |
| 0020 | `0020_push_subscriptions.sql` | Push subscriptions |
| 0021 | `0021_profile_role_locked.sql` | Role locked |
| 0022 | `0022_helper_category_preferences.sql` | `primary_category`, `secondary_categories` |
| 0023 | `0023_application_proposed_amount.sql` | `applications.proposed_amount` |
| 0024 | `0024_helper_signup_20_lc.sql` | Signup 20 LC |
| 0025 | `0025_ensure_helper_wallet_signup_20.sql` | Wallet signup 20 |
| 0026 | `0026_reviews_unique_and_rating_sync.sql` | Reviews |
| 0027 | `0027_helper_paid_credit_model.sql` | Modelo pago helper |
| 0028 | `0028_conversation_single_thread.sql` | Conversa single thread |
| 0029 | `0029_request_preferred_period.sql` | Período preferido |
| 0030 | `0030_timezone_market_signals.sql` | Timezone + sinais |
| 0031 | `0031_lead_quality_and_market_analytics.sql` | Lead quality |
| ⚠️ 0032 | `0032_helper_base_address.sql` | `helper_base_*` colunas |
| ⚠️ 0032 | `0032_reconcile_helper_signup_bonus_20_lc.sql` | Reconcile bônus 20 LC |
| 0033 | `0033_helper_base_address_lock.sql` | Lock base address + `update_helper_base_address` |
| 0034 | `0034_fix_client_hire_helper_flow.sql` | `client_accept_proposal`, `charge_helper_on_client_hire` |
| 0035 | `0035_fix_lead_quality_budget_columns.sql` | Fix lead quality budget |
| 0036 | `0036_stripe_linkcredits_payments.sql` | `payment_events`, `confirm_stripe_linkcredit_purchase`, wallets |
| 0037 | `0037_helper_not_interested_select.sql` | Not interested |
| 0038 | `0038_helper_debit_application_interest.sql` | `helper_debit_application_interest` |
| 0039 | `0039_helper_submit_application.sql` | `helper_submit_application` (7 args, sem exclusive) |
| 0040 | `0040_push_notification_triggers.sql` | Triggers push |
| 0041 | `0041_exclusive_helper_applications.sql` | `is_exclusive` + `helper_submit_application` (8 args) |
| 0042 | `0042_opportunity_unlock_refunds.sql` | Unlock refunds job, `helper_submit_application` (com unlock), drop `refund_opportunity_unlock` |

### Conflitos nos números solicitados

| Número | Arquivos | Risco |
|--------|----------|-------|
| **0016** | `fix_applications_insert_rls` + `helper_signup_12_lc` | Ordem de aplicação indefinida na CLI |
| **0017** | `requests_address_budget_columns` + `signup_profile_recovery` | Idem |
| **0032** | `helper_base_address` + `reconcile_helper_signup_bonus_20_lc` | Idem; colunas base vs reconcile bônus |
| **0041** | Único arquivo | OK — mas incompleto vs `apply_helper_exclusive_application_fix` |
| **0042** | Único arquivo | OK — redefine `helper_submit_application` de novo |

---

## Tabela de scripts soltos

### `apply_*.sql` (25)

| Script | Status prod | Classificação | Migration equivalente | Notas |
|--------|-------------|---------------|----------------------|-------|
| `apply_accept_proposal_flow.sql` | ⏳ | ❌ Substituído pelo repo | **0034** | Comentário no arquivo: "Same as 0034". Manter só como runbook até arquivar. |
| `apply_account_deletion_fix.sql` | ⏳ | 🔁 Virar migration | — | `profiles.deleted_at` + `confirm_initial_profile_role` UPSERT |
| `apply_application_count_fix.sql` | ⏳ | 🔁 Virar migration | — | `requests.application_count` + trigger; não está em migrations |
| `apply_bug1_accepted_amount.sql` | ⏳ | ❌ Substituído | **0023** | Hotfix quando 0023 não tinha sido aplicada |
| `apply_bug2_profile_role_fix.sql` | ⏳ | 🔁 Virar migration | Parcial **0019/0021** | UPSERT em `confirm_initial_profile_role` |
| `apply_client_publish_request_debit.sql` | ✅ | 🔁 Virar migration | — | RPC `client_publish_request`; ledger `request_id` |
| `apply_client_reject_vip_application.sql` | ✅ | 🔁 Virar migration | — | Verify 2026-06-18: RPC + trigger sync OK |
| `apply_client_stripe_credit_purchase.sql` | ✅ | 🔁 Virar migration | — | Verify 2026-06-18: CREDIT_PURCHASE no ledger |
| `apply_client_welcome_30_onboarding.sql` | ✅ | 🔁 Virar migration | — | Verify 2026-06-18: ledger FREE_BONUS + onboarding RPC |
| `apply_credit_backend_fix.sql` | ⏳ | ❌ Substituído | **0012, 0013** | Hotfix schema cache / RLS wallets |
| `apply_fix_linkcredits_scale.sql` | ✅ | 🔁 Virar migration | Corrige **0015** | Verify 2026-06-18: sem suspeitos ×1000 |
| `apply_fix_stripe_credit_purchase.sql` | ✅ | 🔁 Virar migration | Estende **0036** | Verify 2026-06-18: payment_events paid; colunas OK |
| `apply_helper_application_flow.sql` | ⏳ | ❌ Substituído | **0039** | Supersedido por 0041/0042/apply_vip |
| `apply_helper_category_preferences.sql` | ✅ | ❌ Substituído | **0022** | Verify 2026-06-18: colunas OK |
| `apply_helper_exclusive_application_fix.sql` | ✅* | 🔁 Virar migration | Parcial **0041** | *Inferido: prereq VIP reject + partial refund OK |
| `apply_indirect_trigger_return_fix.sql` | ⏳ | 🔁 Virar migration | — | Fix RETURN em triggers indiretos (candidatura) |
| `apply_lead_quality_score_fix.sql` | ⏳ | 🔁 Virar migration | **0031, 0035** | Hotfix quando 0031 não aplicada |
| `apply_normalize_client_profile_credits.sql` | ✅ | 🔁 Virar migration | Altera **0015** | Verify 2026-06-18: escala cliente OK |
| `apply_profile_account_settings.sql` | ⏳ | 🔁 Virar migration | Parcial **0018** | `address_updated_at` |
| `apply_profiles_region.sql` | ⏳ | ❌ Substituído | **0010, 0011** | Runbook combinado |
| `apply_requests_address_budget.sql` | ⏳ | ❌ Substituído | **0017** + **0014** | Hotfix PGRST204 colunas request |
| `apply_service_workflow.sql` | ⏳ | 🔁 Virar migration | — | Max 3 apps, awaiting confirmation, review +3 LC — **sem migration** |
| `apply_trigger_return_fix.sql` | ⏳ | 🔁 Virar migration | Parcial **0040** | Fix RETURN triggers push/application |
| `apply_update_helper_base_address.sql` | ✅ | ❌ Substituído | **0032, 0033** | Verify 2026-06-18: colunas + RPC + trigger OK |
| `apply_vip_partial_refund.sql` | ✅ | 🔁 Virar migration | Estende **0041/0042** | Verify 2026-06-18: partial refund + VIP bypass cap |

**Legenda:** ✅ confirmado aplicado · ⏳ não confirmado · 🔁 precisa virar migration · ❌ obsoleto/substituído (pode arquivar depois)

### `verify_*.sql` (20)

Scripts **read-only** de diagnóstico pós-apply. Não alteram schema.

| Script | Par apply relacionado |
|--------|----------------------|
| `verify_accept_proposal_flow.sql` | `apply_accept_proposal_flow` / 0034 |
| `verify_client_profile_credits.sql` | `apply_normalize_client_profile_credits` |
| `verify_client_publish_request_debit.sql` | `apply_client_publish_request_debit` |
| `verify_client_reject_vip_application.sql` | `apply_client_reject_vip_application` |
| `verify_client_stripe_credit_purchase.sql` | `apply_client_stripe_credit_purchase` |
| `verify_client_welcome_30_onboarding.sql` | `apply_client_welcome_30_onboarding` |
| `verify_credit_backend.sql` | `apply_credit_backend_fix` |
| `verify_dispatch_push_trigger_return_fix.sql` | `apply_trigger_return_fix` |
| `verify_helper_application_flow.sql` | `apply_helper_application_flow` / 0039 |
| `verify_helper_category_preferences.sql` | `apply_helper_category_preferences` / 0022 |
| `verify_helper_exclusive_application.sql` | `apply_helper_exclusive_application_fix` / 0041 |
| `verify_indirect_trigger_return_fix.sql` | `apply_indirect_trigger_return_fix` |
| `verify_lead_quality_score_fix.sql` | `apply_lead_quality_score_fix` |
| `verify_no_legacy_linkcredits.sql` | `apply_fix_linkcredits_scale` |
| `verify_opportunity_unlock_refunds.sql` | 0042 |
| `verify_service_workflow.sql` | `apply_service_workflow` |
| `verify_stripe_purchase.sql` | 0036 / `apply_fix_stripe_credit_purchase` |
| `verify_trigger_return_fix.sql` | `apply_trigger_return_fix` |
| `verify_update_helper_base_address.sql` | `apply_update_helper_base_address` / 0033 |
| `verify_vip_partial_refund.sql` | `apply_vip_partial_refund` |

### `audit_*.sql` (6)

Scripts de investigação de triggers (read-only / diagnóstico).

| Script | Propósito |
|--------|-----------|
| `audit_all_triggers_return_status.sql` | Lista triggers sem RETURN correto |
| `audit_application_flow_triggers.sql` | Triggers no fluxo de candidatura |
| `audit_indirect_trigger_cascade.sql` | Cascata de triggers indiretos |
| `audit_specific_trigger_functions.sql` | Funções de trigger específicas |
| `audit_trigger_return_diagnosis.sql` | Diagnóstico RETURN |
| `audit_trigger_runtime_error_minimal.sql` | Erro mínimo reproduzível |

---

## RPCs críticas — onde são definidas

| RPC | Migrations | apply_*.sql | Observação |
|-----|------------|-------------|------------|
| `helper_submit_application` | 0039, 0041, 0042 | `apply_helper_application_flow`, `apply_helper_exclusive_application_fix`, `apply_vip_partial_refund`, `apply_service_workflow` (parcial) | **Múltiplas versões**; assinatura evoluiu para 8 args + `p_is_exclusive`. Prod provavelmente tem versão de `apply_vip_partial_refund` se VIP funciona. |
| `client_accept_proposal` | 0034 | `apply_accept_proposal_flow` | Equivalente apply = migration |
| `confirm_stripe_linkcredit_purchase` | 0036 | `apply_fix_stripe_credit_purchase` (colunas + diagnóstico) | Helper Stripe webhook |
| `complete_client_onboarding` | — | `apply_client_welcome_30_onboarding` | **Só em apply** |
| `request_has_exclusive_lock` | — | `apply_helper_exclusive_application_fix` | **Só em apply** |
| `refund_opportunity_unlock` | 0012 (create) | — | **Drop em 0042** — obsoleta |
| `update_helper_base_address` | 0033 | `apply_update_helper_base_address` | Equivalente |
| `client_publish_request` | — | `apply_client_publish_request_debit` | **Só em apply** ✅ prod |
| `confirm_client_stripe_linkcredit_purchase` | — | `apply_client_stripe_credit_purchase` | **Só em apply** ✅ prod |
| `process_vip_exclusive_partial_refunds` | — | `apply_vip_partial_refund` | **Só em apply** ✅ prod |

### Cadeia de dependência `helper_submit_application` (repo)

```
0039 (base 7-arg)
  → 0041 (+ is_exclusive, 8-arg)
    → 0042 (+ opportunity_unlock attach, drop refund_opportunity_unlock)
      → apply_vip_partial_refund (VIP debit + partial refunds + preserve 0042 unlock)
        → apply_helper_exclusive_application_fix (exclusive_helper_id lock — pode ter sido aplicado antes ou depois)
```

**Risco:** ordem de aplicação manual pode ter deixado corpo de função de uma versão com schema de outra.

---

## Tabelas / colunas críticas — onde são criadas

| Objeto | Onde é criado / alterado |
|--------|--------------------------|
| `profiles.credits` | **0001** (`int default 0`). Uso cliente: `apply_normalize_client_profile_credits`, `apply_client_welcome_30_onboarding`, `apply_client_publish_request_debit`, `apply_client_stripe_credit_purchase` |
| `profiles.client_onboarding_completed_at` | **apply_client_welcome_30_onboarding** apenas |
| `profiles.primary_category` | **0022**, **apply_helper_category_preferences** (dup) |
| `profiles.secondary_categories` | **0022**, **apply_helper_category_preferences** (dup) |
| `profiles.helper_base_address` | **0032**, **apply_update_helper_base_address** |
| `profiles.helper_base_city` | **0032**, **apply_update_helper_base_address** |
| `profiles.helper_base_lat` | **0032**, **apply_update_helper_base_address** |
| `profiles.helper_base_lng` | **0032**, **apply_update_helper_base_address** |
| `client_credit_ledger` | **apply_client_welcome_30_onboarding**; estendido em publish + stripe applies |
| `credit_wallets` | **0012**, **0013**, **0036**, **apply_credit_backend_fix** |
| `credit_transactions` | **0012**, **0013**, **0027**, **0036**, **0038**, **0042**, **apply_fix_stripe_credit_purchase**, **apply_vip_partial_refund** (type extend) |
| `payment_events` | **0036** |
| `applications.is_exclusive` | **0041**, **apply_helper_exclusive_application_fix**, **apply_vip_partial_refund** |
| `requests.exclusive_helper_id` | **apply_helper_exclusive_application_fix** apenas (**não em 0041**) |

---

## Riscos encontrados

| # | Risco | Severidade | Mitigação futura |
|---|-------|------------|------------------|
| R1 | 3 pares de migration com mesmo número | Alta | Renumerar um arquivo de cada par (etapa futura) |
| R2 | Drift prod vs `supabase/migrations` — applies manuais não registrados na tabela de migrations | Alta | Snapshot schema prod + diff com repo |
| R3 | `helper_submit_application` — última definição desconhecida sem query em prod | Alta | `verify_vip_partial_refund` + inspecionar `pg_proc` |
| R4 | 0041 sem `exclusive_helper_id` mas apply VIP/exclusive depende da coluna | Alta | Consolidar em migration 0043+ |
| R5 | Fluxos cliente (publish, stripe, onboarding) só em apply — novo ambiente não reproduzível só com migrations | Média | Migrations 0043–0046 em ordem de dependência |
| R6 | `0015` grant ×1000 vs escala real 1 LC — mitigado por `apply_normalize_client_profile_credits` | Média | Migration que substitui grants legados |
| R7 | `refund_opportunity_unlock` removida em 0042 | Baixa | Confirmar que nenhum código chama o RPC |
| R8 | `apply_client_reject_vip_application` fora do tracking git em momentos | Média | Adicionar ao repo e verify em prod |
| R9 | `apply_service_workflow` sem migration — feature pode existir só em prod | Média | Verify + migration dedicada |

---

## Scripts que precisam virar migration (prioridade)

Ordem sugerida por dependência (não executar ainda — planejamento):

| Prioridade | Script(s) | Motivo |
|------------|-----------|--------|
| P0 | Resolver duplicatas **0016, 0017, 0032** | Desbloquear CLI/migrations |
| P1 | `apply_normalize_client_profile_credits` | Base escala cliente |
| P1 | `apply_client_welcome_30_onboarding` | Ledger + onboarding RPC |
| P1 | `apply_client_publish_request_debit` | ✅ já em prod |
| P1 | `apply_client_stripe_credit_purchase` | ✅ já em prod |
| P2 | `apply_helper_exclusive_application_fix` | `exclusive_helper_id` + lock RPC |
| P2 | `apply_vip_partial_refund` | ✅ já em prod |
| P2 | `apply_fix_stripe_credit_purchase` | Colunas helper stripe |
| P3 | `apply_service_workflow` | Workflow pós-contratação |
| P3 | `apply_application_count_fix` | Counter feed |
| P3 | `apply_account_deletion_fix`, `apply_bug2_profile_role_fix` | Auth/role robustez |
| P3 | `apply_client_reject_vip_application` | Rejeição VIP |
| P4 | `apply_fix_linkcredits_scale`, `apply_lead_quality_score_fix` | Dívida técnica / hotfixes |
| P4 | `apply_profile_account_settings`, trigger fixes | UX settings + estabilidade |

---

## Scripts que podem ser arquivados depois (não agora)

Quando migrations equivalentes estiverem aplicadas e verify OK em prod:

- `apply_accept_proposal_flow.sql` → coberto por **0034**
- `apply_helper_application_flow.sql` → coberto por **0039+**
- `apply_helper_category_preferences.sql` → coberto por **0022**
- `apply_profiles_region.sql` → coberto por **0010+0011**
- `apply_requests_address_budget.sql` → coberto por **0017+0014**
- `apply_update_helper_base_address.sql` → coberto por **0032+0033**
- `apply_credit_backend_fix.sql` → coberto por **0012+0013**
- `apply_bug1_accepted_amount.sql` → coberto por **0023**

Manter `verify_*` e `audit_*` como runbook até haver testes automatizados ou CI de schema.

---

## Ordem recomendada para limpeza futura (Etapas 4+)

Detalhamento completo em [MIGRATION_CONSOLIDATION_PLAN.md](./MIGRATION_CONSOLIDATION_PLAN.md).

1. **Etapa 4 — Migrations `0043+` (cliente P0)**  
   `apply_normalize` → welcome → publish → stripe purchase (idempotentes).

2. **Etapa 5 — Helper Stripe + VIP consolidado**  
   `0047`–`0051`: colunas Stripe, exclusive lock, `helper_submit_application` final.

3. **Etapa 6 — Verify restantes + migrations P1/P2**  
   service workflow, account deletion, application count, triggers.

4. **Etapa 7 — Arquivar applies**  
   `git mv` para `supabase/archive/manual-applied/` (sem deletar).

5. **Etapa 8 — Alinhar `schema_migrations`**  
   Registrar migrations no histórico Supabase ou documentar baseline prod.

---

## O que NÃO deve ser mexido agora

- **Banco de produção** — nenhum `apply`/`verify` executado nesta etapa de auditoria
- **Deletar ou renomear** arquivos SQL existentes
- **Criar migrations novas** (0043+)
- **Frontend**, **Stripe** (`api/stripe/`), **webhooks**
- **`stash@{0}`** — não aplicar
- **Navbar brand** (regra congelada do projeto)
- **Commits** — aguardar aprovação após revisão deste documento

---

## Checklist de aceite (Etapa 1)

- [x] Nenhum SQL executado em produção
- [x] Nenhum arquivo deletado
- [x] Nenhuma migration criada
- [x] Apenas `supabase/MIGRATION_STATUS.md` criado
- [x] Migrations listadas com duplicatas identificadas
- [x] Scripts apply/verify/audit listados e classificados
- [x] RPCs e colunas críticas mapeadas
- [x] Riscos e ordem de limpeza documentados

## Checklist de aceite (Etapa 2)

- [x] Nenhum SQL executado nesta atualização de documentação
- [x] Nenhum `apply_*.sql` incluído
- [x] `VERIFY_PRODUCTION_CHECKLIST.md` criado e preenchido
- [x] `MIGRATION_STATUS.md` atualizado com verify concluído
- [x] 10 scripts verify prioritários confirmados read-only no repo
- [x] Usuário rodou verifies em produção — **10/10 OK**
- [x] Tabela `apply_*.sql` atualizada com ✅ pós-verify

## Checklist de aceite (Etapa 3)

- [x] Nenhum SQL executado
- [x] Nenhum arquivo deletado ou renomeado
- [x] Nenhuma migration `0043+` criada
- [x] `MIGRATION_CONSOLIDATION_PLAN.md` criado
- [x] `MIGRATION_STATUS.md` atualizado com link ao plano
- [ ] Commit — aguardando autorização

---

*Documento atualizado após verify em produção (2026-06-18). Próximo passo: [Etapa 4 — migrations `0043+`](./MIGRATION_CONSOLIDATION_PLAN.md#fase-1--migrations-cliente-p0-00430046).*
