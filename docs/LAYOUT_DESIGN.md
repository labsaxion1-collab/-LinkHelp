# LAYOUT & DESIGN — LinkHelp

> **Modo design-only.** Referência única para layout, aparência e UX visual.  
> Não abrir: `DATABASE_SCHEMA.md`, `API_ARCHITECTURE.md`, `PUSH_NOTIFICATIONS.md`, `DEPLOY_GUIDE.md`, `PROJECT_RULES.md`.

---

## Escopo permitido

| Pode alterar | Não alterar |
|--------------|-------------|
| Classes Tailwind / `premium.*` | Lógica de negócio, hooks, estado |
| Estrutura JSX (grid, flex, spacing) | `src/services/`, RPCs, Supabase |
| Cores, tipografia, sombras, animações | Tipos de banco, schemas, migrations |
| Componentes visuais e variantes | Stripe, API routes, Edge Functions |
| `aria-*`, responsividade | Fluxos de auth, créditos, candidatura |

---

## Stack visual

- **Tailwind v4** — sem `tailwind.config.js`
- **Lucide** — `import * as Icons from 'lucide-react'`
- **motion/react** — animações
- **clsx + tailwind-merge** — classes condicionais

---

## Design system (`src/components/design-system/`)

| Componente | Uso |
|-----------|-----|
| `LhCard` | Card padrão |
| `LhButton` | Primário / secundário / ghost |
| `LhBadge` | Status, categoria |
| `LhModal` / `PremiumResponsiveModal` | Modal (bottom-sheet no mobile) |
| `LhSectionTitle` | Título de seção |
| `AppPageShell` | Wrapper de página |
| `premiumClasses.ts` | Bundles: `premium.glassCard`, `premium.btnPrimary`, etc. |

---

## Cores por categoria

```tsx
import { getCategoryFeedTheme, getCategoryAccent } from '@/utils/categoryFeedTheme';
const theme = getCategoryFeedTheme(category); // iconBg, iconColor, dotColor, budgetColor
const accent = getCategoryAccent(categoryId); // chip, active, cardBorder, cardHover, glow
```

| Categoria | HEX |
|-----------|-----|
| cleaning | `#06B6D4` |
| sanitization | `#14B8A6` |
| moving | `#2563EB` |
| assembly | `#4F46E5` |
| automotive | `#F97316` |
| translation | `#7C3AED` |
| beauty | `#DB2777` |
| renovation | `#475569` |
| outdoor | `#059669` |
| pet | `#D97706` |
| tech | `#4338CA` |
| design | `#C026D3` |
| marketing | `#E11D48` |
| other | `#64748B` |

Faixa no topo do card:
```tsx
<div style={{ background: `linear-gradient(90deg, ${theme.iconColor}90, ${theme.iconColor}20)` }} />
```

---

## Tipografia

| Uso | Classes |
|-----|---------|
| Título de card | `text-[18px] font-bold leading-snug text-[#0F172A]` |
| Título de seção | `text-xl sm:text-2xl font-black tracking-tight text-slate-950` |
| Meta/label | `text-[13px] font-medium text-[#64748B]` |
| Budget | `text-[13px] font-bold` + cor da categoria |
| Badge | `text-[11px] font-bold` |

---

## Breakpoints

- `max-md` — mobile (swipe, bottom nav)
- `sm:` ≥640px · `md:` ≥768px · `lg:` ≥1024px · `xl:` ≥1280px

---

## Regras de texto em cards

Título, orçamento e nome do cliente — **nunca quebrar linha**:

```tsx
className="truncate whitespace-nowrap"
```

---

## Layout de referência — `HelperOpportunityCard`

Grid: `grid-cols-[72px_1fr_80px]`
- Col 1: ícone 72×72 `rounded-[18px]`
- Col 2: título + meta
- Col 3: badge + `InterestedRing`
- Rodapé: avatar + nome + CTA (span 3 colunas)

`InterestedRing`: 3 segmentos, track `#E8ECF4`, cores azul → esmeralda → âmbar.

---

## Arquivos UI principais

```
src/components/design-system/     # componentes base
src/components/layout/            # nav, footer, shell
src/components/opportunities/       # cards do feed
src/pages/client/ClientDashboard.tsx
src/pages/helper/HelperDashboard.tsx
src/utils/categoryFeedTheme.ts    # cores (só visual)
src/config/uiVisibility.ts        # feature flags de UI
```

**Arquivos grandes** — ler com offset/limit, nunca inteiro:
- `ClientDashboard.tsx`, `HelperDashboard.tsx` (~70KB)
- `CreateRequestModal.tsx` (~46KB)
- `translations/*/index.ts` (~100KB) — só adicionar chave se mudar copy visível

---

## i18n (só quando mudar texto visível)

```tsx
const { t } = useLanguage();
t('helper_dashboard.some_key')
```

Adicionar em `src/translations/{pt,en,fr}/index.ts` — buscar chave existente, não ler arquivo inteiro.

---

## Acessibilidade

- Botões só-ícone: `aria-label`
- Modais: `role="dialog"` + `aria-modal="true"`
- Ícones decorativos: `aria-hidden`
