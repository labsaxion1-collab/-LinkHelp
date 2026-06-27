# LinkHelp — Checklist de Verify em Produção (read-only)

**Data:** 2026-06-18  
**Etapa:** 2 — confirmar quais `apply_*` estão realmente aplicados em produção  
**Ambiente:** Supabase Dashboard → **SQL Editor** → projeto **produção**

**Status da rodada:** ✅ **Concluída** — 10/10 verifies OK em produção (2026-06-18). `verify_stripe_purchase` rodado em modo read-only; bloco `MANUAL RPC TEST` **não** descomentado.

---

## Regras de segurança

| Permitido | Proibido |
|-----------|----------|
| Colar e executar apenas os `verify_*.sql` listados abaixo | Executar qualquer `apply_*.sql` |
| Ler resultados (`SELECT`) | `INSERT`, `UPDATE`, `DELETE`, DDL |
| Anotar OK/Falhou neste documento ou no `MIGRATION_STATUS.md` | Descomentar blocos opcionais que chamam RPCs |

**Como executar:** abra o arquivo no repo, copie **o arquivo inteiro** (salvo aviso explícito) e rode no SQL Editor. Os scripts retornam várias abas/result sets — revise **todas**.

**Após cada script:** preencha a caixa de status no final da seção correspondente.

---

## Auditoria read-only (scripts selecionados)

Todos os scripts da lista principal foram revisados no repositório em 2026-06-18:

| Script | Read-only | Observação |
|--------|-----------|------------|
| `verify_client_welcome_30_onboarding.sql` | ✅ | Somente `SELECT` |
| `verify_client_profile_credits.sql` | ✅ | Somente `SELECT` |
| `verify_client_publish_request_debit.sql` | ✅ | Somente `SELECT` (strings `FOR UPDATE` / `grant` são checagens de definição) |
| `verify_client_stripe_credit_purchase.sql` | ✅ | Somente `SELECT` |
| `verify_stripe_purchase.sql` | ✅* | *Não descomentar o bloco `MANUAL RPC TEST` (linhas 63–75) |
| `verify_vip_partial_refund.sql` | ✅ | Somente `SELECT` |
| `verify_helper_category_preferences.sql` | ✅ | Somente `SELECT` |
| `verify_update_helper_base_address.sql` | ✅ | Somente `SELECT` |
| `verify_client_reject_vip_application.sql` | ✅ | Somente `SELECT` |
| `verify_no_legacy_linkcredits.sql` | ✅ | Somente `SELECT` |

### Scripts `verify_*` excluídos (não incluir neste checklist)

Contêm `NOTIFY pgrst, 'reload schema'` — recarrega cache do PostgREST (efeito colateral, não é read-only estrito):

- `verify_credit_backend.sql`
- `verify_helper_application_flow.sql`
- `verify_helper_exclusive_application.sql` *(útil depois, mas omitir última linha `NOTIFY` se rodar manualmente)*
- `verify_accept_proposal_flow.sql`
- `verify_service_workflow.sql`
- `verify_trigger_return_fix.sql`
- `verify_dispatch_push_trigger_return_fix.sql`
- `verify_indirect_trigger_return_fix.sql`

`verify_opportunity_unlock_refunds.sql` — apenas `SELECT`, mas comentários sugerem chamar RPCs manualmente; **não** executar os comentários `process_expired_unlock_refunds` em prod sem plano.

---

## Ordem de execução

Execute na ordem abaixo. P0 antes de P1 evita falsos negativos (ex.: publish debit depende de onboarding/ledger).

| Ordem | Prioridade | Script | Apply relacionado |
|------:|------------|--------|-------------------|
| 1 | **P0** | `verify_client_profile_credits.sql` | `apply_normalize_client_profile_credits.sql` |
| 2 | **P0** | `verify_client_welcome_30_onboarding.sql` | `apply_client_welcome_30_onboarding.sql` |
| 3 | **P0** | `verify_client_publish_request_debit.sql` | `apply_client_publish_request_debit.sql` |
| 4 | **P0** | `verify_client_stripe_credit_purchase.sql` | `apply_client_stripe_credit_purchase.sql` |
| 5 | **P0** | `verify_stripe_purchase.sql` | `0036` / `apply_fix_stripe_credit_purchase.sql` |
| 6 | **P0** | `verify_vip_partial_refund.sql` | `apply_vip_partial_refund.sql` |
| 7 | **P1** | `verify_helper_category_preferences.sql` | `0022` / `apply_helper_category_preferences.sql` |
| 8 | **P1** | `verify_update_helper_base_address.sql` | `0032+0033` / `apply_update_helper_base_address.sql` |
| 9 | **P1** | `verify_client_reject_vip_application.sql` | `apply_client_reject_vip_application.sql` |
| 10 | **P2** | `verify_no_legacy_linkcredits.sql` | `apply_fix_linkcredits_scale.sql` |

---

## P0 — Financeiro Cliente / Helper

### 1. `verify_client_profile_credits.sql`

**Objetivo:** Confirmar que créditos de **cliente** em `profiles.credits` estão em escala real (1 LC = 1), sem resíduos ×1000, e que RPCs de signup não concedem valores legados.

**Resultado esperado:**
- `suspect_count` = **0** nas linhas `profiles client credits >= 1000` e `exact x1000 multiples`
- `legacy_literal_scan` = **OK** para `grant_user_reward`, `ensure_client_signup_credits`
- `signup_client_check` = **SIGNUP_CLIENT_ZERO** onde aplicável
- Tabela `_profile_credits_backup_before_normalize` pode existir (informativo)

**Se falhar:**
- Rodar **não** o apply em prod sem revisão — anotar emails com `credits` suspeitos
- Próximo passo planejado: `apply_normalize_client_profile_credits.sql` (Etapa futura, com backup)
- Atualizar `MIGRATION_STATUS.md`: `apply_normalize_client_profile_credits` → ⏳ ou ❌

**Status manual**

- [x] Rodado
- [x] OK
- [ ] Falhou
- Observação: `suspect_count` = 0; RPCs sem literais legados.

---

### 2. `verify_client_welcome_30_onboarding.sql`

**Objetivo:** Confirmar onboarding cliente (30 LC via RPC), ledger `client_credit_ledger`, coluna `client_onboarding_completed_at`, RPC `complete_client_onboarding`.

**Resultado esperado:**
- Todas as linhas com `check_name` → `ok = true` (seções 1–4)
- `grant_user_reward` body checks:
  - `signup_client_check` = **SIGNUP_CLIENT_ZERO**
  - `first_request_check` = **FIRST_REQUEST_ZERO**
  - `welcome_30_check` = **CLIENT_WELCOME_30_AMOUNT_30**
  - `rpc_guard_check` = **CLIENT_WELCOME_VIA_RPC_ONLY**
- Métricas informativas (seções 6) — sem critério rígido de falha

**Se falhar:**
- Coluna/tabela/RPC ausente → `apply_client_welcome_30_onboarding.sql` pendente
- Grants legados ativos → combinar com normalize credits
- Atualizar status: `apply_client_welcome_30_onboarding` → ⏳

**Status manual**

- [x] Rodado
- [x] OK
- [ ] Falhou
- Observação: `client_credit_ledger`, `complete_client_onboarding` e grants CLIENT_WELCOME_30 confirmados.

---

### 3. `verify_client_publish_request_debit.sql`

**Objetivo:** Confirmar RPC `client_publish_request`, índice de idempotência `REQUEST_PUBLISH`, débito atômico de 1 LC.

**Resultado esperado:**
- `client_publish_request defined` → `ok = true`
- `client_credit_ledger.request_id column` → `ok = true`
- `client_credit_ledger_request_publish_uidx` → `ok = true`
- Body checks (seção 4): todos `ok = true` (`INSUFFICIENT_CLIENT_CREDITS`, `for update`, `REQUEST_PUBLISH`, `CLIENT_ONLY`)
- `grant execute to authenticated` → `ok = true`
- Amostra seção 6: pode ter linhas se já houve publicações (informativo)

**Se falhar:**
- RPC ausente → `apply_client_publish_request_debit.sql` não aplicado ou incompleto
- Prereq: onboarding + `profiles.credits` + `client_credit_ledger`
- **Não** rodar apply sem checklist P0 #1–2 OK

**Status manual**

- [x] Rodado
- [x] OK
- [ ] Falhou
- Observação: `REQUEST_PUBLISH` no ledger funcionando; RPC e índice de idempotência OK.

---

### 4. `verify_client_stripe_credit_purchase.sql`

**Objetivo:** Confirmar RPC `confirm_client_stripe_linkcredit_purchase`, índice Stripe no ledger, grant `service_role`.

**Resultado esperado:**
- `confirm_client_stripe_linkcredit_purchase defined` → `ok = true`
- `client_credit_ledger_stripe_session_uidx` → `ok = true`
- `RPC inserts CREDIT_PURCHASE` → `ok = true`
- `RPC updates profiles.credits` → `ok = true`
- `grant execute to service_role` → `ok = true`
- Amostra `CREDIT_PURCHASE` no ledger (seção final): informativo

**Se falhar:**
- RPC ausente → `apply_client_stripe_credit_purchase.sql` pendente
- Prereq: `payment_events` (helper stripe / 0036) + `client_credit_ledger`
- Webhook cliente é assunto Vercel/Stripe — **não alterar nesta etapa**

**Status manual**

- [x] Rodado
- [x] OK
- [ ] Falhou
- Observação: `CREDIT_PURCHASE` no ledger cliente confirmado.

---

### 5. `verify_stripe_purchase.sql`

**Objetivo:** Diagnosticar infra **Helper** Stripe — `payment_events`, `confirm_stripe_linkcredit_purchase`, colunas `credit_transactions.metadata`, wallets.

**Resultado esperado:**
- `payment_events` existe (`total_rows` pode ser ≥ 0; em prod ativo espera-se eventos `paid`)
- `confirm_stripe_linkcredit_purchase` — `service_role` com `can_execute = true`; `authenticated`/`anon` = false
- Colunas `metadata`, `balance_before`, `balance_after`, `unlock_id` presentes em `credit_transactions`
- `legacy_scan` não aplicável aqui; ver P2 para escala global

**⚠️ Não descomentar** o bloco `MANUAL RPC TEST` — creditaria LC de teste.

**Se falhar:**
- `payment_events` vazio com compras reais → checar webhook Vercel (fora do escopo SQL)
- Colunas ausentes → `apply_fix_stripe_credit_purchase.sql` pendente
- RPC ausente → migration `0036` / apply stripe não aplicado

**Status manual**

- [x] Rodado
- [x] OK
- [ ] Falhou
- Observação: Read-only apenas; `payment_events` com registros `paid`; colunas Stripe em `credit_transactions` OK. MANUAL RPC TEST não executado.

---

### 6. `verify_vip_partial_refund.sql`

**Objetivo:** Confirmar VIP exclusive + partial refund (+2 LC) para helpers deslocados.

**Resultado esperado:**
- Seções 1–5 e 11–12: todos `ok = true`
- `helper_submit_application has p_is_exclusive` → `ok = true`
- `VIP_EXCLUSIVE_PARTIAL_REFUND` no constraint `credit_transactions_type_check`
- Índice `credit_transactions_vip_partial_refund_uidx` existe
- Seção 7 (duplicatas): **0 linhas**
- Seção 9: `balance_delta_ok = true` nas linhas retornadas (se houver refunds)
- Seção 10 `legacy_scan`: **OK** para todas as funções listadas

**Se falhar:**
- `process_vip_exclusive_partial_refunds` ausente → `apply_vip_partial_refund.sql` pendente
- `helper_submit_application` sem `boolean` → versão antiga (0039/0041) ainda ativa
- Duplicatas na seção 7 → investigar dados (não rodar apply retroactive)
- Prereq exclusivo: `requests.exclusive_helper_id` (apply exclusive fix)

**Status manual**

- [x] Rodado
- [x] OK
- [ ] Falhou
- Observação: VIP partial refund OK; bypass do limite de 3 aplicações confirmado; sem duplicatas.

---

## P1 — Perfil / Helper / Categorias / VIP

### 7. `verify_helper_category_preferences.sql`

**Objetivo:** Confirmar colunas `primary_category` e `secondary_categories` em `profiles`.

**Resultado esperado:**
- `profiles.primary_category column` → `ok = true`
- `profiles.secondary_categories column` → `ok = true`
- `profiles.secondary_categories null count` → `ok = true` (null_count = 0)
- Amostras seção 4: informativo

**Se falhar:**
- Colunas ausentes → `0022` ou `apply_helper_category_preferences.sql` pendente

**Status manual**

- [x] Rodado
- [x] OK
- [ ] Falhou
- Observação: Colunas `primary_category` / `secondary_categories` confirmadas.

---

### 8. `verify_update_helper_base_address.sql`

**Objetivo:** Confirmar colunas `helper_base_*`, RPC `update_helper_base_address`, trigger de proteção.

**Resultado esperado:**
- Todas as colunas `helper_base_*` e `helper_base_updated_at` → `ok = true`
- `update_helper_base_address function` → `ok = true` (assinatura 6 params)
- `grant execute to authenticated` → `ok = true`
- `profiles_protect_helper_base_fields trigger` → `ok = true`
- Body checks `auth.uid` e `NOT_HELPER` → `ok = true`

**Se falhar:**
- Colunas sem lock/RPC → `0032`/`0033` ou `apply_update_helper_base_address.sql` pendente

**Status manual**

- [x] Rodado
- [x] OK
- [ ] Falhou
- Observação: Colunas `helper_base_*`, RPC `update_helper_base_address` e trigger de proteção OK.

---

### 9. `verify_client_reject_vip_application.sql`

**Objetivo:** Confirmar RPC `client_reject_application`, trigger de sync exclusive, ausência de locks stale.

**Resultado esperado:**
- `client_reject_application defined` → `ok = true`
- `trg_sync_request_exclusive_helper exists` → `ok = true`
- Seção 3 (stale locks): **0 linhas**
- Seção 4 notificações: informativo

**Se falhar:**
- RPC ausente → `apply_client_reject_vip_application.sql` **não aplicado** (arquivo existe no repo, pode estar untracked)
- Stale locks na seção 3 → revisar `apply_helper_exclusive_application_fix` + resync
- Prereq: `exclusive_helper_id`, `is_exclusive`

**Status manual**

- [x] Rodado
- [x] OK
- [ ] Falhou
- Observação: `client_reject_application` e `trg_sync_request_exclusive_helper` confirmados; 0 stale locks.

---

## P2 — Limpeza / auditoria geral (escala LC)

### 10. `verify_no_legacy_linkcredits.sql`

**Objetivo:** Auditoria global — nenhum saldo helper/cliente/bônus em escala ×1000 legada.

**Resultado esperado:**
- Seção 1: todos `suspect_count` = **0**
- Seção 2: **nenhuma linha** nas amostras
- Seção 3: `legacy_scan` = **OK** para todas as funções listadas
- Seção 4: snapshot wallets — valores em escala humana (ex.: 12, 25, 80 — não 12000)

**Se falhar:**
- Suspeitos em `credit_wallets` / `credit_transactions` → `apply_fix_linkcredits_scale.sql` pendente
- Suspeitos em `profiles` client → `apply_normalize_client_profile_credits.sql`
- `LEGACY_LITERAL_FOUND` em RPC → atualizar corpo da função via apply/migration planejada

**Status manual**

- [x] Rodado
- [x] OK
- [ ] Falhou
- Observação: Wallets de Helper existentes em escala real; `suspect_count` = 0; `legacy_scan` OK.

---

## Resumo rápido

| # | Script | Apply / migration | Rodado | OK | Falhou |
|---|--------|---------------------|--------|-----|--------|
| 1 | `verify_client_profile_credits` | `apply_normalize_client_profile_credits` | [x] | [x] | [ ] |
| 2 | `verify_client_welcome_30_onboarding` | `apply_client_welcome_30_onboarding` | [x] | [x] | [ ] |
| 3 | `verify_client_publish_request_debit` | `apply_client_publish_request_debit` | [x] | [x] | [ ] |
| 4 | `verify_client_stripe_credit_purchase` | `apply_client_stripe_credit_purchase` | [x] | [x] | [ ] |
| 5 | `verify_stripe_purchase` | `0036` + `apply_fix_stripe_credit_purchase` | [x] | [x] | [ ] |
| 6 | `verify_vip_partial_refund` | `apply_vip_partial_refund` | [x] | [x] | [ ] |
| 7 | `verify_helper_category_preferences` | `0022` / `apply_helper_category_preferences` | [x] | [x] | [ ] |
| 8 | `verify_update_helper_base_address` | `0032+0033` / `apply_update_helper_base_address` | [x] | [x] | [ ] |
| 9 | `verify_client_reject_vip_application` | `apply_client_reject_vip_application` | [x] | [x] | [ ] |
| 10 | `verify_no_legacy_linkcredits` | `apply_fix_linkcredits_scale` | [x] | [x] | [ ] |

### Notas consolidadas da rodada

- `client_credit_ledger`: tipos **FREE_BONUS**, **REQUEST_PUBLISH** e **CREDIT_PURCHASE** operacionais.
- `payment_events`: registros **paid** presentes (Helper Stripe).
- VIP: partial refund + bypass do cap de 3 candidaturas confirmados.
- Helper: categorias e base address confirmados.
- Cliente VIP reject: RPC + trigger de sync confirmados.
- Escala LC: sem suspeitos ×1000; wallets helper em escala humana.

---

## Atualização em `MIGRATION_STATUS.md`

- [x] Seção **Produção — verify concluído** atualizada
- [x] Tabela `apply_*.sql` revisada com ✅ onde verify passou

---

## Opcional (fora da lista principal)

Rodar só se P0 #6 ou #9 falharem por prereq de exclusive:

| Script | Seguro? | Nota |
|--------|---------|------|
| `verify_helper_exclusive_application.sql` | ⚠️ | Omitir última linha `notify pgrst, 'reload schema';` |
| `verify_opportunity_unlock_refunds.sql` | ✅ SELECT | Não executar RPCs nos comentários |

---

*Etapa 2: checklist criado 2026-06-18; rodada em produção concluída no mesmo dia (10/10 OK, read-only).*
