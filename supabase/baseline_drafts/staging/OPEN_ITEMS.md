# Itens abertos — após P4.0.5

## Resolvido em P4.0.5

- Corrida de débito duplicado (wallet `FOR UPDATE` + re-check + índices).
- Pack 60 com RPCs de conclusão usadas pelo FE.
- Drift README: códigos `LEAD_*` reais; legado `VIP_PRICING_NOT_CONFIGURED` removido.

## Ainda pendente

| Item | Notas |
|------|--------|
| UI: seletor `service_mode` + badge + snapshots + erros | Não alterar app em P4.0.5 |
| `client_pause_request` / `client_resume_request` / `client_cancel_request` | FE chama; cancel reembolsa LC — pack futuro dedicado |
| Review +3 LC / cron auto-complete / reputation dossier extra | Fora do pack 60 (core-only) |
| Educação e Aulas | Etapa futura |
| Apply da baseline em Supabase staging | Autorização futura |
| Seed fictício de users/QA | Sprint futura |
| Copy translation (não parecer consultoria) | UI futura |
