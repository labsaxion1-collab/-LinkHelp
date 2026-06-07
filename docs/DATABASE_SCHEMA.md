# DATABASE_SCHEMA — LinkHelp

> Supabase (PostgreSQL). Schema em `supabase/migrations/`. Todos os dados são isolados por RLS.

---

## Tabelas principais

### `profiles`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | = `auth.users.id` |
| `name` | text | Nome do usuário |
| `email` | text | E-mail |
| `avatar_url` | text | URL do avatar |
| `role` | text | `'client'` \| `'helper'` |
| `credits` | int | LinkCréditos (legado) |
| `bio` | text | Bio do perfil |
| `city` | text | Cidade |
| `region` | text | Província (ex: QC) |
| `country` | text | País |
| `phone` | text | Telefone |
| `preferred_language` | text | Idioma preferido |
| `spoken_languages` | text[] | Idiomas falados |
| `primary_category` | text | Categoria principal (helper) |
| `secondary_categories` | text[] | Categorias secundárias (helper) |
| `helper_base_address` | text | Endereço base do helper |
| `helper_base_city` | text | Cidade base |
| `helper_base_province` | text | Província base |
| `helper_base_postal_code` | text | CEP base |
| `helper_base_lat/lng` | float | Coordenadas base |
| `accepted_terms` | bool | Termos gerais aceitos |
| `helper_terms_accepted` | bool | Termos do helper aceitos |
| `created_at / updated_at` | timestamptz | Automáticos |

### `requests`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | |
| `client_id` | uuid FK→profiles | |
| `title` | text | Título do pedido |
| `description` | text | Descrição detalhada |
| `category` | text | ID de categoria (ex: `cleaning`) |
| `subcategory` | text | Subchave (ex: `apartment`) |
| `urgency` | text | `normal` \| `high` |
| `budget` | text | Budget legado (string) |
| `budget_type` | text | `fixed` \| `negotiable` |
| `budget_amount` | int | Valor fixo em CAD |
| `budget_min/max` | int | Faixa de valor |
| `accepted_amount` | int | Valor aceito após contratação |
| `currency` | text | Ex: `CAD $` |
| `location` | text | Texto da localização |
| `address/city/region/postal_code` | text | Endereço completo |
| `latitude/longitude` | float | Coordenadas |
| `preferred_date` | text | Data preferida |
| `preferred_time_window` | text | Período preferido |
| `status` | text | `open` \| `in_progress` \| `completed` \| `cancelled` |

### `applications`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | |
| `request_id` | uuid FK→requests | |
| `helper_id` | uuid FK→profiles | |
| `client_id` | uuid FK→profiles | |
| `status` | text | `pending` \| `viewed` \| `accepted` \| `rejected` \| `completed` \| `cancelled` |
| `message` | text | Mensagem de candidatura |
| `proposed_amount` | int | Valor proposto pelo helper |
| UNIQUE | | `(request_id, helper_id)` |

### `conversations`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | |
| `request_id` | uuid FK→requests | |
| `client_id` | uuid FK→profiles | |
| `helper_id` | uuid FK→profiles | |
| `contact_unlocked` | bool | Contato liberado após contratação |
| UNIQUE | | `(request_id, helper_id)` |

### `messages`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | |
| `conversation_id` | uuid FK→conversations | |
| `sender_id` | uuid FK→profiles | |
| `content` | text | Conteúdo da mensagem |
| `read` | bool | Lida pelo destinatário |

### `notifications`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `type` | text | Tipo de notificação |
| `title/description` | text | Conteúdo |
| `read` | bool | |
| `action_url` | text | URL de ação (deep link) |

### `upcoming_jobs`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | |
| `request_id` | uuid FK→requests | |
| `helper_id` | uuid FK→profiles | |
| `workflow_status` | text | `scheduled` \| `in_progress` \| `arriving` \| `awaiting_client_confirmation` \| `completed` \| `cancelled` |

### `reviews`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `request_id/reviewer_id/target_user_id` | uuid FK | Relações |
| `rating` | smallint | 1–5 |
| `comment` | text | |

### `helper_skills`
Subchaves no formato `{category}:{subcategory}` vinculadas ao helper.

### `credit_wallets`
Carteira de LinkCréditos do helper (balance, total_purchased, total_bonus, total_spent).

### `credit_transactions`
Log de todas as movimentações de crédito (type, amount, balance_after, related_opportunity_id).

### `opportunity_unlocks`
Registro de desbloqueios de oportunidade com créditos (credits_spent, refund_eligible).

### `user_bonus_rewards`
Recompensas de onboarding (reward_type, amount).

### `credit_packages`
Pacotes de LinkCréditos disponíveis para compra (Starter 35LC, Popular 80LC, Pro 180LC, Power 400LC).

### `push_subscriptions`
Assinaturas de Web Push por usuário (endpoint, keys).

### `helper_portfolio_items`
Itens do portfólio do helper (imagem/vídeo, URL, storage_path, skill_id, featured).

### `market_signals`
Sinais de mercado para analytics (categoria, região, tipo de evento).

### `lead_quality_scores`
Scores de qualidade de lead por pedido (ML/heurística).

---

## Realtime (Supabase pub/sub)
Tabelas com realtime ativo:
- `messages` — chat em tempo real
- `notifications` — alertas em tempo real
- `applications` — atualizações de candidatura
- `requests` — feed de pedidos
- `conversations` — threads de conversa

---

## Políticas RLS (resumo)

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | todos autenticados | trigger (signup) | próprio `id` | — |
| requests | todos autenticados | `client_id = auth.uid()` | próprio `client_id` | — |
| applications | helper ou client da app | helper (via RPC) | helper ou client | — |
| conversations | participantes | participantes | participantes | — |
| messages | participantes da conversa | sender = auth.uid() | participantes | — |
| notifications | próprio `user_id` | qualquer autenticado | próprio | — |
| upcoming_jobs | próprio `helper_id` | client via request | próprio helper | — |
| reviews | reviewer ou target | reviewer = auth.uid() | — | — |
| helper_skills | todos autenticados | próprio helper | próprio | próprio |

---

## Funções / RPCs principais

| Função | Descrição |
|--------|-----------|
| `linkhelp_handle_new_user()` | Trigger: cria profile no signup |
| `set_updated_at()` | Trigger: atualiza `updated_at` automaticamente |
| `helper_debit_application_interest` | Debita LC ao demonstrar interesse |
| `ensure_helper_credit_wallet` | Cria carteira se não existir |
| `grant_user_reward` | Concede bônus de onboarding |
| `get_wallet_balance` | Retorna saldo do helper |
| `confirm_credit_purchase` | Confirma compra de pacote (Stripe webhook) |
| `update_helper_base_address` | Atualiza endereço base com lock |
| `helper_submit_application` | Submete candidatura com débito de LC |

---

## Edge Functions (supabase/functions/)

| Função | Rota | Descrição |
|--------|------|-----------|
| `create-checkout-session` | POST /functions/v1/create-checkout-session | Cria sessão Stripe Checkout para LC |
| `stripe-webhook` | POST /functions/v1/stripe-webhook | Processa eventos Stripe (payment_intent.succeeded) |
| `send-push` | POST /functions/v1/send-push | Envia notificação Web Push via VAPID |

---

## Storage (Supabase Storage)

| Bucket | Uso |
|--------|-----|
| `avatars` | Fotos de perfil |
| `portfolio` | Imagens/vídeos do portfólio do helper |
