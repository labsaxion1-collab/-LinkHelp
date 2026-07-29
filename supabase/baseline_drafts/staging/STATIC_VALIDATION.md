# Validação estática — P4.0.5

## Modalidade (pack 40)

| # | Check | Esperado |
|---|-------|----------|
| 1 | Seed `lead_subcategory_service_mode_policies` | true |
| 2 | Contagem rows = 78 | true |
| 3 | Sem category education | true |

## Concorrência / finanças (packs 30 + 50)

| # | Check | Esperado |
|---|-------|----------|
| 4 | Debit contém `for update` em `credit_wallets` | true |
| 5 | Debit re-check `APPLICATION_INTEREST` após lock | true |
| 6 | Submit contém `from public.requests` + `for update` | true |
| 7 | Submit ordem: `helper_compute_lead_quote` antes de debit | true |
| 8 | VIP uidx `applications_one_active_exclusive_uidx` | true |
| 9 | Índice interest único helper/request | true |
| 10 | +2 índice `VIP_EXCLUSIVE_PARTIAL_REFUND` | true |
| 11 | Reject refund índice + `ceil(debit_amount` | true |
| 12 | Fórmulas: apply 4 / VIP `snap_total + 4` / hire `lead_total_lc - 4` | true |

## Pack 60 — workflow

| # | Check | Esperado |
|---|-------|----------|
| 13 | Define as 3 RPCs FE | true |
| 14 | **Não** recria RPCs financeiras do pack 50 | true |
| 15 | Grants `authenticated` nas 3 RPCs | true |
| 16 | Idempotência `alreadyMarked` / `alreadyCompleted` | true |

## Docs

| # | Check | Esperado |
|---|-------|----------|
| 17 | README cita `LEAD_PRICING_VERSION_MISSING` | true |
| 18 | README cita `LEAD_CATEGORY_PRICE_MISSING` | true |
| 19 | BOOTSTRAP inclui pack 60 antes de verify | true |

## Runner local (sem banco)

```bash
node supabase/baseline_drafts/staging/static_validate.mjs
```

Esperado: `FAILS=0`.
