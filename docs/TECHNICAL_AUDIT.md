# LinkHelp — Auditoria Técnica Pré-Beta

**Data:** 2026-06-18  
**Escopo:** auditoria estática read-only do repositório (frontend, API, Supabase, i18n, performance, segurança, PWA).  
**Nenhum código, SQL ou deploy foi alterado nesta etapa.**

**Contexto:** financeiro Cliente/Helper e Stripe operacionais; migrations documentadas em `supabase/MIGRATION_STATUS.md`, `VERIFY_PRODUCTION_CHECKLIST.md`, `MIGRATION_CONSOLIDATION_PLAN.md`.

---

## Resumo executivo

O LinkHelp está **funcional para beta fechado** nas áreas críticas já validadas (créditos cliente, Stripe cliente/helper via Vercel, ledger, publicação de pedidos). Porém a auditoria revela **dívida técnica acumulada** de duas vias paralelas de evolução (migrations numeradas vs `apply_*.sql` manuais; checkout Vercel vs Edge Functions legadas) e **alguns bugs reais** que podem aparecer em produção antes do beta ampliado.

| Categoria | Quantidade |
|-----------|------------|
| 🔴 Críticos | **9** |
| 🟡 Médios | **22** |
| 🟢 Baixos | **18** |

**Top 5 riscos antes do beta:**

1. **`/payments` (cliente) ainda usa checkout legado** — página helper + Edge Function, não o fluxo Stripe Cliente em `/client/credits`.
2. **Rejeição VIP** — frontend não chama `client_reject_application`; update direto pode deixar lock exclusivo inconsistente.
3. **Stripe dual-path** — Edge `stripe-webhook` + Vercel `api/stripe/webhook` podem coexistir; webhook retorna HTTP 200 em metadata inválida (sem retry).
4. **`send-push` sem autenticação** no payload direto — risco de spam push.
5. **Performance mobile** — ~9 MB em PNGs de tutorial + refetch global em todo evento Realtime.

---

## Legenda

| Campo | Significado |
|-------|-------------|
| **Risco** | Impacto se não corrigido antes/durante beta |
| **Prioridade** | P0 = antes do beta; P1 = durante beta; P2 = pós-beta |
| **Tipo** | Bug real vs melhoria vs dívida técnica |

---

## 🔴 Achados críticos

### C1 — `/payments` usa checkout legado em rota de cliente

| | |
|---|---|
| **Arquivos** | `src/routes/AppRoutes.tsx` (L121–124), `src/pages/payments/PaymentsPage.tsx`, `src/services/paymentService.ts` (`createCheckoutSession`) |
| **Risco** | Cliente autenticado em `/payments` invoca Supabase Edge `create-checkout-session` (metadata `helper_id`, tabela `credit_packages`), não o Vercel `create-client-checkout-session`. UI é orientada a **helper** (`CreditContext`, voltar para `helperDashboard`). Compra pode falhar, creditar errado ou não creditar. |
| **Tipo** | Bug real |
| **Prioridade** | **P0** |
| **Recomendação** | Redirecionar `ROUTES.payments` → `ROUTES.clientCredits` ou remover rota; deletar `createCheckoutSession` após migração. |

---

### C2 — Rejeição de candidatura VIP não usa RPC `client_reject_application`

| | |
|---|---|
| **Arquivos** | `src/pages/client/ClientDashboard.tsx` (L736), `src/context/AppDataContext.tsx`, `src/services/supabase/appDataRemote.ts` (`remoteUpdateApplicationStatus` L497–554), `supabase/apply_client_reject_vip_application.sql` |
| **Risco** | Rejeitar helper exclusivo faz `applications.update({ status: 'rejected' })` direto. RPC em produção (verify ✅) sincroniza `exclusive_helper_id`, notificações e regras VIP. Bypass pode deixar **lock exclusivo stale** ou comportamento divergente do verify. |
| **Tipo** | Bug real |
| **Prioridade** | **P0** |
| **Recomendação** | Em `remoteUpdateApplicationStatus`, quando `status === 'rejected'` e app exclusiva, chamar `client_reject_application`. Consolidar em migration `0043+`. |

---

### C3 — Dois webhooks Stripe possíveis (Vercel + Edge)

| | |
|---|---|
| **Arquivos** | `api/stripe/webhook.ts`, `supabase/functions/stripe-webhook/index.ts` |
| **Risco** | Edge chama `confirm_credit_purchase` (pré-0036); Vercel chama `confirm_stripe_linkcredit_purchase` / `confirm_client_stripe_linkcredit_purchase`. Se ambos registrados no Stripe Dashboard → crédito duplicado ou um path falha silenciosamente. |
| **Tipo** | Bug real / ops |
| **Prioridade** | **P0** |
| **Recomendação** | Confirmar no Stripe Dashboard **apenas** URL Vercel `/api/stripe/webhook`. Desativar/undeploy edge `stripe-webhook`. Documentar em runbook. |

---

### C4 — Webhook Vercel retorna 200 em metadata ausente

| | |
|---|---|
| **Arquivos** | `api/stripe/webhook.ts` (L211: `return res.status(200).send('missing metadata')`) |
| **Risco** | Sessão paga sem metadata → Stripe **não reenvia**; usuário paga e não recebe LC. |
| **Tipo** | Bug real |
| **Prioridade** | **P0** |
| **Recomendação** | Retornar 4xx/5xx retryável; alertar em logs; idempotência já existe via `payment_events`. |

---

### C5 — Edge Function `send-push` sem auth no modo direto

| | |
|---|---|
| **Arquivos** | `supabase/functions/send-push/index.ts` |
| **Risco** | Payload `{ userId, title, body }` aceito com CORS `*`; quem tiver anon key pode spammar push para qualquer usuário. |
| **Tipo** | Segurança |
| **Prioridade** | **P0** |
| **Recomendação** | Exigir service role, webhook secret ou JWT com `userId` = `auth.uid()`. Restringir modo direto ao admin/PushTest. |

---

### C6 — `RegisterPage` com copy hardcoded em português

| | |
|---|---|
| **Arquivos** | `src/pages/auth/RegisterPage.tsx` (~L204–239, L447), `src/translations/*/index.ts` (`register_page.title` existe mas não é usado) |
| **Risco** | Usuários EN/FR veem hero e botão "Continuar" em PT no fluxo de cadastro — regressão i18n visível no beta internacional. |
| **Tipo** | Bug UX / i18n |
| **Prioridade** | **P0** (beta CA) |
| **Recomendação** | Substituir strings por `t('register_page.*')` nas 3 línguas. |

---

### C7 — Refetch total de app-data em todo evento Realtime

| | |
|---|---|
| **Arquivos** | `src/services/supabase/appDataRemote.ts` (`subscribeRemoteData`), `src/context/AppDataContext.tsx` |
| **Risco** | Qualquer mudança em `requests`, `applications`, `messages`, etc. dispara `refreshRemote()` → 5 queries + map de perfis. Escala mal com usuários ativos; lentidão e custo Supabase no beta. |
| **Tipo** | Performance / estabilidade |
| **Prioridade** | **P0** |
| **Recomendação** | Debounce 300–500ms; updates incrementais (padrão já usado em notificações); paginar fetch inicial. |

---

### C8 — Assets PNG de tutorial (~9 MB)

| | |
|---|---|
| **Arquivos** | `public/brand/tutorial c1.png`–`c6.png` (~1.0–1.4 MB cada), `public/brand/dedo1.png` (~2.0 MB) |
| **Risco** | Primeira visita/onboarding em 4G baixa; PWA exclui PNG do precache mas download ainda ocorre. |
| **Tipo** | Performance |
| **Prioridade** | **P0** (mobile beta) |
| **Recomendação** | Converter para WebP/AVIF (&lt;150 KB cada); lazy-load; verificar se `dedo1.png` ainda é referenciado. |

---

### C9 — RPCs cliente críticos só em `apply_*.sql`, não em `migrations/`

| | |
|---|---|
| **Arquivos** | `supabase/apply_client_publish_request_debit.sql`, `apply_client_stripe_credit_purchase.sql`, `apply_client_reject_vip_application.sql`, `apply_client_welcome_30_onboarding.sql`, etc. |
| **Risco** | Ambiente novo via `supabase db push` **quebra** publish, compra cliente, onboarding, VIP reject — apesar de prod estar OK (verify 10/10). |
| **Tipo** | Dívida técnica / ops |
| **Prioridade** | **P0** (antes de novo ambiente) |
| **Recomendação** | Executar plano `MIGRATION_CONSOLIDATION_PLAN.md` (`0043+`). |

---

## 🟡 Achados médios

### M1 — Dashboards monolíticos (alto risco de regressão)

| | |
|---|---|
| **Arquivos** | `src/pages/client/ClientDashboard.tsx` (~1632 linhas), `src/pages/helper/HelperDashboard.tsx` (~1426 linhas) |
| **Risco** | Qualquer mudança de UI/financeiro toca arquivo gigante; difícil review e teste. |
| **Prioridade** | P1 |
| **Recomendação** | Extrair painéis (jobs, propostas, feed) em módulos; não bloquear beta, planejar pós-beta. |

---

### M2 — `CreateRequestModal` (~990 linhas)

| | |
|---|---|
| **Arquivos** | `src/components/client/create-request/CreateRequestModal.tsx` |
| **Prioridade** | P1 |
| **Recomendação** | Continuar extração por step (já parcialmente feito). |

---

### M3 — Contextos grandes (`AuthContext`, `AppDataContext`)

| | |
|---|---|
| **Arquivos** | `src/context/AuthContext.tsx` (~882), `src/context/AppDataContext.tsx` (~772) |
| **Prioridade** | P1 |
| **Recomendação** | Separar OAuth, profile bootstrap e domínios de dados. |

---

### M4 — `PaymentsPage` é página helper fantasma na área cliente

| | |
|---|---|
| **Arquivos** | `src/pages/payments/PaymentsPage.tsx` — `CreditContext`, admin helper credits, navegação para `helperDashboard` |
| **Risco** | Além de C1, confunde manutenção (dois “stores” de crédito). |
| **Prioridade** | P0/P1 (resolver com C1) |
| **Recomendação** | Remover ou mover para admin/helper-only. |

---

### M5 — Catálogo de pacotes duplicado (servidor vs cliente)

| | |
|---|---|
| **Arquivos** | `api/stripe/packages.ts`, `src/config/linkCreditPackages.ts` |
| **Risco** | Drift de `priceId`/preço entre UI e validação server. |
| **Prioridade** | P1 |
| **Recomendação** | Módulo compartilhado ou validação só por Stripe Price ID + metadata. |

---

### M6 — Checkout role-check falha aberto se service role ausente

| | |
|---|---|
| **Arquivos** | `api/stripe/create-checkout-session.ts`, `create-client-checkout-session.ts`, `api/stripe/supabaseAdmin.ts` |
| **Risco** | Sem `SUPABASE_SERVICE_ROLE_KEY`, checagem `CLIENTS_ONLY`/`HELPERS_ONLY` pode ser pulada. |
| **Prioridade** | P1 |
| **Recomendação** | Retornar 503 se admin client indisponível. |

---

### M7 — `clientCreditsSuccess` dentro de `ProtectedRoute`; helper success fora

| | |
|---|---|
| **Arquivos** | `src/routes/AppRoutes.tsx` (L87–88 vs L116) |
| **Risco** | Retorno Stripe cliente pode redirecionar para login se sessão ainda não restaurou. |
| **Prioridade** | P1 |
| **Recomendação** | Monitorar; alinhar com padrão helper se houver tickets. |

---

### M8 — `DashboardEntryPage` fora de `ProtectedRoute`

| | |
|---|---|
| **Arquivos** | `src/routes/AppRoutes.tsx` (L86), `src/pages/app/DashboardEntryPage.tsx` |
| **Risco** | Guard inline duplicado; UX diferente de `ProtectedRoute` quando profile ausente. |
| **Prioridade** | P1 |
| **Recomendação** | Unificar guard ou documentar exceção. |

---

### M9 — Console logs em produção (auth, wallet, hire)

| | |
|---|---|
| **Arquivos** | `src/lib/authDebug.ts` (`authFlowLog` sem gate DEV), `src/context/AuthContext.tsx`, `src/hooks/useWalletBalance.ts`, `src/pages/client/ClientDashboard.tsx`, `src/components/helpers/profile-setup/SimpleAvatarUploadModal.tsx` |
| **Risco** | PII (email, userId) em console do browser; ~80 `console.log`/`warn` no `src/`. |
| **Prioridade** | P1 |
| **Recomendação** | Gate `import.meta.env.DEV` ou flag `VITE_DEBUG_*`; remover logs de wallet/hire. |

---

### M10 — Hooks legados não usados

| | |
|---|---|
| **Arquivos** | `src/hooks/useAuth.ts`, `useJobs.ts`, `useRequests.ts`, `useApplications.ts`, `useMessages.ts`, `useNotifications.ts`, `useHelpers.ts`, `useTranslations.ts` |
| **Prioridade** | P2 |
| **Recomendação** | Remover após grep; código usa `AuthContext` / `AppDataContext` / `useSupabaseMessages` diretamente. |

---

### M11 — Componentes órfãos

| | |
|---|---|
| **Arquivos** | `HelperSubscriptionPlanModal.tsx`, `PortfolioSetupGuideModal.tsx`, `HelperSidebarDisclosure.tsx`, `ProfileRewardsProgress.tsx`, `LhInput.tsx`, `LhSectionTitle.tsx` |
| **Prioridade** | P2 |
| **Recomendação** | Deletar ou conectar atrás de feature flags. |

---

### M12 — Serviços placeholder sem imports

| | |
|---|---|
| **Arquivos** | `src/services/authService.ts`, `helperService.ts`, `jobService.ts`, `notificationService.ts` |
| **Prioridade** | P2 |
| **Recomendação** | Remover ou implementar. |

---

### M13 — `confirm_credit_purchase` / `refund_opportunity_unlock` em tipos mas legado

| | |
|---|---|
| **Arquivos** | `src/types/supabase.database.ts`, `supabase/functions/stripe-webhook`, migration `0042` |
| **Prioridade** | P1 |
| **Recomendação** | Regenerar tipos; remover referências em docs (`.cursor/rules`, `API_ARCHITECTURE.md`). |

---

### M14 — `apply_*.sql` sem `verify_*.sql` correspondente

| | |
|---|---|
| **Arquivos** | `apply_account_deletion_fix.sql`, `apply_application_count_fix.sql`, `apply_bug1_accepted_amount.sql`, `apply_bug2_profile_role_fix.sql`, `apply_fix_linkcredits_scale.sql` (parcialmente coberto por `verify_no_legacy_linkcredits`), `apply_profile_account_settings.sql`, `apply_requests_address_budget.sql`, `apply_profiles_region.sql` |
| **Prioridade** | P1 |
| **Recomendação** | Criar verifies ou consolidar em migrations `0043+`. |

---

### M15 — Verifies ainda não rodados em produção (rodada 10/10)

| | |
|---|---|
| **Arquivos** | `verify_accept_proposal_flow.sql`, `verify_service_workflow.sql`, `verify_opportunity_unlock_refunds.sql`, `verify_helper_exclusive_application.sql` (contém NOTIFY) |
| **Prioridade** | P1 |
| **Recomendação** | Segunda rodada read-only antes do beta ampliado. |

---

### M16 — Divergência migration `0041` vs `apply_helper_exclusive_application_fix`

| | |
|---|---|
| **Arquivos** | `supabase/migrations/0041_*`, `supabase/apply_helper_exclusive_application_fix.sql` |
| **Risco** | `exclusive_helper_id`, triggers — inferido OK em prod (VIP verify passou), mas repo diverge. |
| **Prioridade** | P1 |
| **Recomendação** | Migration consolidada `0049+` no plano. |

---

### M17 — Fetch duplicado em páginas de crédito cliente

| | |
|---|---|
| **Arquivos** | `src/pages/client/ClientCreditsPage.tsx`, `src/components/client/ClientProfileLinkCreditsPanel.tsx` |
| **Risco** | `refreshProfile()` + 2× `fetchClientCreditLedger` (recent + month até 520 rows) em cada mount. |
| **Prioridade** | P1 |
| **Recomendação** | Um fetch; derivar métricas do mês no cliente; compartilhar cache entre profile e credits page. |

---

### M18 — `refreshProfile` disparado em múltiplos guards

| | |
|---|---|
| **Arquivos** | `ProtectedRoute.tsx`, `LoginPage.tsx`, `DashboardEntryPage.tsx`, success pages |
| **Prioridade** | P1 |
| **Recomendação** | Centralizar bootstrap no `AuthContext`. |

---

### M19 — PWA `autoUpdate` com reload silencioso

| | |
|---|---|
| **Arquivos** | `src/main.tsx`, `vite.config.ts` |
| **Risco** | Usuário perde estado de formulário em reload forçado. |
| **Prioridade** | P1 |
| **Recomendação** | Banner "Nova versão disponível" antes de `updateSW()`. |

---

### M20 — `bg-fixed` em páginas de compra LC

| | |
|---|---|
| **Arquivos** | `ClientCreditsPage.tsx`, `HelperLinkCreditsPage.tsx` |
| **Risco** | Comportamento ruim em iOS Safari (jank/scroll). |
| **Prioridade** | P1 |
| **Recomendação** | `bg-scroll` ou pseudo-elemento fixo. |

---

### M21 — Admin `PushTestPage` em português hardcoded

| | |
|---|---|
| **Arquivos** | `src/pages/admin/PushTestPage.tsx` |
| **Prioridade** | P2 |
| **Recomendação** | i18n ou documentar como ferramenta interna PT-only. |

---

### M22 — `aria-label` em inglês no design system

| | |
|---|---|
| **Arquivos** | `PremiumResponsiveModal.tsx`, `PremiumDatePicker.tsx`, `PageLoader.tsx`, `StarRatingInput.tsx` |
| **Prioridade** | P2 |
| **Recomendação** | Passar `t('common.close')` etc. |

---

## 🟢 Melhorias baixas

| ID | Achado | Arquivos | Prioridade | Recomendação |
|----|--------|----------|------------|--------------|
| G1 | Rotas legacy `/login`, `/signup`, `/helper/jobs/upcoming` | `AppRoutes.tsx` | P2 | Manter redirects; limpar constantes deprecated |
| G2 | `helperJobsUpcoming` alias em `constants.ts` | `src/utils/constants.ts` | P2 | Remover após migração de links |
| G3 | `howItWorks` / `contact` públicos fora de `PublicOnlyRoute` | `AppRoutes.tsx` | P2 | OK se marketing deve ser visível logado |
| G4 | Duplicação layout store LC (client/helper) | `ClientCreditsPage`, `HelperLinkCreditsPage` | P2 | Extrair `LinkCreditsStoreShell` |
| G5 | Dois sistemas de modal (`LhModal` vs `PremiumResponsiveModal`) | design-system | P2 | Documentar guideline |
| G6 | Chaves duplicadas PT em `live_map` vs `helper_dashboard` | `translations/pt/index.ts` | P2 | Limpar órfãs |
| G7 | `verifying_balance` semântica duplicada helper/client | translations | P2 | Renomear chaves |
| G8 | `linkcredits_brand` em dois namespaces | translations | P2 | Consolidar |
| G9 | `IdeasPage` inglês (flag off) | `IdeasPage.tsx`, `uiVisibility.ts` | P2 | Baixa prioridade |
| G10 | `CreditContext` fallback PT `'Interesse em oportunidade'` | `CreditContext.tsx` | P2 | Usar chave i18n |
| G11 | `CAD $` hardcoded no create request | `CreateRequestModal.tsx` | P2 | i18n currency |
| G12 | `JobReminderBridge` + hook deprecated | `JobReminderBridge.tsx`, `useJobReminderNotifications.ts` | P2 | Remover se reminders off |
| G13 | `createDemoPaymentIntent` sem callers | `paymentService.ts` | P2 | Deletar |
| G14 | Bundle principal ~996 KB (~297 KB gzip) | build Vite | P2 | Code-split lucide/dashboards |
| G15 | `index.html` `lang="en"` fixo | `index.html` | P2 | Sync com locale ou manter EN default |
| G16 | `lh-bottom-nav` CSS vs inline em `MobileBottomNav` | `premium-theme.css` | P2 | Unificar |
| G17 | `100vw` no carousel client dashboard | `ClientDashboard.tsx` | P2 | Evitar overflow horizontal |
| G18 | Docs desatualizados (`GET /api/stripe/packages`, `confirm_credit_purchase`) | `docs/API_ARCHITECTURE.md` | P2 | Atualizar após consolidação |

---

## 1. Frontend — detalhes

### Páginas e rotas

| Status | Detalhe |
|--------|---------|
| ✅ | Todas as páginas em `src/pages/**` estão roteadas ou compostas (`LiveMapPage` → sub-mapas) |
| ✅ | Todas as páginas usam `lazyPage()` / `lazy()` |
| ⚠️ | `PaymentsPage` legada na rota cliente (ver C1, M4) |
| ⚠️ | Múltiplas paths → mesmo dashboard (intencional para deep links) |

### Proteção de rotas

```
Layout
├── PublicOnlyRoute → home, login, signup
├── Público → howItWorks, contact, resetPassword, authCallback
├── Inline auth → dashboard, helperCreditsSuccess
└── ProtectedRoute
    ├── RoleRoute client → dashboard, credits, ideas, payments
    ├── RoleRoute helper → dashboard, jobs, training
    └── AdminProtectedRoute → admin, push-test
```

### Código morto confirmado

- Hooks: `useAuth.ts` barrel (0 imports), `useMessages`, `useNotifications`, `useJobs`, etc.
- Componentes: 4 helper modals/panels sem importadores
- Design system: `LhInput`, `LhSectionTitle` exportados, não consumidos

---

## 2. Backend / API — detalhes

### Endpoints Vercel (`api/stripe/`)

| Rota | Função | Auth |
|------|--------|------|
| `POST create-checkout-session` | Helper LC checkout | Bearer + role ≠ client |
| `POST create-client-checkout-session` | Client LC checkout | Bearer + role = client |
| `POST webhook` | Stripe events | `stripe-signature` |

**Separação Cliente/Helper:** correta no caminho Vercel canônico. Metadata `purchase_audience: 'client'` no checkout cliente.

### Edge Functions legadas (`supabase/functions/`)

| Function | Status | Ação sugerida |
|----------|--------|---------------|
| `create-checkout-session` | Legado; usado só por `PaymentsPage` | Descontinuar |
| `stripe-webhook` | Legado; RPC antiga | Descontinuar |
| `send-push` | Ativo; sem auth direto | Corrigir (C5) |
| `process-credit-refunds` | Cron; auth por secret | OK; melhorar comparação token |

### RPCs frontend → backend (mapa resumido)

| RPC | Caller | Notas |
|-----|--------|-------|
| `client_publish_request` | `appDataRemote` | apply-only |
| `client_accept_proposal` | `appDataRemote` | OK |
| `client_reject_application` | **Nenhum** | 🔴 C2 |
| `confirm_client_stripe_linkcredit_purchase` | webhook only | OK |
| `confirm_stripe_linkcredit_purchase` | webhook only | OK |
| `helper_submit_application` | `helperApplicationService` | OK |
| `admin_adjust_helper_credits` | `PaymentsPage` | RPC valida admin JWT |

---

## 3. Supabase / SQL — detalhes

Referência completa: `supabase/MIGRATION_STATUS.md`.

| Métrica | Valor |
|---------|-------|
| Migrations | 45 arquivos, números duplicados 0016/0017/0032 |
| apply_* | 25 |
| verify_* | 20 |
| Prod verify | 10/10 OK (2026-06-18) |

**apply ↔ verify pareados:** 17 pares nomeados (lista em `MIGRATION_STATUS.md`).

**apply sem verify dedicado:** 8 scripts (M14).

**verify sem apply 1:1:** `verify_no_legacy_linkcredits`, `verify_opportunity_unlock_refunds`, `verify_dispatch_push_trigger_return_fix`.

---

## 4. Traduções — detalhes

| Status | Detalhe |
|--------|---------|
| ✅ | ~70 namespaces, paridade estrutural pt/en/fr |
| 🔴 | RegisterPage ignora chaves existentes (C6) |
| 🟡 | Drift pontual PT (`live_map` duplicatas) |
| 🟡 | Admin push test PT-only |
| 🟢 | Sem script CI de diff de chaves |

**Namespaces duplicados semânticos:** `credits` vs `helper_credits` vs `client_credits` vs `link_credits_store` — intencional por role, mas aumenta manutenção.

---

## 5. Performance — detalhes

| Área | Achado |
|------|--------|
| Realtime | Refetch total (C7) |
| Ledger cliente | 2 fetches + refreshProfile (M17) |
| App mount | `fetchRemoteJobsAndApps` sem paginação |
| Assets | 9 MB PNGs (C8); WebP heroes OK (7–74 KB) |
| Bundle | `index-*.js` ~996 KB; `lucide-react` chunk ~813 KB |
| Build | PWA precache 123 entries ~3.5 MB (exclui PNGs grandes) |

---

## 6. Segurança — detalhes

| Item | Status |
|------|--------|
| `STRIPE_SECRET_KEY` / `WEBHOOK_SECRET` / `SERVICE_ROLE` | Apenas server ✅ |
| `VITE_*` no browser | Supabase anon, Maps, VAPID public — esperado ✅ |
| RLS | Assumido via Supabase; não re-auditado nesta etapa |
| Checkout auth | Bearer obrigatório ✅ |
| Webhook | Assinatura Stripe ✅ |
| send-push | 🔴 C5 |
| admin_adjust_helper_credits | Mitigado por RPC server-side |

---

## 7. PWA / mobile — detalhes

| Item | Status |
|------|--------|
| VitePWA + Workbox | Configurado |
| `push-sw.js` | Handlers OK; título fallback `'LinkHelp'` |
| Precache | PNG/MP4 brand excluídos do glob |
| Mobile nav | `MobileBottomNav` + safe-area em `Layout` |
| Prompts PWA/push | `z-[42]` acima da nav — testar empilhamento |
| iOS credits store | `bg-fixed` (M20) |

---

## O que NÃO mexer agora

| Área | Motivo |
|------|--------|
| **Navbar brand** (handshake, animação) | Congelado por decisão do usuário |
| **Stripe Price IDs / pacotes** | Funcionando em prod |
| **Helper LinkCredits store** | Recém-validado; separado do cliente |
| **Migrations 0001–0042** | Não renomear; plano em `MIGRATION_CONSOLIDATION_PLAN.md` |
| **`apply_*.sql` em prod** | Não deletar até migrations `0043+` aplicadas |
| **Dashboard/Home/Profile cliente** | Recém-ajustados |
| **`stash@{0}`** | Não aplicar |
| **Feature flags desligadas** | `helperSubscriptionPlans`, `ideas`, `training` — OK para beta |

---

## Plano de ação em fases

### Fase 0 — Pré-beta imediato (P0, 1–2 sprints)

1. Corrigir rota `/payments` → `/client/credits` (C1).
2. Wire `client_reject_application` no reject VIP (C2).
3. Auditar Stripe Dashboard: um webhook Vercel (C3).
4. Webhook: erro retryável sem metadata (C4).
5. Autenticar `send-push` (C5).
6. i18n `RegisterPage` (C6).
7. Debounce/coalesce `refreshRemote` (C7).
8. Comprimir assets tutorial (C8).

### Fase 1 — Consolidação DB (P0/P1)

1. Migrations `0043+` per `MIGRATION_CONSOLIDATION_PLAN.md` (C9).
2. Segunda rodada verify (M15).
3. Regenerar tipos Supabase; limpar RPCs legados (M13).

### Fase 2 — Hardening beta (P1)

1. Remover checkout Edge + `PaymentsPage` legado.
2. Fail-closed checkout sem service role (M6).
3. Alinhar success routes Stripe cliente (M7).
4. DEV-gate console logs (M9).
5. Otimizar fetches crédito cliente (M17).
6. PWA update UX (M19).

### Fase 3 — Qualidade pós-beta (P2)

1. Split dashboards (M1).
2. Remover hooks/componentes mortos (M10–M12).
3. CI diff i18n.
4. Code-split bundle.
5. Atualizar docs API.

---

## Referências cruzadas

| Documento | Conteúdo |
|-----------|----------|
| `supabase/MIGRATION_STATUS.md` | Estado migrations + verify prod |
| `supabase/VERIFY_PRODUCTION_CHECKLIST.md` | 10/10 verify OK |
| `supabase/MIGRATION_CONSOLIDATION_PLAN.md` | Plano `0043+` |
| `docs/LAYOUT_DESIGN.md` | Guidelines visuais |

---

*Auditoria gerada em modo read-only. Nenhum arquivo de código ou SQL foi modificado.*
