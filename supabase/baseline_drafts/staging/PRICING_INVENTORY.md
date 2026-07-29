# Inventário de precificação (frontend) — P4.0.2a

Somente leitura. **Sem port para SQL nesta etapa.**

Fonte principal: `src/utils/calculateHelperLeadCreditCost.ts` + `src/utils/helperLeadCreditQuote.ts` + `src/utils/vipApplicationCredits.ts`.

| Entrada | Origem | Fórmula atual | Onde calcula | No banco? | Manipulável? | Levar ao SQL na próxima etapa |
|---------|--------|---------------|--------------|-----------|--------------|-------------------------------|
| `interestCost` / apply Normal | Constante FE `INTEREST_COST_LC = 4` | Sempre 4 | FE + draft pack 50 | Não armazenado como preço | FE pode enviar `p_interest_amount` ≠4 → server rejeita | Manter constante 4 no SQL (já) |
| `serviceCost` | Mapa `SERVICE_COST_LC` por `categoryId` + fallbacks low/med/high | 3–9 LC por categoria | FE em apply/hire quote | `requests.category` sim; mapa de preços **não** | Categoria no insert (cliente); mapa só no FE | Portar mapa categoria→LC |
| `distanceCost` | `distanceKm` opcional + breakpoints ≤5/10/20/35/50 | 0–12 LC; remote=0 | FE (`options.distanceKm`) | Distância **não** persistida no request; lat/lng do request existem | Helper/cliente podem passar km arbitrários no FE | Definir fonte autoritativa (haversine request↔helper base **ou** km no submit validado) |
| Remote? | Regex em location/address/description | Zera distância | FE `isRemoteJob` | Texto livre em `requests` | Texto editável na publicação | Regra remota no SQL ou flag `is_remote` no publish |
| `estimatedTotal` / fullRequest | `4 + service + distance` | Soma | FE | Não | Derivado das entradas acima | Função SQL = mesma soma |
| `vipApplyLc` | `fullRequest + 4` | SurCHARGE fixo 4 | FE | Não | Depende do total FE | `computed_total + 4` no SQL |
| `normalHireRemainderLc` | `fullRequest − 4` | max(0, …) | FE → `p_charge_amount` | Não | **Sim hoje em prod (0034)**; draft exige match após pricing | Validar no hire (já no pack 50 quando pricing ≠ NULL) |
| `selectedCost` / value tier | budget CAD + complexidade | Cap 2–30 | FE (legado hire total) | budget_* em requests | Budget cliente | Avaliar se ainda entra no “total” oficial |
| Momento do preço | Em tempo de candidatura / hire | Recalcula a cada chamada | FE | Não congelado na publicação | **Pode mudar** se FE mudar km/categoria implícita | Decidir: congelar `lead_total_lc` no publish **ou** recalcular no apply |

## Dados em `requests` relevantes

`category`, `subcategory`, `location`, `address`, `latitude`, `longitude`, `budget*`, textos — **sem** coluna de lead LC congelado.

## Conclusão P4.0.3 (schema only)

Catálogo SQL criado em `packs/40_pricing_authoritative.sql` (`PRICING_SCHEMA.md`).
Compute, distância, `is_remote` fill e snapshot: **adiados** até decisão de copy/remoto (`OPEN_ITEMS.md`).
