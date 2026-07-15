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
