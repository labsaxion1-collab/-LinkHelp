# LinkHelp — Baseline draft staging (P4.0.5)

**Status:** PREPARAÇÃO LOCAL — **NÃO APLICAR** remotamente.  
**Branch:** `staging` · pasta inerte fora de `migrations/`.

## P4.0.5

- Hardening de concorrência: `SELECT … FOR UPDATE` na carteira + lock da request no submit.
- Pack `60_service_completion_workflow.sql`: RPCs de conclusão usadas pelo FE atual.
- Docs de pricing alinhados aos códigos reais do pack 40.
- Pause/resume/cancel **adiados** (reembolso LC).
- **UI app não alterada** nesta etapa.
- **Educação e Aulas:** fora de escopo.

## Regras financeiras finais (P4.0.1) — inalteradas

| Fluxo | Regra |
|-------|--------|
| Normal apply | Débito **4** LC (servidor autoritativo) |
| Normal hire | Snapshot `lead_total_lc − 4` via `client_accept_proposal` / `p_charge_amount` |
| Normal reject | Sem reembolso da candidatura |
| VIP apply | Quote servidor obrigatório. Sem pricing → **`LEAD_PRICING_VERSION_MISSING`** ou **`LEAD_CATEGORY_PRICE_MISSING`** (**zero** efeitos colaterais). Pricing OK → `total + 4`. **Nunca** usa `p_interest_amount` como substituto |
| VIP hire | Cobrança **0** obrigatória; ≠0 → `VIP_HIRE_MUST_BE_ZERO` |
| Normal hire sob lock VIP | Proibido (`VIP_LOCK_ACTIVE_NORMAL_HIRE_FORBIDDEN`) |
| VIP vs cap 3 | VIP **bypassa** limite de 3 |
| Lock | Um VIP ativo (índice + `exclusive_helper_id` + sync) |
| Displace | **+2** LC uma vez / helper / request (índice único) |
| VIP reject | `ceil(débito_real ÷ 2)`; libera lock |

### Códigos de pricing (pack 40) — falha antes de qualquer side-effect

| Código | Quando |
|--------|--------|
| `LEAD_PRICING_VERSION_MISSING` | Nenhuma versão ativa em `lead_pricing_versions` |
| `LEAD_CATEGORY_PRICE_MISSING` | Sem `service_cost_lc` para a categoria |
| `SERVICE_MODE_REQUIRED` / policy errors | Modalidade inválida / conflitante com política |
| `LEAD_LOCATION_INCOMPLETE` | Presencial sem coordenadas servidor |

Códigos legados `VIP_PRICING_NOT_CONFIGURED` / `NORMAL_HIRE_PRICING_NOT_CONFIGURED` **não** são emitidos pelo pack atual.

## Ordem de bootstrap (futuro, com autorização)

Ver `BOOTSTRAP_ORDER.md` e `APPLY_PLAN.md`. **Não executar nesta etapa.**

```
0001–0052 → 20a → 20b → 30 → 40 → 50 → 60 → verify
```

## Concorrência (P4.0.5)

Ordem de locks documentada em `packs/30_exclusive_lock.sql`:

1. `requests` (row)
2. `credit_wallets` do helper atuante
3. wallets dos normais deslocados (`helper_id` ASC)

## Autoridade

- Finanças: `packs/50_finance_authoritative_p401.sql` (+ debit em `30`)
- Conclusão: `packs/60_service_completion_workflow.sql`
- Scripts históricos `supabase/apply_*.sql` **não** devem ser reaplicados depois destes packs.
