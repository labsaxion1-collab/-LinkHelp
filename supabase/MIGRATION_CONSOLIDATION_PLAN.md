# LinkHelp — Plano de Consolidação de Migrations

**Data:** 2026-06-18  
**Etapa:** 3 — planejamento técnico (sem alterar banco, sem criar migrations finais)  
**Pré-requisitos:** [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) · [VERIFY_PRODUCTION_CHECKLIST.md](./VERIFY_PRODUCTION_CHECKLIST.md)

---

## Resumo executivo

Produção está **funcional e confirmada** (10/10 verifies read-only, 2026-06-18). O gap é **reprodutibilidade**: grande parte do schema crítico existe só em `apply_*.sql` manuais, não em `supabase/migrations/`.

**Estratégia aprovada para esta fase:**

1. **Não renomear, não deletar, não reescrever** as migrations canônicas `0001`–`0042`. As três duplicatas obsoletas 0016/0017/0032 foram removidas do chain ativo e preservadas em `supabase/deprecated_migrations/`.
2. **Não rodar `supabase db push` em produção** sem dry-run, staging e revisão do histórico remoto.
3. **Gamificação ocupa `0043`–`0045`**. Futuras migrations de consolidação devem começar em **`0046`** ou no próximo número superior livre, sempre idempotentes.
4. **Arquivar `apply_*.sql` só depois** que a migration equivalente existir, verify passar em staging e prod estiver marcada no baseline correto.
5. **Duplicatas 0016 / 0017 / 0032 reconciliadas localmente** — somente os arquivos canônicos permanecem em `supabase/migrations`; os SQLs obsoletos foram preservados fora do chain.

**Próximo passo executável de consolidação:** usar `0046` ou número superior livre; `0043`–`0045` pertencem à gamificação.

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

**Notas:** Nenhuma migration `0001`–`0042` cobre o stack completo. Futuras migrations de consolidação a partir de `0046` devem ser **idempotentes** (`add column if not exists`, `create or replace function`). **Não** incluir migração de dados destrutiva em prod (normalize já rodou).

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
| **Migrations antigas** | `0022`, `0032`, `0033` |
| **Apply confirmados** | `apply_helper_category_preferences` (dup 0022), `apply_update_helper_base_address` (dup 0032+0033) |
| **Verify** | `verify_helper_category_preferences`, `verify_update_helper_base_address` |
| **Objetos-chave** | `primary_category`, `secondary_categories`, `helper_base_*`, `update_helper_base_address`, trigger `profiles_protect_helper_base_fields` |
| **Risco** | **Baixo** — já coberto por migrations + verify OK; consolidação é documental |
| **Virar migration?** | **Opcional** — migration `004x` pode ser “noop idempotente” ou omitida se 0022+0033 bastam para greenfield |
| **Prioridade** | **P2** |

**Notas:** Para greenfield, `0022` + `0032_helper_base_address` + `0033` já cobrem schema. Apply scripts podem ser arquivados **antes** dos outros grupos.

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

## Duplicatas de número — reconciliação local concluída

| Número | Migration canônica no chain ativo | SQL obsoleto preservado fora do chain |
|--------|------------------------------------|----------------------------------------|
| **0016** | `0016_fix_applications_insert_rls.sql` | `deprecated_migrations/0016_helper_signup_12_lc_DEPRECATED.sql` |
| **0017** | `0017_requests_address_budget_columns.sql` | `deprecated_migrations/0017_signup_profile_recovery_DEPRECATED.sql` |
| **0032** | `0032_helper_base_address.sql` | `deprecated_migrations/0032_reconcile_helper_signup_bonus_20_lc_DEPRECATED.sql` |

Em 2026-07-04, os três arquivos obsoletos foram removidos de `supabase/migrations/`. O SQL histórico continua preservado em `supabase/deprecated_migrations/`, que não é processado pelo Supabase CLI. Nenhuma migration canônica foi renomeada ou alterada.

**`supabase db push` em produção:** **proibido** até:

- `select * from supabase_migrations.schema_migrations` revisado;
- migrations pendentes testadas em **staging** clonado;
- `migration list` e `db push --dry-run` mostram somente as migrations realmente pendentes.

---

## Riscos consolidados

| ID | Risco | Impacto | Mitigação no plano |
|----|-------|---------|-------------------|
| C1 | Replay de migrations em prod já manual | Quebra RPC / dados | Nunca re-aplicar 0001–0042 em prod |
| C2 | `helper_submit_application` versão errada | Candidatura/VIP mortos | Exportar `pg_get_functiondef` de prod antes de escrever `004x` VIP |
| C3 | Reintrodução das duplicatas 0016/0017/0032 | `db push` volta a exigir `--include-all` | Manter os SQLs obsoletos somente em `deprecated_migrations` |
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

### Fase 1 — Migrations cliente P0 (`0046`–`0049`)

Criar arquivos **novos**, idempotentes, espelhando applies já em prod:

| Migration futura | Fonte | Verify pós-staging |
|------------------|-------|-------------------|
| `0046_client_profile_credits_normalize.sql` | `apply_normalize_client_profile_credits` | `verify_client_profile_credits` |
| `0047_client_welcome_onboarding.sql` | `apply_client_welcome_30_onboarding` | `verify_client_welcome_30_onboarding` |
| `0048_client_publish_request_debit.sql` | `apply_client_publish_request_debit` | `verify_client_publish_request_debit` |
| `0049_client_stripe_credit_purchase.sql` | `apply_client_stripe_credit_purchase` | `verify_client_stripe_credit_purchase` |

**Prod:** registrar como applied sem re-executar SQL (insert em `schema_migrations` **somente** após revisão humana).

### Fase 2 — Helper Stripe + escala (`0050`–`0051`)

| Migration futura | Fonte | Notas |
|------------------|-------|-------|
| `0050_stripe_credit_transaction_columns.sql` | `apply_fix_stripe_credit_purchase` | Só DDL colunas + grants |
| `0051_linkcredits_scale_rpc_guard.sql` | `apply_fix_linkcredits_scale` | **Sem** UPDATE em massa; só RPC/constraints |

### Fase 3 — VIP / exclusive consolidado (`0052`–`0054`)

| Migration futura | Fonte | Notas |
|------------------|-------|-------|
| `0052_exclusive_helper_lock.sql` | `apply_helper_exclusive_application_fix` | `exclusive_helper_id`, triggers, `request_has_exclusive_lock` |
| `0053_vip_partial_refund.sql` | `apply_vip_partial_refund` | Inclui `helper_submit_application` **final** |
| `0054_client_reject_vip_application.sql` | `apply_client_reject_vip_application` | Depende de 0052 |

**Crítico:** uma única definição de `helper_submit_application` no final da Fase 3.

### Fase 4 — Fluxos não verify (`0055`+)

| Migration futura | Fonte | Prioridade |
|------------------|-------|------------|
| `0055_service_workflow.sql` | `apply_service_workflow` | P1 — após verify |
| `0056_account_deletion.sql` | `apply_account_deletion_fix` + `apply_bug2_profile_role_fix` | P1 |
| `0057_application_count.sql` | `apply_application_count_fix` | P2 |
| `0058_profile_account_settings.sql` | `apply_profile_account_settings` | P2 |
| `0059_trigger_return_fixes.sql` | `apply_trigger_return_fix` + indirect | P2 |
| `0060_lead_quality_fix.sql` | `apply_lead_quality_score_fix` | P2 |

### Fase 5 — Arquivamento (não deletar)

1. Criar `supabase/archive/manual-applied/` (quando autorizado).
2. Mover applies com migration equivalente **e** verify OK.
3. Manter `verify_*` e `audit_*` até CI de schema existir.
4. Atualizar `MIGRATION_STATUS.md` com data de arquivamento.

### Fase 6 — Greenfield / staging

- Opção A: `supabase db pull` de prod → diff
- Opção B: projeto novo com chain canônico 0001–0045, sem duplicatas
- Opção C: dump schema-only de prod como baseline documentado

---

## Ordem sugerida de futuras migrations (resumo)

```
0043 user gamification                 [já criada]
0044 gamification hero/progress        [já criada]
0045 gamification realtime             [já criada]
0046 client normalize (RPC guards only, no data)
0047 client welcome + ledger
0048 client publish debit
0049 client stripe purchase
0050 helper stripe columns
0051 linkcredits RPC guards (no data)
0052 exclusive helper lock
0053 vip partial refund (+ helper_submit_application final)
0054 client reject vip
0055 service workflow                  [verify first]
0056 account deletion                  [verify first]
0057 application count
0058 profile account settings
0059 trigger fixes
0060 lead quality
```

**Sequência de consolidação futura** — iniciar somente após staging e escolher sempre o próximo número livre.

---

## Arquivos que NÃO devem ser apagados (ainda)

### Migrations `0001`–`0045`

Todo o diretório `supabase/migrations/` — histórico canônico versionado, agora sem duplicatas.

### Todos os `apply_*.sql` (25)

Especialmente os ✅ em prod — fonte de verdade até existir migration de consolidação `0046+` equivalente:

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
4. Stack cliente (após 0046–0049)
5. VIP stack (após 0052–0054) — **por último entre os críticos**

**Nunca deletar** — apenas `git mv` para `archive/manual-applied/`.

---

## Checklist antes de usar `supabase db push`

Use esta lista **antes** de qualquer push em staging ou prod:

- [ ] Li [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) e este plano
- [ ] Sei que **prod não deve receber replay** de 0001–0042
- [ ] Consultei `supabase_migrations.schema_migrations` no alvo
- [ ] Chain ativo contém apenas as migrations canônicas 0016/0017/0032
- [ ] Novas migrations de consolidação começam em `0046` ou número superior livre e são **idempotentes**
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
- [x] Duplicatas obsoletas removidas do chain ativo e preservadas em `deprecated_migrations`
- [x] `0043`–`0045` reservadas e criadas para gamificação
- [x] `MIGRATION_CONSOLIDATION_PLAN.md` criado
- [x] `MIGRATION_STATUS.md` atualizado com link
- [x] Grupos, riscos, fases e ordem documentados
- [x] Duplicatas reconciliadas sem alterar migrations canônicas
- [ ] Commit — aguardando autorização

---

*Plano atualizado após a reconciliação local. Consolidações futuras começam em `0046` ou número superior livre.*
