# Conflicts resolved — P4.0.5

| Conflito | Resolução |
|----------|-----------|
| `0041`/`0042` vs VIP finance | Pack `50` é autoritativo para submit/hire/reject |
| `apply_service_workflow` redefine `helper_submit_application` | **Não** incluído no pack 60 |
| Status `awaiting_client_confirmation` vs `completion_requested` | Pack 60 escreve `completion_requested`; aceita ambos na leitura |
| `VIP_PRICING_NOT_CONFIGURED` (docs) vs pack 40 | Docs alinhados a `LEAD_PRICING_VERSION_MISSING` / `LEAD_CATEGORY_PRICE_MISSING` |
| Corrida débito interesse | Pack `30`: wallet `FOR UPDATE` + re-check pós-lock |
| Dois VIPs simultâneos | Pack `50`: `requests FOR UPDATE` + uidx VIP + `EXCLUSIVE_APPLICATION_LOCKED` |
| Pause/cancel vs LC | Explicitamente fora do 60 (OPEN_ITEMS) |
| Review rewards +3 LC | Fora do 60 (migration 0049 / triggers históricos — não reaplicados aqui) |
