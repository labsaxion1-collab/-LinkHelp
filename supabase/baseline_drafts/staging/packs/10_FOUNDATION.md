# Fundação (camada 0)

A baseline staging **layered** reutiliza o chain oficial:

`supabase/migrations/0001_linkhelp_production.sql` … `0052_admin_dashboard_financial_summary_rpc.sql`

## Origem por grupo (pós-migrations, antes dos overlays)

| Grupo | Migrations principais |
|-------|------------------------|
| Schema core / Auth trigger / Realtime base | `0001` |
| Storage buckets + portfolio RLS | `0006` |
| Helper wallets / transactions | `0012`, `0013`, `0027`, `0036`, `0038` |
| Hire / `client_accept_proposal` | `0034` |
| Exclusive column parcial (`is_exclusive`) | `0041` (incompleto sem `exclusive_helper_id`) |
| Credit Protection unlock job | `0042` (`process_expired_unlock_refunds`) — **também** regride submit |
| Gamificação / reviews / admin | `0043`–`0052` |

## Nota

Após `0052`, o banco **ainda não** está alinhado a P4.0.1 nem completo para o app cliente.
Os packs `20*` / `30` / `50` são obrigatórios.
