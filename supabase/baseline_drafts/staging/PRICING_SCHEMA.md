# P4.0.3 — Fonte de preços e schema (schema-only)

## Fonte real dos preços (FE)

Arquivo: `src/utils/calculateHelperLeadCreditCost.ts`

| category_id | service_cost_lc | Origem |
|-------------|----------------:|--------|
| cleaning | 7 | `SERVICE_COST_LC` |
| sanitization | 6 | `SERVICE_COST_LC` |
| beauty | 5 | `SERVICE_COST_LC` |
| outdoor | 5 | `SERVICE_COST_LC` |
| tech | 6 | `SERVICE_COST_LC` |
| design | 6 | `SERVICE_COST_LC` |
| marketing | 5 | `SERVICE_COST_LC` |
| translation | 3 | `SERVICE_COST_LC` |
| pet | 3 | `SERVICE_COST_LC` |
| moving | 8 | `SERVICE_COST_LC` |
| assembly | 7 | `SERVICE_COST_LC` |
| automotive | 8 | `SERVICE_COST_LC` |
| renovation | 9 | `SERVICE_COST_LC` |
| other | 5 | fallback `else → 5` (id em `serviceCategories.ts`, ausente do mapa) |

Interest **4** não entra nesta tabela (constante de candidatura Normal).

## Schema de versionamento

- `lead_pricing_versions` — `version_code`, `is_active` (no máx. 1 global `region_code IS NULL`), `source_note`
- `lead_category_prices` — FK `version_id` **ON DELETE RESTRICT**; `subcategory_id` / `region_code` nullable
- `lead_distance_tiers` — breakpoints FE `distanceExtraLc` (ainda não aplicados)

## Distância (documentada, não ligada)

| Item | Valor |
|------|--------|
| Fórmula FE | Haversine R=6371 km (`src/utils/distance.ts`) |
| Pontos pretendidos | `requests.latitude/longitude` ↔ `profiles.helper_base_lat/lng` |
| Remoto | Aguarda regra `is_remote` |
| Fallback FE `p_distance_km` | **Proibido** |

## Snapshot / finance wire

**Adiado** — ver `OPEN_ITEMS.md`.
