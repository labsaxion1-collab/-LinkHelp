# LinkHelp

**Marketplace local de serviços** que conecta clientes e helpers por categoria, região, disponibilidade e confiança.

[![Deploy Status](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)](https://link-help.vercel.app)
[![Supabase](https://img.shields.io/badge/backend-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://typescriptlang.org)

---

## Visão geral

O LinkHelp opera como um **marketplace de leads**: o cliente publica uma necessidade guiada por categoria, e helpers qualificados recebem oportunidades filtradas por categoria e região. O helper usa **LinkCréditos (LC)** para demonstrar interesse e candidatar-se aos pedidos mais relevantes.

### Fluxo principal

```
Cliente publica pedido → Helpers recebem no feed → Helper usa LC para se candidatar
→ Cliente revisa candidaturas → Aceita helper → Job agendado → Conclusão + avaliação
```

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 6 |
| Estilo | Tailwind CSS v4, clsx, tailwind-merge |
| Animações | motion/react (Framer Motion) |
| Ícones | Lucide React |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| API routes | Vercel Serverless Functions |
| Pagamentos | Stripe Checkout |
| Mapas | Google Maps JavaScript API (@vis.gl/react-google-maps) |
| Push | Web Push (VAPID via Supabase Edge Function) |
| IA | Google Generative AI (Gemini) — tradução |
| PWA | vite-plugin-pwa + Workbox |
| Deploy | Vercel |

---

## Rotas da aplicação

| Rota | Acesso | Página |
|------|--------|--------|
| `/` | Público | Landing Page |
| `/como-funciona` | Público | How It Works |
| `/contato` | Público | Contact |
| `/auth/login` | Não autenticado | Login |
| `/auth/register` | Não autenticado | Cadastro |
| `/auth/callback` | OAuth redirect | Callback Google |
| `/dashboard` | Autenticado | Redireciona por role |
| `/client/dashboard` | Cliente | Dashboard do cliente |
| `/client/jobs` | Cliente | Pedidos do cliente |
| `/helper/dashboard` | Helper | Feed de oportunidades |
| `/helper/jobs` | Helper | Jobs agendados |
| `/helper/credits` | Helper | Carteira de LC |
| `/helper/linkcredits` | Helper | Comprar LC |
| `/messages` | Autenticado | Chat |
| `/notifications` | Autenticado | Notificações |
| `/map` | Autenticado | Mapa ao vivo |
| `/profile` | Autenticado | Perfil |
| `/settings` | Autenticado | Configurações |
| `/admin/dashboard` | Admin only | Painel FLUX Admin |

---

## Categorias de serviço

| ID | Nome | Cor |
|----|------|-----|
| `cleaning` | Limpeza | Ciano |
| `sanitization` | Higienização | Teal |
| `moving` | Mudanças | Azul |
| `assembly` | Montagem | Índigo |
| `automotive` | Automotivo | Laranja |
| `translation` | Tradução | Violeta |
| `beauty` | Estética | Rosa |
| `renovation` | Reforma | Cinza |
| `outdoor` | Área externa | Esmeralda |
| `pet` | Pets | Âmbar |
| `tech` | Suporte TI | Índigo escuro |
| `design` | Design | Fúcsia |
| `marketing` | Marketing | Vermelho |
| `other` | Outros | Cinza |

---

## Desenvolvimento local

```bash
git clone https://github.com/labsaxion1-collab/-LinkHelp.git
cd -LinkHelp
npm install
cp .env.example .env
# Preencher .env com as chaves do Supabase (ver .env.example)
npm run dev
# → http://localhost:3000
```

**Variáveis obrigatórias** (mínimo para rodar):
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Documentação técnica

| Documento | Descrição |
|-----------|-----------|
| [`docs/PROJECT_RULES.md`](docs/PROJECT_RULES.md) | Convenções de código, estrutura, regras |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | Tabelas, colunas, RLS, funções |
| [`docs/API_ARCHITECTURE.md`](docs/API_ARCHITECTURE.md) | Serviços, contextos, fluxo de auth |
| [`docs/UI_GUIDELINES.md`](docs/UI_GUIDELINES.md) | Design system, cores, tipografia, i18n |
| [`docs/DEPLOY_GUIDE.md`](docs/DEPLOY_GUIDE.md) | Deploy Vercel + Supabase passo a passo |

---

## Scripts

```bash
npm run dev          # Dev server (porta 3000)
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # TypeScript check
npm run test         # Unit tests (vitest)
```

### Reembolso automático de LinkCredits

Quando um helper gasta LC para demonstrar interesse (`APPLICATION_INTEREST`) e o **cliente não responde** dentro do prazo configurado (padrão **48h**, tabela `platform_settings.response_deadline_hours`), o job `process_expired_unlock_refunds` devolve **100%** dos créditos.

| Item | Detalhe |
|------|---------|
| Migração | `supabase/migrations/0042_opportunity_unlock_refunds.sql` |
| Job (cron) | Edge Function `process-credit-refunds` → RPC `process_expired_unlock_refunds` |
| Admin | RPC `admin_force_unlock_refund(unlock_id)` |
| Env | `RESPONSE_DEADLINE_HOURS` documentado em `.env.example` (valor em `platform_settings`) |

Rodar manualmente em dev/staging:

```bash
supabase functions deploy process-credit-refunds
curl -X POST "$VITE_SUPABASE_URL/functions/v1/process-credit-refunds" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Ou via SQL Editor (service role): `select public.process_expired_unlock_refunds();`

---

## Integrações

- **Supabase Auth**: email/senha + Google OAuth (PKCE)
- **Stripe**: pacotes de LinkCréditos (Starter/Popular/Pro/Power)
- **Google Maps**: mapa de oportunidades e helpers próximos
- **Web Push**: alertas de novos pedidos (VAPID)
- **Gemini AI**: tradução automática de documentos

---

## Arquitetura

```
Vercel (CDN + Serverless)
├── /dist              ← React PWA (static)
└── /api/stripe/*      ← Serverless functions (Stripe)

Supabase
├── PostgreSQL         ← dados + RLS
├── Auth               ← JWT + OAuth
├── Realtime           ← websockets
├── Storage            ← avatars, portfolio
└── Edge Functions     ← Stripe webhook, Push, Checkout
```

---

## Repositório

- GitHub: [labsaxion1-collab/-LinkHelp](https://github.com/labsaxion1-collab/-LinkHelp)
- Branch principal: `main`
- Deploy automático: push em `main` → Vercel deploy
