# API_ARCHITECTURE — LinkHelp

> Arquitetura de API: Supabase como BaaS + Vercel Serverless Functions para Stripe.

---

## Visão geral

```
Browser (React/Vite PWA)
    │
    ├── Supabase JS SDK (@supabase/supabase-js)
    │       ├── auth.* — autenticação
    │       ├── from('table').select/insert/update — banco de dados com RLS
    │       ├── channel().on('postgres_changes') — realtime
    │       └── rpc('function_name') — funções RPC
    │
    ├── Supabase Edge Functions (Deno)
    │       ├── /create-checkout-session
    │       ├── /stripe-webhook
    │       └── /send-push
    │
    └── Vercel API Routes (api/stripe/)
            ├── POST /api/stripe/create-checkout-session
            ├── POST /api/stripe/webhook
            └── GET  /api/stripe/packages
```

---

## Vercel API Routes (`api/stripe/`)

### `POST /api/stripe/create-checkout-session`
Cria uma sessão de checkout Stripe para compra de LinkCréditos.
- **Body**: `{ packageId, helperId, locale }`
- **Resposta**: `{ url: string }` — URL de redirecionamento Stripe
- **Deps**: `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### `POST /api/stripe/webhook`
Recebe eventos Stripe (assinado com `STRIPE_WEBHOOK_SECRET`).
- Processa `payment_intent.succeeded` → chama `confirm_credit_purchase` RPC
- Processa `checkout.session.completed`

### `GET /api/stripe/packages`
Lista pacotes de crédito disponíveis do catálogo front-end.

---

## Serviços front-end (`src/services/`)

### `src/services/supabase/appDataRemote.ts`
Serviço central de dados. Funções principais:
- `remoteLoadAppData()` — carrega requests, applications, upcoming_jobs, notifications
- `remotePublishRequest()` — publica novo pedido do cliente
- `remoteUpdateApplicationStatus()` — aceita/rejeita candidatura
- `remoteUpdateUpcomingWorkflow()` — atualiza workflow de job agendado
- `remoteHireHelper()` — aceita candidatura + cria upcoming_job

### `src/services/supabase/chatRemote.ts`
- `loadConversations()` — lista conversas do usuário
- `loadMessages()` — mensagens de uma conversa
- `sendMessage()` — envia mensagem

### `src/services/supabase/creditsRemote.ts`
- `loadCreditWallet()` — saldo e histórico de LC
- `loadCreditTransactions()` — transações paginadas

### `src/services/supabase/helperSkillsRemote.ts`
- `saveHelperSkills()` — salva subchaves de habilidades

### `src/services/supabase/reviewsRemote.ts`
- `submitReview()` — submete avaliação

### `src/services/supabase/helperBaseAddressRemote.ts`
- `saveHelperBaseAddress()` — salva endereço base (com lock por RPC)

### `src/services/supabase/nearbyHelpersRemote.ts`
- `fetchNearbyHelpers()` — busca helpers próximos por geolocalização

### `src/services/supabase/conversationEnsure.ts`
- `ensureConversation()` — garante thread única por (request, helper)

### `src/services/authService.ts`
- signIn / signUp / signOut / resetPassword / updatePassword / signInWithGoogle

### `src/services/helperLeadCredits.ts`
- `calculateHelperLeadCreditCost()` — calcula custo LC por oportunidade

### `src/services/marketSignals.ts`
- `trackMarketSignal()` — registra sinal de aceitação/recusa

### `src/services/translationService.ts`
- `translateText()` — tradução via Google Generative AI (Gemini)

### `src/services/notificationService.ts`
- `createNotification()` — cria notificação no banco

### `src/services/paymentService.ts`
- `createCheckoutSession()` — inicia checkout Stripe via API route

---

## Contextos de estado (`src/context/`)

| Contexto | Responsabilidade |
|----------|-----------------|
| `AuthContext` | session, user, profile, signIn/signOut/signUp, OAuth |
| `AppDataContext` | requests, applications, upcoming_jobs, notifications (realtime) |
| `CreditContext` | wallet de LC, transações, compra de pacotes |
| `LanguageContext` | i18n: idioma ativo, função `t()` |
| `ToastContext` | sistema de toasts/alertas |
| `ServiceReviewContext` | fluxo de avaliação pós-serviço |
| `AppModeContext` | modo do app (client/helper) |
| `ThemeContext` | tema (dark/light) |

---

## Realtime (Supabase Channels)

Assinaturas realtime configuradas em `AppDataContext`:
- `postgres_changes` em `requests` — novos pedidos
- `postgres_changes` em `applications` — candidaturas
- `postgres_changes` em `notifications` — alertas
- `postgres_changes` em `messages` — mensagens de chat (em `MessagesPage`)

---

## Fluxo de autenticação

```
1. signUpWithEmail / signInWithEmail / signInWithGoogle
        │
2. Supabase Auth → JWT (localStorage: 'linkhelp-auth')
        │
3. Trigger linkhelp_handle_new_user() → cria profiles row
        │
4. AuthContext.profile carregado via SELECT
        │
5. DashboardEntryPage → redireciona por role (client → /client/dashboard | helper → /helper/dashboard)
```

**OAuth Google**: PKCE flow por padrão. Callback em `/auth/callback` → `AuthCallbackPage`.

---

## Variáveis de ambiente necessárias

```env
# Frontend (Vite — devem ter prefixo VITE_)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GOOGLE_MAPS_PLATFORM_KEY=AIzaS...
VITE_SITE_URL=https://link-help.vercel.app
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_VAPID_PUBLIC_KEY=BPxxx...

# Servidor (Vercel / Supabase Edge — NÃO expor ao browser)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
