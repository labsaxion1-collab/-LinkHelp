# LinkHelp — Plano de Consolidação de Migrations

**Data:** 2026-06-18  
**Etapa:** 3 — planejamento técnico (sem alterar banco, sem criar migrations finais)  
**Pré-requisitos:** [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) · [VERIFY_PRODUCTION_CHECKLIST.md](./VERIFY_PRODUCTION_CHECKLIST.md)

---

## Resumo executivo

Produção está **funcional e confirmada** (10/10 verifies read-only, 2026-06-18). O gap é **reprodutibilidade**: grande parte do schema crítico existe só em `apply_*.sql` manuais, não em `supabase/migrations/`.

**Estratégia aprovada para esta fase:**

1. **Não renomear, não deletar, não reescrever** migrations `0001`–`0042` já versionadas.
2. **Não rodar `supabase db push` em produção** até haver plano de `schema_migrations` e migrations idempotentes `0043+`.
3. **Consolidar para frente** — novas migrations numeradas a partir de **`0043`**, copiando o estado **já aplicado** em prod (DDL/RPC idempotentes).
4. **Arquivar `apply_*.sql` só depois** que a migration equivalente existir, verify passar em staging e prod estiver marcada como “baseline + 0043+”.
5. **Duplicatas 0016 / 0017 / 0032** — documentar e contornar com migrations novas; **não corrigir renomeando arquivos antigos**.

**Próximo passo executável (Etapa 4):** criar `0043+` em ordem de dependência, começando pelo stack cliente (P0).

---

## O que já está confirmado em produção

Fonte: [VERIFY_PRODUCTION_CHECKLIST.md](./VERIFY_PRODUCTION_CHECKLIST.md) — rodada 2026-06-18.

| Apply / migration | Verify | Status |
|-------------------|--------|--------|
| `apply_normalize_client_profile_credits` | `verify_client_profile_credits` | ✅ |
| `apply_client_welcome_30_onboarding` | `verify_client_welcome_30_onboarding` | ✅ |
| `apply_client_publish_request_debit` | `verify_client_publish_request_debit` | ✅ |
| `apply_client_stripe_credit_purchase` | `verify_client_stripe_credit_purchase` | ✅ |
| `0036` + `apply_fix_stripe_credit_purchase` | `verify_stripe_purchase` | ✅ |
| `apply_vip_partial_refund` | `verify_vip_partial_refund` | ✅ |
| `0022` / `apply_helper_category_preferences` | `verify_helper_category_preferences` | ✅ |
| `0032+0033` / `apply_update_helper_base_address` | `verify_update_helper_base_address` | ✅ |
| `apply_client_reject_vip_application` | `verify_client_reject_vip_application` | ✅ |
| `apply_fix_linkcredits_scale` | `verify_no_legacy_linkcredits` | ✅ |
| `apply_helper_exclusive_application_fix` | *(inferido)* | ✅* |

**Ledger cliente:** `FREE_BONUS`, `REQUEST_PUBLISH`, `CREDIT_PURCHASE` operacionais.  
**Helper Stripe:** `payment_events` com registros `paid`.

**Ainda não verify nesta rodada:** accept proposal, service workflow, opportunity unlock refunds, account deletion, application count, trigger fixes, lead quality.

---

## Grupos de consolidação

### G1 — Cliente: credits / onboarding / publish / stripe

| Item | Detalhe |
|------|---------|
| **Migrations antigas** | `0001` (`profiles.credits`), `0015` (grants legados ×1000) |
| **Apply confirmados** | `apply_normalize_client_profile_credits`, `apply_client_welcome_30_onboarding`, `apply_client_publish_request_debit`, `apply_client_stripe_credit_purchase` |
| **Verify** | `verify_client_profile_credits`, `verify_client_welcome_30_onboarding`, `verify_client_publish_request_debit`, `verify_client_stripe_credit_purchase` |
| **Objetos-chave** | `profiles.credits`, `client_onboarding_completed_at`, `client_credit_ledger`, RPCs `complete_client_onboarding`, `client_publish_request`, `confirm_client_stripe_linkcredit_purchase` |
| **Risco de mexer agora** | **Alto** — fluxo financeiro cliente ativo; qualquer regression quebra publish (1 LC) e compra Stripe |
| **Virar migration?** | **Sim** — P0 |
| **Prioridade** | **P0** |

**Notas:** Nenhuma migration `0001`–`0042` cobre o stack completo. Futuras `0043`–`0046` devem ser **idempotentes** (`add column if not exists`, `create or replace function`). **Não** incluir migração de dados destrutiva em prod (normalize já rodou).

---

### G2 — Helper: credits / stripe / wallets

| Item | Detalhe |
|------|---------|
| **Migrations antigas** | `0012`, `0013`, `0024`–`0027`, `0036`, `0038`, `0042` |
| **Apply confirmados** | `apply_fix_stripe_credit_purchase` (via verify_stripe), `apply_fix_linkcredits_scale` (escala global) |
| **Verify** | `verify_stripe_purchase`, `verify_no_legacy_linkcredits` |
| **Objetos-chave** | `credit_wallets`, `credit_transactions`, `payment_events`, `confirm_stripe_linkcredit_purchase`, `helper_debit_application_interest`, unlock refunds (`0042`) |
| **Risco** | **Alto** — webhook Helper Stripe; wallets em uso |
| **Virar migration?** | Parcial — colunas Stripe (`apply_fix_stripe_credit_purchase`) sim; escala (`apply_fix_linkcredits_scale`) só RPC/constraints, **não** re-normalizar dados |
| **Prioridade** | **P0** (colunas Stripe) · **P2** (documentar escala já aplicada) |

**Notas:** Não alterar assinatura de `confirm_stripe_linkcredit_purchase` sem coordenar com `api/stripe/webhook` (fora do escopo SQL).

---

### G3 — Helper: categories / base address

| Item | Detalhe |
|------|---------|
| **Migrations antigas** | `0022`, `0032` (⚠️ dup), `0033` |
| **Apply confirmados** | `apply_helper_category_preferences` (dup 0022), `apply_update_helper_base_address` (dup 0032+0033) |
| **Verify** | `verify_helper_category_preferences`, `verify_update_helper_base_address` |
| **Objetos-chave** | `primary_category`, `secondary_categories`, `helper_base_*`, `update_helper_base_address`, trigger `profiles_protect_helper_base_fields` |
| **Risco** | **Baixo** — já coberto por migrations + verify OK; consolidação é documental |
| **Virar migration?** | **Opcional** — migration `004x` pode ser “noop idempotente” ou omitida se 0022+0033 bastam para greenfield |
| **Prioridade** | **P2** |

**Notas:** Para greenfield, `0022` + `0032_helper_base_address` + `0033` (ordem alfabética no dup 0032) já cobrem schema. Apply scripts podem ser arquivados **antes** dos outros grupos.

---

### G4 — VIP exclusive / partial refund / reject

| Item | Detalhe |
|------|---------|
| **Migrations antigas** | `0041`, `0042` (+ `0012` `refund_opportunity_unlock` **dropada** em 0042) |
| **Apply confirmados** | `apply_helper_exclusive_application_fix` (✅*), `apply_vip_partial_refund`, `apply_client_reject_vip_application` |
| **Verify** | `verify_vip_partial_refund`, `verify_client_reject_vip_application`; opcional `verify_helper_exclusive_application` (omitir `NOTIFY`) |
| **Objetos-chave** | `is_exclusive`, `exclusive_helper_id`, `request_has_exclusive_lock`, `process_vip_exclusive_partial_refunds`, `helper_submit_application` (versão VIP), `client_reject_application`, trigger sync |
| **Risco** | **Muito alto** — `helper_submit_application` redefinida 6+ vezes; ordem errada quebra candidatura, VIP, unlock |
| **Virar migration?** | **Sim** — uma migration **consolidada** que represente o corpo **atual de prod** (vip partial + exclusive fix), não replay de 0039→0041→0042 em sequência |
| **Prioridade** | **P0** (consolidação) · executar **depois** de extrair definição exata de `pg_proc` em prod |

**Notas:** `0041` não tem `exclusive_helper_id`. Migration futura deve **unificar** 0041 gaps + `apply_helper_exclusive_application_fix` + `apply_vip_partial_refund` num único `create or replace`.

---

### G5 — Accept proposal / service workflow / hire

| Item | Detalhe |
|------|---------|
| **Migrations antigas** | `0034`, `0027` (`charge_helper_on_client_hire`), `0023` (`proposed_amount`) |
| **Apply** | `apply_accept_proposal_flow` (= 0034, ❌ obsoleto), `apply_service_workflow` (⏳ **sem migration**) |
| **Verify** | `verify_accept_proposal_flow` (tem `NOTIFY`), `verify_service_workflow` (tem `NOTIFY`) |
| **Objetos-chave** | `client_accept_proposal`, `charge_helper_on_client_hire`, awaiting confirmation, review +3 LC, max 3 apps (overlap com VIP) |
| **Risco** | **Médio-alto** — contratação e conclusão de serviço; status ⏳ em prod |
| **Virar migration?** | **Sim** para `apply_service_workflow`; 0034 provavelmente já em prod mas **precisa verify** |
| **Prioridade** | **P1** |

**Pré-requisito Etapa 4:** rodar `verify_accept_proposal_flow` e `verify_service_workflow` (sem `NOTIFY` ou em staging).

---

### G6 — Account deletion / profile role

| Item | Detalhe |
|------|---------|
| **Migrations antigas** | `0019`, `0021` (parcial) |
| **Apply** | `apply_account_deletion_fix`, `apply_bug2_profile_role_fix` (⏳) |
| **Verify** | Nenhum dedicado |
| **Objetos-chave** | `profiles.deleted_at`, `confirm_initial_profile_role` UPSERT |
| **Risco** | **Médio** — auth/onboarding; bug de role já mitigado em prod? |
| **Virar migration?** | **Sim** — P1 após verify manual de coluna/RPC |
| **Prioridade** | **P1** |

---

### G7 — Legacy cleanup / escala LC / lead quality / triggers

| Item | Detalhe |
|------|---------|
| **Migrations antigas** | `0015`, `0031`, `0035`, `0040` |
| **Apply** | `apply_fix_linkcredits_scale` (✅), `apply_lead_quality_score_fix` (⏳), `apply_trigger_return_fix`, `apply_indirect_trigger_return_fix` (⏳) |
| **Verify** | `verify_no_legacy_linkcredits` (✅), `verify_lead_quality_score_fix`, audits `audit_*` |
| **Risco** | **Médio** — data migration perigosa; triggers em candidatura/push |
| **Virar migration?** | Escala: documentar como aplicada; lead/triggers: P2 |
| **Prioridade** | **P2** |

---

### G8 — Feed / UX auxiliar (não verify)

| Item | Detalhe |
|------|---------|
| **Apply** | `apply_application_count_fix`, `apply_profile_account_settings` |
| **Migrations** | Nenhuma |
| **Verify** | Nenhum |
| **Risco** | **Baixo-médio** — counter “interessados”; settings `address_updated_at` |
| **Prioridade** | **P2** |

---

### G9 — Runbooks obsoletos (não consolidar como novos)

| Apply | Substituído por |
|-------|-----------------|
| `apply_accept_proposal_flow` | `0034` |
| `apply_helper_application_flow` | `0039`+ |
| `apply_helper_category_preferences` | `0022` |
| `apply_profiles_region` | `0010`+`0011` |
| `apply_requests_address_budget` | `0014`+`0017` |
| `apply_update_helper_base_address` | `0032`+`0033` |
| `apply_credit_backend_fix` | `0012`+`0013` |
| `apply_bug1_accepted_amount` | `0023` |

**Ação:** arquivar por último; manter como referência histórica.

---

## Duplicatas de número — análise e proposta (sem renomear)

| Número | Arquivos | Ordem alfabética CLI | Conteúdo | Proposta segura |
|--------|----------|----------------------|----------|-----------------|
| **0016** | `0016_fix_applications_insert_rls` · `0016_helper_signup_12_lc` | fix → signup | RLS applications · grant 12 LC | **Manter arquivos.** Prod já tem ambos. Greenfield: CLI pode **falhar** (versão duplicada) ou aplicar os dois em ordem alfabética — **não confiar** sem teste em projeto vazio. Novos envs: baseline de prod ou migrations `0043+` idempotentes que não dependem de replay de 0016. |
| **0017** | `0017_requests_address_budget_columns` · `0017_signup_profile_recovery` | requests → signup | Colunas request · recovery signup | Idem. Ordem alfabética é razoável (schema antes de trigger recovery). |
| **0032** | `0032_helper_base_address` · `0032_reconcile_helper_signup_bonus_20_lc` | base → reconcile | Colunas base · reconcile wallet 20 LC | Idem. Base address deve vir antes do reconcile — alfabético ajuda. |

**Regra de ouro:** não renumerar `0016`/`0017`/`0032` existentes. Qualquer correção formal = **novo arquivo `0043+`** com comentário `-- consolidates manual state; safe on prod (idempotent)`.

**`supabase db push` em produção:** **proibido** até:

- `select * from supabase_migrations.schema_migrations` revisado;
- migrations `0043+` testadas em **staging** clonado;
- duplicatas entendidas (CLI pode recusar push completo do zero).

---

## Riscos consolidados

| ID | Risco | Impacto | Mitigação no plano |
|----|-------|---------|-------------------|
| C1 | Replay de migrations em prod já manual | Quebra RPC / dados | Só `0043+` idempotentes; nunca re-aplicar 0001–0042 em prod |
| C2 | `helper_submit_application` versão errada | Candidatura/VIP mortos | Exportar `pg_get_functiondef` de prod antes de escrever `004x` VIP |
| C3 | Duplicatas 0016/0017/0032 | `db push` falha em greenfield | Documentar baseline; não renomear; testar em projeto Supabase vazio |
| C4 | Data migration escala ×1000 | Corrompe saldos | `apply_fix_linkcredits_scale` **não** re-executar em prod; migration futura só `create or replace` RPCs |
| C5 | `schema_migrations` drift | CLI tenta re-aplicar tudo | Baseline manual: marcar 0001–0042 como applied OU usar `db pull` |
| C6 | Arquivar apply cedo demais | Perda de runbook | Arquivar só após migration + verify em staging |
| C7 | NOTIFY em verify scripts | Efeito colateral PostgREST | Omitir última linha ou usar staging |

---

## Plano em fases

### Fase 0 — Pré-voo (atual + imediato)

- [x] Etapa 1: `MIGRATION_STATUS.md`
- [x] Etapa 2: verify 10/10 em prod
- [x] Etapa 3: este plano
- [ ] Commitar `apply_client_reject_vip_application.sql` + `verify_client_reject_vip_application.sql` (untracked)
- [ ] Rodar verifies P1 restantes: accept proposal, service workflow (staging ou omitir NOTIFY)
- [ ] Export read-only: `pg_proc` para `helper_submit_application`, `client_publish_request`, `confirm_client_stripe_linkcredit_purchase`

### Fase 1 — Migrations cliente P0 (`0043`–`0046`)

Criar arquivos **novos**, idempotentes, espelhando applies já em prod:

| Migration futura | Fonte | Verify pós-staging |
|------------------|-------|-------------------|
| `0043_client_profile_credits_normalize.sql` | `apply_normalize_client_profile_credits` | `verify_client_profile_credits` |
| `0044_client_welcome_onboarding.sql` | `apply_client_welcome_30_onboarding` | `verify_client_welcome_30_onboarding` |
| `0045_client_publish_request_debit.sql` | `apply_client_publish_request_debit` | `verify_client_publish_request_debit` |
| `0046_client_stripe_credit_purchase.sql` | `apply_client_stripe_credit_purchase` | `verify_client_stripe_credit_purchase` |

**Prod:** registrar como applied sem re-executar SQL (insert em `schema_migrations` **somente** após revisão humana).

### Fase 2 — Helper Stripe + escala (`0047`–`0048`)

| Migration futura | Fonte | Notas |
|------------------|-------|-------|
| `0047_stripe_credit_transaction_columns.sql` | `apply_fix_stripe_credit_purchase` | Só DDL colunas + grants |
| `0048_linkcredits_scale_rpc_guard.sql` | `apply_fix_linkcredits_scale` | **Sem** UPDATE em massa; só RPC/constraints |

### Fase 3 — VIP / exclusive consolidado (`0049`–`0051`)

| Migration futura | Fonte | Notas |
|------------------|-------|-------|
| `0049_exclusive_helper_lock.sql` | `apply_helper_exclusive_application_fix` | `exclusive_helper_id`, triggers, `request_has_exclusive_lock` |
| `0050_vip_partial_refund.sql` | `apply_vip_partial_refund` | Inclui `helper_submit_application` **final** |
| `0051_client_reject_vip_application.sql` | `apply_client_reject_vip_application` | Depende de 0049 |

**Crítico:** uma única definição de `helper_submit_application` no final da Fase 3.

### Fase 4 — Fluxos não verify (`0052`+)

| Migration futura | Fonte | Prioridade |
|------------------|-------|------------|
| `0052_service_workflow.sql` | `apply_service_workflow` | P1 — após verify |
| `0053_account_deletion.sql` | `apply_account_deletion_fix` + `apply_bug2_profile_role_fix` | P1 |
| `0054_application_count.sql` | `apply_application_count_fix` | P2 |
| `0055_profile_account_settings.sql` | `apply_profile_account_settings` | P2 |
| `0056_trigger_return_fixes.sql` | `apply_trigger_return_fix` + indirect | P2 |
| `0057_lead_quality_fix.sql` | `apply_lead_quality_score_fix` | P2 |

### Fase 5 — Arquivamento (não deletar)

1. Criar `supabase/archive/manual-applied/` (quando autorizado).
2. Mover applies com migration equivalente **e** verify OK.
3. Manter `verify_*` e `audit_*` até CI de schema existir.
4. Atualizar `MIGRATION_STATUS.md` com data de arquivamento.

### Fase 6 — Greenfield / staging

- Opção A: `supabase db pull` de prod → diff
- Opção B: projeto novo com migrations 0001–0042 (resolver dup manualmente) + 0043+
- Opção C: dump schema-only de prod como baseline documentado

---

## Ordem sugerida de futuras migrations (resumo)

```
0043 client normalize (RPC guards only, no data)
0044 client welcome + ledger
0045 client publish debit
0046 client stripe purchase
0047 helper stripe columns
0048 linkcredits RPC guards (no data)
0049 exclusive helper lock
0050 vip partial refund (+ helper_submit_application final)
0051 client reject vip
0052 service workflow          [verify first]
0053 account deletion          [verify first]
0054 application count
0055 profile account settings
0056 trigger fixes
0057 lead quality
```

**Não criar estes arquivos na Etapa 3** — apenas planejamento.

---

## Arquivos que NÃO devem ser apagados (ainda)

### Migrations `0001`–`0042`

Todo o diretório `supabase/migrations/` — histórico versionado; duplicatas inclusas.

### Todos os `apply_*.sql` (25)

Especialmente os ✅ em prod — fonte de verdade até existir `0043+` equivalente:

- `apply_normalize_client_profile_credits.sql`
- `apply_client_welcome_30_onboarding.sql`
- `apply_client_publish_request_debit.sql`
- `apply_client_stripe_credit_purchase.sql`
- `apply_fix_stripe_credit_purchase.sql`
- `apply_fix_linkcredits_scale.sql`
- `apply_helper_exclusive_application_fix.sql`
- `apply_vip_partial_refund.sql`
- `apply_client_reject_vip_application.sql`
- Demais ⏳ até verify + migration

### Todos os `verify_*.sql` (20) e `audit_*.sql` (6)

Runbook de diagnóstico; necessários para regressão pós-staging.

### Documentação

- `MIGRATION_STATUS.md`
- `VERIFY_PRODUCTION_CHECKLIST.md`
- `MIGRATION_CONSOLIDATION_PLAN.md` (este arquivo)

---

## Estratégia para arquivar `apply_*.sql` (somente depois)

| Critério | Obrigatório |
|----------|-------------|
| Migration `004x` criada | Sim |
| Conteúdo idempotente testado em **staging** | Sim |
| Verify correspondente OK em staging | Sim |
| Prod: migration marcada applied **sem** re-run destrutivo | Sim |
| `MIGRATION_STATUS.md` atualizado | Sim |

**Ordem de arquivamento sugerida (primeiros = mais seguros):**

1. `apply_helper_category_preferences` (dup 0022)
2. `apply_update_helper_base_address` (dup 0032+0033)
3. Runbooks obsoletos (G9)
4. Stack cliente (após 0043–0046)
5. VIP stack (após 0049–0051) — **por último entre os críticos**

**Nunca deletar** — apenas `git mv` para `archive/manual-applied/`.

---

## Checklist antes de usar `supabase db push`

Use esta lista **antes** de qualquer push em staging ou prod:

- [ ] Li [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) e este plano
- [ ] Sei que **prod não deve receber replay** de 0001–0042
- [ ] Consultei `supabase_migrations.schema_migrations` no alvo
- [ ] Duplicatas 0016/0017/0032 entendidas — push **from scratch** pode falhar
- [ ] Novas migrations são `0043+` e **idempotentes**
- [ ] Nenhuma migration contém `UPDATE`/`DELETE` em massa de créditos
- [ ] `helper_submit_application` foi comparada com `pg_proc` de prod
- [ ] Verify read-only passou em **staging** após push
- [ ] Webhook Stripe **não** foi alterado (escopo separado)
- [ ] Plano de rollback = restore backup Supabase (não `down` migration)
- [ ] Time avisado — janela fora de pico se for prod

**Em produção:** preferir **apenas** `INSERT` em `schema_migrations` para migrations já refletidas pelo estado atual, em vez de executar SQL — decisão humana explícita.

---

## Checklist de aceite (Etapa 3)

- [x] Nenhum SQL executado
- [x] Nenhum arquivo deletado ou renomeado
- [x] Nenhuma migration `0043+` criada
- [x] `MIGRATION_CONSOLIDATION_PLAN.md` criado
- [x] `MIGRATION_STATUS.md` atualizado com link
- [x] Grupos, riscos, fases e ordem documentados
- [x] Duplicatas analisadas sem renomear
- [ ] Commit — aguardando autorização

---

*Plano gerado por auditoria estática do repositório. Etapa 4: implementar migrations `0043+` conforme Fase 1.*
