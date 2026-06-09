# UI_GUIDELINES — LinkHelp

> Padrões visuais e de componentes. Seguir sempre ao criar ou editar UI.

---

## Stack visual

- **Tailwind CSS v4** — utility-first, sem config `tailwind.config.js` (usa `@tailwindcss/vite`)
- **React 19** + **TypeScript**
- **Lucide React** — ícones (sempre via `import * as Icons from 'lucide-react'`)
- **motion/react** (Framer Motion) — animações
- **clsx + tailwind-merge** — composição condicional de classes

---

## Design System (`src/components/design-system/`)

| Componente | Uso |
|-----------|-----|
| `LhCard` | Card padrão com variantes de padding |
| `LhButton` | Botão primário/secundário/ghost |
| `LhBadge` | Badge de status/categoria |
| `LhModal` | Modal acessível com portal |
| `LhSectionTitle` | Título de seção com sub |
| `AppPageShell` | Wrapper de página com header |
| `PremiumResponsiveModal` | Modal bottom-sheet no mobile, modal no desktop |

---

## Sistema de cores por categoria

Todas as cores de categoria estão centralizadas em `src/utils/categoryFeedTheme.ts`.

```typescript
import { getCategoryFeedTheme, getCategoryAccent } from '@/utils/categoryFeedTheme';

const theme = getCategoryFeedTheme(job.category);
// theme.iconBg, theme.iconColor, theme.dotColor, theme.budgetColor, theme.accent
```

### `CategoryAccent` (para cards e filtros)
```typescript
const accent = getCategoryAccent(categoryId);
// accent.icon       — bg + text para o ícone
// accent.active     — border + bg + text quando selecionado
// accent.cardBorder — borda do card
// accent.cardHover  — hover do card
// accent.iconInactive — ícone no estado inativo
// accent.filterActive  — botão de filtro ativo
// accent.filterInactive — botão de filtro inativo
// accent.glow       — sombra colorida
```

### Paleta de categorias

| Categoria | Cor base | HEX principal |
|-----------|----------|---------------|
| cleaning | Ciano | `#06B6D4` |
| sanitization | Teal | `#14B8A6` |
| moving | Azul | `#2563EB` |
| assembly | Índigo | `#4F46E5` |
| automotive | Laranja | `#F97316` |
| translation | Violeta | `#7C3AED` |
| beauty | Rosa | `#DB2777` |
| renovation | Cinza-ardósia | `#475569` |
| outdoor | Esmeralda | `#059669` |
| pet | Âmbar | `#D97706` |
| tech | Índigo escuro | `#4338CA` |
| design | Fúcsia | `#C026D3` |
| marketing | Vermelho-rosa | `#E11D48` |
| other | Cinza | `#64748B` |

---

## Tipografia

| Uso | Classes |
|-----|---------|
| Título de card | `text-[18px] font-bold leading-snug text-[#0F172A]` |
| Título de seção | `text-xl sm:text-2xl font-black tracking-tight text-slate-950` |
| Meta/label | `text-[13px] font-medium text-[#64748B]` |
| Budget/valor | `text-[13px] font-bold` (cor da categoria) |
| Badge | `text-[11px] font-bold` |
| Botão primário | `text-[13px] font-semibold sm:text-[14px]` |

---

## Breakpoints

| Breakpoint | Uso |
|-----------|-----|
| `max-md` / `md:hidden` | Layout mobile (swipe cards, bottom nav) |
| `sm:` | Tablet portrait (≥640px) |
| `md:` | Tablet landscape / desktop (≥768px) |
| `lg:` | Desktop largo (≥1024px) |
| `xl:` | Desktop full (≥1280px) |

---

## Regras de texto em cards

> **Nunca quebrar texto** de título, orçamento e nome do cliente.

```tsx
// Título — 1 linha com truncate
<span className="block truncate whitespace-nowrap text-[18px] font-bold">
  {title}
</span>

// Orçamento
<span className="truncate whitespace-nowrap text-[13px] font-bold">
  {budget}
</span>

// Nome do cliente
<p className="truncate whitespace-nowrap text-[14px] font-bold">
  {clientName}
</p>
```

---

## Padrões de layout de card (`HelperOpportunityCard`)

Grid 3 colunas: `grid-cols-[72px_1fr_80px]`
- Col 1: ícone de categoria (72×72px, rounded-[18px])
- Col 2: título + meta (categoria, orçamento, data)
- Col 3: badge "Novo/Urgente" na linha 1, `InterestedRing` na linha 2
- Rodapé: span 3 colunas — avatar + nome + botão CTA

---

## InterestedRing

```tsx
<InterestedRing
  interestedCount={count}   // 0–3
  label="interessados"
  size={80}                 // px — padrão 84
/>
```

- Segmentos: 3 slots (MAX_JOB_INTERESTED = 3)
- Cores: azul → esmeralda → âmbar (por slot)
- Track de fundo: `#E8ECF4`
- Glow automático quando count > 0

---

## Acessibilidade

- Botões sem texto visível devem ter `aria-label`
- Modais com `role="dialog"` e `aria-modal="true"`
- Imagens decorativas com `aria-hidden`
- Focus trap em modais via `PremiumResponsiveModal`

---

## Internacionalização

```tsx
const { t, locale } = useLanguage();
t('categories.cleaning') // → 'Limpeza' | 'Cleaning' | 'Nettoyage'
```

Idiomas: `pt` (padrão), `en`, `fr`.
Arquivos: `src/translations/{pt,en,fr}/index.ts`

---

## Feature flags (`src/config/uiVisibility.ts`)

```typescript
UI_VISIBILITY.ideas           // false — desabilitado
UI_VISIBILITY.helperCredits   // true
UI_VISIBILITY.helperCreditPurchase // true
UI_VISIBILITY.training        // false
UI_VISIBILITY.helperCreditUnlock   // false (Phase 2)
```
