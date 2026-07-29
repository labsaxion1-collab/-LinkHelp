# Object origins matrix (P4.0.5)

| Grupo | Fonte principal | Pack overlay |
|-------|-----------------|--------------|
| Schema core, Auth trigger, Realtime base | migrations `0001`+ | — |
| Storage | `0006` | — |
| Wallets helper / Stripe helper table | `0012`–`0013`, `0036` | — |
| Hire remainder / accept (histórico) | `0034` | Override no `50` |
| Credit Protection unlock | `0042` | — (+ Edge externa) |
| Gamificação / reviews submit / admin | `0043`–`0052` | — |
| Client scale signup | normalize | `20a` |
| Client ledger / welcome / publish / stripe | apply_client_* | `20b` |
| exclusive_helper_id / debit FOR UPDATE / VIP uidx | apply_helper_exclusive_* + P4.0.5 | `30` |
| Catálogo LC + service_mode + quote + publish | P4.0.3b | `40` |
| Submit / reject ceil / hire / displace locks | P4.0.1/2a/5 | `50` |
| mark/confirm/finalize service completion | apply_service_* (somente RPCs core) | `60` |
| Pause/resume/cancel lifecycle | apply_* históricos | **adiado** |
