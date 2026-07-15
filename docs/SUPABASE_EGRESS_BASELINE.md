# Supabase Egress Baseline

This document is a development-only structural baseline. It is not production traffic and `approximateBytes` is not real egress.

## Local inspection

In a development build, use the browser console:

```js
__LINKHELP_SUPABASE_METRICS__.reset()
__LINKHELP_SUPABASE_METRICS__.summary()
__LINKHELP_SUPABASE_METRICS__.print()
__LINKHELP_SUPABASE_METRICS__.snapshot()
```

The global is not installed outside DEV/test mode. Metrics remain in memory and are never sent to Supabase or another service.

## Structural baseline with mocks

Every mocked database response contains one sanitized row: `{ "id": "mock" }`. Its encoded response array is 15 bytes. These values only make the baseline reproducible.

| Flow | Operations | Tables | Global refresh | Mock rows | Mock approximate bytes |
|---|---:|---|---:|---:|---:|
| Initial client load | 7 | requests, applications, upcoming_jobs, notifications, conversations, profiles, reviews | 1 | 7 | 105 |
| Initial helper load | 7 | same current global path | 1 | 7 | 105 |
| Request INSERT/UPDATE/DELETE | 7 each | same seven tables | 1 each | 7 | 105 |
| Application INSERT/UPDATE | 7 each | same seven tables | 1 each | 7 | 105 |
| Upcoming job UPDATE | 7 | same seven tables | 1 | 7 | 105 |
| Review INSERT | 7 | same seven tables | 1 | 7 | 105 |
| Notification INSERT | 0 database reads | notifications realtime event | 0 | 0 | 0 |
| Open conversation | measured per REST operation | conversations and messages | 0 | fixture-dependent | fixture-dependent |
| Load wallet | measured per REST operation | credit_wallets, credit_transactions, opportunity_unlocks, credit_packages | 0 | fixture-dependent | fixture-dependent |
| Load portfolio | 1 | helper_portfolio_items | 0 | 1 | 15 |
| Gamification snapshot | API call plus possible Supabase fallback | api/gamification/me or user_gamification | 0 | fixture-dependent | fixture-dependent |

## Manual authenticated baseline

Status: **NOT MEASURED - authenticated client and helper sessions are unavailable.** No user was created and no credentials or secrets were read.

For each flow below:

1. Run `npm run dev` and open DevTools.
2. Authenticate with the intended test account.
3. Run `__LINKHELP_SUPABASE_METRICS__.reset()`.
4. Perform exactly one action.
5. Run `__LINKHELP_SUPABASE_METRICS__.print()`.
6. Export only the sanitized summary tables, never the raw application data.

Measure separately: client login, helper login, create request, submit application, accept application, open chat, send message, open wallet, open portfolio, receive notification, complete service, and submit review.

## Known constraints

- DELETE payload fields depend on PostgreSQL replica identity.
- App-data mapping depends on profile enrichment.
- Client/helper scoping still depends on current RLS and global queries.
- Dashboard Usage, Storage and Realtime metrics are required to identify real Supabase egress.

## Etapa 2 - Realtime granular

O canal `linkhelp-app-data` continua Ãºnico e com quatro listeners, mas agora encaminha
`INSERT`, `UPDATE` e `DELETE` com `new`/`old` para handlers por domÃ­nio. A carga inicial,
o refresh manual e as reconciliaÃ§Ãµes excepcionais de mutations continuam usando
`refreshRemote`. Nenhum evento dos quatro domÃ­nios chama `refreshRemote`.

O escopo permanece definido pela RLS que autoriza a entrega do evento. NÃ£o foi criado
filtro definitivo por papel. Payload incompleto gera somente busca por ID e o
enriquecimento estritamente necessÃ¡rio; resultado nÃ£o visÃ­vel pela RLS Ã© ignorado.

| Evento | Antes | Depois | Consultas restantes | Motivo |
|---|---:|---:|---:|---|
| request INSERT, payload completo | 7 | 0-1 | profile do cliente apenas se item novo | mapear identidade exibida |
| request UPDATE, payload completo | 7 | 0 | nenhuma | preserva profile jÃ¡ carregado |
| request INSERT/UPDATE, payload incompleto | 7 | 1-2 | request por ID e profile se novo | completar somente a linha afetada |
| request DELETE com ID | 7 | 0 | nenhuma | remoÃ§Ã£o local por chave |
| application INSERT, payload completo | 7 | 2 | profile do helper e conversation pontual | enriquecer card e chatUnlocked |
| application UPDATE, payload completo | 7 | 0 | nenhuma | preserva enriquecimento e chatUnlocked atuais |
| application INSERT/UPDATE, payload incompleto | 7 | 1-3 | application por ID e enriquecimentos se novo | completar somente a candidatura |
| application DELETE com ID | 7 | 0 | nenhuma | remoÃ§Ã£o local por chave |
| upcoming_job INSERT, payload completo | 7 | 0 | nenhuma | mapper usa apenas a linha |
| upcoming_job UPDATE, payload completo | 7 | 0 | nenhuma | mapper usa apenas a linha |
| upcoming_job INSERT/UPDATE, payload incompleto | 7 | 1 | upcoming_job por ID | completar somente a linha |
| upcoming_job DELETE com ID | 7 | 0 | nenhuma | remoÃ§Ã£o local por chave |
| review INSERT, payload completo | 7 | 0 | nenhuma | estado de reviews recalcula consumidores locais |
| review UPDATE, payload completo | 7 | 0 | nenhuma | substituiÃ§Ã£o local por ID |
| review INSERT/UPDATE, payload incompleto | 7 | 1 | review por ID | completar somente a linha |
| review DELETE com ID | 7 | 0 | nenhuma | remoÃ§Ã£o local por chave |
| qualquer DELETE sem ID | 7 | 0 | nenhuma | warning em DEV; nunca faz refresh global |

As contagens acima sÃ£o estruturais. A instrumentaÃ§Ã£o registra tabela, tipo, handler,
uso do payload, nomes das consultas individuais, operaÃ§Ãµes, linhas, `approximateBytes`
e duraÃ§Ã£o. `approximateBytes` mede JSON observado em desenvolvimento/testes e nÃ£o deve
ser interpretado como egress real faturado pelo Supabase.

### Cobertura de regressÃ£o da Etapa 2

- helpers puros cobrem inserÃ§Ã£o, substituiÃ§Ã£o, deduplicaÃ§Ã£o, remoÃ§Ã£o, ordenaÃ§Ã£o e versÃ£o antiga;
- teste do canal cobre os quatro listeners, eventos tipados, descarte de evento desconhecido e cleanup;
- buscas granulares usam colunas explÃ­citas e nunca consultam notifications ou domÃ­nios nÃ£o relacionados;
- notifications, chat e gamificaÃ§Ã£o nÃ£o foram alterados nesta etapa.

## Etapa 3A.1 - Resumo administrativo agregado

**ESTIMATIVA ESTRUTURAL:** o painel administrativo deixou de depender da carga global do
`AppDataContext`. A rota server-side valida sessÃ£o e papel antes de executar uma Ãºnica
RPC com `service_role`. A RPC retorna apenas contagens, taxas e agregados por categoria;
nenhum request, application, profile ou budget individual Ã© transferido ao navegador.

| Fluxo | Antes | Depois | ReduÃ§Ã£o estrutural |
|---|---|---|---|
| Abrir AdminDashboard | carga global de 7 operaÃ§Ãµes do AppDataContext | 1 endpoint + 1 RPC agregada | elimina listas completas do fluxo admin |
| MÃ©tricas de requests | requests completos no navegador | contagens no PostgreSQL | zero linhas individuais |
| MÃ©tricas de applications | applications completas no navegador | contagens e taxas no PostgreSQL | zero linhas individuais |
| InteligÃªncia por categoria | requests, applications e budgets individuais | agregados por categoria | zero budgets individuais |
| Profiles e demais domÃ­nios | carregados como efeito colateral | nÃ£o consultados pelo summary | domÃ­nios nÃ£o usados excluÃ­dos |

As linhas acima descrevem operaÃ§Ãµes e formato de payload, nÃ£o egress real faturado. A
migration `0051_admin_dashboard_summary_rpc.sql` permanece local e precisa ser aplicada
antes de o endpoint funcionar em um ambiente Supabase.
