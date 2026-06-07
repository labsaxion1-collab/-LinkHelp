# PROJECT_RULES — LinkHelp

> Convenções obrigatórias. Ler antes de qualquer alteração no código.

---

## 1. Estrutura de pastas

```
src/
├── components/       # Componentes React reutilizáveis
│   ├── design-system/  # LhCard, LhButton, LhModal, AppPageShell…
│   ├── auth/           # ProtectedRoute, RoleRoute, LoginSplashGate…
│   ├── layout/         # Layout, MobileBottomNav, Footer…
│   ├── opportunities/  # HelperOpportunityCard, InterestedRing
│   ├── client/         # CreateRequestModal, ClientRadarInsights…
│   ├── helper/         # HelperCategoriesManager, HelperCategoryDropdown…
│   ├── helpers/        # Cards de aplicação, sidebar, perfil setup…
│   ├── modals/         # UpcomingJobDetailModal, HelperProposalModal…
│   ├── map/            # HelperMapCanvas, JobMapOpportunityCard…
│   └── features/       # HelperPublicProfileView, HelperScorePanel…
├── pages/            # Páginas por rota
├── context/          # React Context (estado global)
├── services/         # Chamadas ao Supabase e APIs externas
├── utils/            # Funções puras (sem side-effects de UI)
├── data/             # Dados estáticos (categorias, catálogos)
├── config/           # Configurações (preços, flags, rewards)
├── types/            # TypeScript types (banco, domínio)
├── translations/     # i18n (pt, en, fr)
├── routes/           # AppRoutes.tsx
└── lib/              # Clientes singleton (supabase, authDebug)
```

---

## 2. Categorias de serviço

- **Fonte da verdade**: `src/data/serviceCategories.ts` → `SERVICE_CATEGORIES`
- **Cores**: `src/utils/categoryFeedTheme.ts` → `getCategoryFeedTheme()` / `getCategoryAccent()`
- **Traduções**: `src/translations/{lang}/index.ts` → `categories.{id}` e `service_subs.{id}.{subKey}`
- **Créditos**: `src/config/linkCreditsPricing.ts` → `LINK_CREDITS_CATEGORY_CATALOG`
- **Orçamento**: `src/utils/marketBudgetSuggestions.ts`
- **Ícones**: `src/utils/categoryIcons.ts` → mapeia `icon` string → Lucide component

Ao adicionar uma nova categoria, atualizar **todos** esses arquivos.

---

## 3. LinkCréditos (LC)

- Moeda interna do helper para candidatar-se a oportunidades
- Carteira: tabela `credit_wallets` (Supabase)
- Transações: tabela `credit_transactions`
- Débito ao demonstrar interesse: RPC `helper_debit_application_interest`
- Débito ao submeter candidatura: RPC `helper_submit_application`
- Compra: Stripe Checkout → webhook → RPC `confirm_credit_purchase`
- Bônus de onboarding: 20 LC ao se registrar como helper

---

## 4. Regras de segurança

- **Nunca expor** `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ao front-end
- Variáveis front-end devem ter prefixo `VITE_`
- RLS está habilitado em **todas** as tabelas — não desabilitar
- Operações privilegiadas (ex: grant reward) devem usar `SECURITY DEFINER` functions

---

## 5. TypeScript

- Usar `strict: true` (ver `tsconfig.json`)
- Tipos de banco em `src/types/database.ts` — manter em sync com migrations
- Nunca usar `any` sem justificativa
- Prefer `type` over `interface` para DTOs simples

---

## 6. Internacionalização (i18n)

- **Sempre** usar `t('chave')` para strings visíveis ao usuário
- Adicionar tradução nos 3 arquivos: `pt`, `en`, `fr`
- Chaves de categoria: `categories.{id}`, subcategoria: `service_subs.{id}.{subKey}`
- Helper: `useLanguage()` de `src/context/LanguageContext.tsx`

---

## 7. Componentes

- Preferir componentes funcionais com hooks
- Usar `memo()` em cards de lista (ex: HelperOpportunityCard)
- Estado local: `useState` / `useReducer`
- Estado global: Context API (não usar Redux/Zustand)
- Lazy loading em todas as páginas via `React.lazy()`

---

## 8. Serviços Supabase

- Sempre verificar `isSupabaseConfigured()` antes de chamadas ao banco
- Usar `getSupabase()` (singleton) — nunca criar novo client
- Tratar null retornado pelo client (env não configurado)
- Erros de auth: mapear via `mapSupabaseAuthError()`

---

## 9. Arquivos pesados (atenção ao contexto do AI)

| Arquivo | Tamanho | Motivo |
|---------|---------|--------|
| `src/translations/fr/index.ts` | ~104KB | Todo dicionário FR |
| `src/translations/pt/index.ts` | ~101KB | Todo dicionário PT |
| `src/translations/en/index.ts` | ~96KB | Todo dicionário EN |
| `src/pages/client/ClientDashboard.tsx` | ~71KB | Dashboard monolítico |
| `src/pages/helper/HelperDashboard.tsx` | ~70KB | Dashboard monolítico |
| `src/components/client/create-request/CreateRequestModal.tsx` | ~46KB | Modal complexo |
| `src/context/AuthContext.tsx` | ~31KB | Auth completo |
| `src/context/AppDataContext.tsx` | ~26KB | Estado central |

> Ao trabalhar nesses arquivos, ler apenas a seção necessária (offset/limit).

---

## 10. Commits e branches

- Branch principal: `main`
- Branch de features do Codex/AI: `codex/*`
- Commits em inglês, imperativo: "Add design category", "Fix card text truncation"
- Não commitar `.env` nem arquivos de secrets

---

## 11. Deploy

- **Plataforma**: Vercel (ver `docs/DEPLOY_GUIDE.md`)
- Build: `npm run build` (Vite)
- Preview: `npm run preview`
- API routes: `api/stripe/` (Vercel Serverless Functions)
- Edge Functions: `supabase/functions/` (Deno no Supabase)
