# LinkHelp

Marketplace local de servicos para conectar clientes e helpers por categoria, regiao, disponibilidade e confianca.

## Stack

- React 19 + Vite
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Database, Realtime e Storage
- Google Maps
- PWA

## Rodar Localmente

1. Instale as dependencias:
   `npm install`
2. Copie `.env.example` para `.env` e preencha as chaves reais do Supabase.
3. Rode o app:
   `npm run dev`

O servidor usa `http://localhost:3000`.

## Scripts

- `npm run dev`: ambiente local
- `npm run build`: build de producao
- `npm run lint`: checagem TypeScript
- `npm run preview`: preview do build

## Direcao do Produto

O fluxo principal segue o modelo de marketplace de leads: cliente publica uma necessidade guiada, helpers recebem oportunidades qualificadas por categoria/regiao e se candidatam aos pedidos mais relevantes. Pagamentos do servico ainda sao combinados diretamente entre cliente e helper nesta etapa.
