# Configuração externa (não executar em P4.0.2)

Mapa para sprints posteriores. **Sem valores.**

## Vercel Preview (somente)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (se usada pelas API routes)
- `SUPABASE_SERVICE_ROLE_KEY`
- Stripe test: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
- Opcionais: Maps, VAPID

**Não alterar Production.** Preferir variáveis Preview distintas do projeto staging novo.

## Auth (dashboard Supabase staging)

- Site URL / redirect: origem `teste.linkhelp.app` + `/auth/callback`
- Google OAuth client apontando ao projeto staging

## Storage

Buckets/policies vêm da migration `0006` na fundação.

## Edge Functions + cron

- Deploy das functions em `supabase/functions/` **no projeto staging**
- Secret de cron para `process-credit-refunds` → `process_expired_unlock_refunds` (Credit Protection)
- Stripe webhook test → APIs Vercel Preview ou function staging

## Domínio

- Alias `teste.linkhelp.app` → Preview da branch `staging` (já operacional no projeto Vercel; só troca de env Supabase)
