# DEPLOY_GUIDE — LinkHelp

> Guia completo de deploy para produção via Vercel + Supabase.

---

## Pré-requisitos

- Node.js ≥ 20
- Conta Vercel (vercel.com)
- Projeto Supabase criado
- Conta Stripe (modo live para produção)
- Google Cloud Console (Maps API + OAuth)

---

## 1. Configurar Supabase

### 1.1 Criar projeto
1. Acessar [supabase.com](https://supabase.com) → New project
2. Anotar: **Project URL** e **anon public key** (Settings → API)
3. Anotar **Service Role Key** (Settings → API → secret — nunca expor ao browser)

### 1.2 Aplicar schema
Execute **em ordem** no SQL Editor do Supabase:
```
supabase/migrations/0001_linkhelp_production.sql   ← schema base
supabase/migrations/0002_*.sql
...
supabase/migrations/0039_*.sql                     ← último migration
```

### 1.3 Configurar Auth
- Authentication → URL Configuration → Site URL: `https://seu-dominio.vercel.app`
- Redirect URLs (adicionar todos):
  ```
  https://seu-dominio.vercel.app/auth/callback
  http://localhost:3000
  http://localhost:3001
  http://localhost:3000/auth/callback
  ```
- Providers → Google: ativar, inserir Client ID e Secret do Google Cloud

### 1.4 Criar bucket de storage
- Storage → New bucket: `avatars` (público)
- Storage → New bucket: `portfolio` (público)

### 1.5 Deploy Edge Functions
```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy send-push
```

Secrets necessários nas Edge Functions:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set VAPID_PRIVATE_KEY=xxx
supabase secrets set VAPID_SUBJECT=mailto:admin@linkhelp.ca
```

---

## 2. Configurar Stripe

### 2.1 Produtos e preços
No Stripe Dashboard → Products, criar:
- Starter (35 LC) — CAD $14.99
- Popular (80 LC) — CAD $29.99
- Pro (180 LC) — CAD $59.99
- Power (400 LC) — CAD $119.99

### 2.2 Webhook
- Stripe Dashboard → Webhooks → Add endpoint
- URL: `https://seu-dominio.vercel.app/api/stripe/webhook`
- Eventos: `payment_intent.succeeded`, `checkout.session.completed`
- Copiar **Signing Secret** → `STRIPE_WEBHOOK_SECRET`

---

## 3. Configurar Google Cloud

### 3.1 Maps JavaScript API
- Google Cloud Console → APIs → Maps JavaScript API → Ativar
- Credentials → Create API Key
- Restrições HTTP referrer:
  ```
  https://seu-dominio.vercel.app/*
  http://localhost:3000/*
  ```

### 3.2 OAuth (Google Sign-In)
- APIs → OAuth consent screen → configurar
- Credentials → OAuth 2.0 Client ID (Web application)
- Authorized redirect URIs:
  ```
  https://xxx.supabase.co/auth/v1/callback
  ```
- Copiar Client ID e Secret → Supabase Auth → Google Provider

---

## 4. Deploy na Vercel

### 4.1 Primeiro deploy
```bash
# Instalar Vercel CLI
npm i -g vercel

# Na raiz do projeto
vercel

# Ou via GitHub: importar repositório em vercel.com/new
```

### 4.2 Variáveis de ambiente (Vercel Dashboard → Settings → Environment Variables)

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Google Maps
VITE_GOOGLE_MAPS_PLATFORM_KEY=AIzaS...

# Site URL
VITE_SITE_URL=https://seu-dominio.vercel.app

# Stripe (frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Web Push
VITE_VAPID_PUBLIC_KEY=BPxxx...

# Stripe (server — apenas nas API routes)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Admin (server)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4.3 Build settings (auto-detectados pelo Vite)
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

---

## 5. Desenvolvimento local

```bash
# 1. Clonar e instalar
git clone https://github.com/labsaxion1-collab/-LinkHelp.git
cd -LinkHelp
npm install

# 2. Configurar ambiente
cp .env.example .env
# Editar .env com valores reais

# 3. Rodar
npm run dev
# → http://localhost:3000 (ou 3001/3002 se ocupado)
```

---

## 6. Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento Vite (porta 3000) |
| `npm run build` | Build de produção → `dist/` |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Verificação TypeScript (`tsc --noEmit`) |
| `npm run db:apply-region` | Aplica configuração de região Supabase |

---

## 7. PWA

O app é uma PWA configurada via `vite-plugin-pwa`:
- `public/manifest.json` — metadados da PWA
- `public/sw.js` — service worker (gerado automaticamente)
- `public/icons/` — ícones para instalação

---

## 8. Domínio personalizado

Vercel Dashboard → Domains → Add domain
- Configurar DNS: CNAME apontando para `cname.vercel-dns.com`
- Atualizar `VITE_SITE_URL` e redirect URLs no Supabase
