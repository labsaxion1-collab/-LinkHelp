# Bootstrap order — P4.0.5

| Ordem | Arquivo |
|------:|---------|
| 0 | migrations `0001`–`0052` |
| 1 | `20a_client_scale_grants.sql` |
| 2 | `20b_client_stack.sql` (publish sobrescrito por 40) |
| 3 | `30_exclusive_lock.sql` (debit + VIP uidx + wallet FOR UPDATE) |
| 4 | `40_pricing_authoritative.sql` |
| 5 | `50_finance_authoritative_p401.sql` (submit/hire/reject; request lock) |
| 6 | `60_service_completion_workflow.sql` (mark / confirm / finalize) |
| 7 | `verify/verify_staging_baseline_readonly.sql` |

Políticas: 78 subs. Educação e Aulas: não incluída.  
Pause/resume/cancel: **não** neste bootstrap (OPEN_ITEMS).
