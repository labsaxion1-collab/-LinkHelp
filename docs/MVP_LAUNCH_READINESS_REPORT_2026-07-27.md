# LinkHelp — Relatório de prontidão para lançamento do MVP

**Data da auditoria:** 27 de julho de 2026  
**Escopo:** frontend React/Vite/PWA, APIs Vercel, autenticação e backoffice, Stripe, Supabase/migrations, testes, build e operação de lançamento.  
**Decisão recomendada:** **NO-GO para lançamento público neste estado.**

## 1. Resumo executivo

O produto já tem amplitude suficiente para um MVP: fluxos de cliente e helper, autenticação, candidaturas, chat, créditos, checkout Stripe, avaliações, notificações, PWA, gamificação e backoffice. O build de produção é gerado com sucesso e 484 de 486 testes passam.

O lançamento público deve ser bloqueado até a correção dos itens P0 abaixo. Os principais riscos são:

1. fallback de autorização que promove administrador legado sem papel cadastrado a `super_admin`;
2. pipeline de qualidade vermelho (TypeScript e testes);
3. dump de banco não ignorado pelo Git;
4. respostas e logs de pagamento expondo detalhes internos e dados identificáveis;
5. ausência de evidência atual de auditoria de dependências e de um gate CI obrigatório;
6. necessidade de reconfirmar migrations/RLS e webhooks no ambiente exato que será lançado.

## 2. Evidências coletadas

### Build e qualidade

- `npm run build`: **aprovado**, em aproximadamente 2 min 29 s.
- Build processou 2.633 módulos e gerou PWA com 159 entradas em precache (~4,46 MiB).
- Bundle principal: **1.239,92 kB minificado / 354,69 kB gzip**.
- Chunk `lucide-react`: **802,00 kB minificado / 150,10 kB gzip**.
- CSS principal: **395,80 kB / 51,78 kB gzip**.
- Existem várias imagens PNG individuais entre 1,5 MB e 2,18 MB.
- `npm run lint` (`tsc --noEmit`): **falhou**:
  - `SettingsPage.tsx:570`: propriedade `training` não existe em `uiVisibility`;
  - `SettingsPage.tsx:572`: propriedade `helperTraining` não existe nas rotas.
- `npm test`: **falhou**, com **484 aprovados e 2 reprovados**:
  - teste de `ProfilePage` desatualizado após re-export para `ProfileDashboardPage`;
  - timeout de 5 s no teste WebP do hero `clientConfiavel`.

### Repositório e entrega

- Branch atual: `codex/profile-header-reference-layout`, não uma branch de release.
- Último commit observado: `da77aaf`, de 24/07/2026.
- Arquivo não rastreado: `backup-before-gamification-20260704-182138.dump`.
- O `.gitignore` não cobre `*.dump`.
- Não foi identificada configuração versionada de CI em `.github/workflows`.

### Banco

- O repositório contém migrations numeradas de `0001` a `0052`, além de muitos scripts manuais `apply_*`, `verify_*` e `audit_*`.
- A documentação registra uma rodada de 10 verificações read-only em produção concluída em 18/06/2026.
- A própria documentação de migrations registra consolidações futuras e desalinhamento/limpeza ainda pendentes.
- Essa evidência histórica é positiva, mas não comprova que o banco do lançamento em 27/07/2026 corresponde exatamente ao código atual.

### Limitações desta rodada

- A validação visual automatizada do navegador não foi concluída por uma falha do ambiente de sandbox; o servidor local permaneceu disponível.
- `npm audit` não foi executado porque a consulta enviaria o grafo de dependências ao registro npm sem autorização explícita para essa divulgação.
- Nenhuma operação foi feita no Supabase, Stripe ou Vercel de produção.

## 3. Vulnerabilidades e bloqueadores

### P0 — corrigir antes de qualquer lançamento público

#### P0.1 — Escalada de privilégio no backoffice

Em `api/lib/adminAuth.server.ts`, quando o usuário possui o papel legado no `app_metadata`, mas não há registros em `admin_user_roles`, o código atribui automaticamente `roles = ['super_admin']`.

**Impacto:** uma configuração incompleta, remoção de papel na tabela ou falha de migração mantém/promove acesso total em vez de negar acesso. Isso viola o princípio de fail-closed.

**Correção:** remover o fallback para `super_admin`; exigir papel explícito em `admin_user_roles`. Manter uma migração controlada para admins existentes e registrar toda negação/anomalia.

**Aceite:** usuário com metadado legado e zero papéis recebe 403; testes cobrem ausência da tabela, ausência de papel e super admin explícito.

#### P0.2 — Pipeline de release não passa

TypeScript possui 2 erros e a suíte possui 2 testes falhando.

**Impacto:** contratos quebrados podem chegar à produção; não há baseline verde para detectar regressões.

**Correção:** alinhar `SettingsPage`, `uiVisibility` e rotas; atualizar o teste de página para a nova arquitetura; tornar o teste WebP determinístico sem apenas mascarar o problema com timeout excessivo.

**Aceite:** `npm run lint`, `npm test` e `npm run build` retornam código 0 em máquina limpa e no CI.

#### P0.3 — Dump de banco exposto ao risco de commit

`backup-before-gamification-20260704-182138.dump` está na raiz e não é ignorado.

**Impacto:** dumps frequentemente contêm PII, emails, telefones, endereços, hashes ou dados financeiros. Um commit/push acidental vira incidente de privacidade.

**Correção:** verificar de forma segura se é sanitizado; mover para armazenamento criptografado com retenção definida; adicionar `*.dump`, `*.sql.gz` e padrões equivalentes ao `.gitignore`. Se dados reais já tiverem sido enviados a algum remoto, tratar como incidente e reescrever histórico conforme procedimento aprovado.

**Aceite:** nenhuma cópia com dados reais no workspace/artefato de deploy; secret/PII scan verde.

#### P0.4 — Verificação do ambiente financeiro

O Stripe possui validação de assinatura e RPCs idempotentes documentados, porém o lançamento depende da combinação correta de `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, service role, price IDs e endpoint de webhook.

**Impacto:** pagamento aprovado sem crédito, crédito duplicado, pacote/ambiente incorreto ou ausência de reconciliação.

**Correção:** teste ponta a ponta em modo Stripe Test para helper e cliente; repetir webhook; simular falha temporária do Supabase; confirmar idempotência e ledger; configurar alerta para webhook com falha; executar reconciliação entre Stripe e `payment_events`.

**Aceite:** compra, repetição, retry e refund produzem exatamente um lançamento contábil correto.

#### P0.5 — Revalidar schema, RLS e grants do banco de lançamento

Há scripts manuais e migrations posteriores à última rodada registrada de produção.

**Impacto:** drift entre código e banco pode quebrar fluxos ou expor tabelas/RPCs.

**Correção:** gerar inventário do schema real; executar todos os `verify_*` seguros aplicáveis; revisar RLS de cada tabela com PII/financeiro; confirmar que RPCs administrativas e financeiras não têm `EXECUTE` para `anon`/`authenticated`; registrar checksum/versão aplicada.

**Aceite:** matriz tabela × papel documentada e testes negativos executados com `anon`, cliente, helper e admin.

### P1 — alta prioridade antes do tráfego real

#### P1.1 — Detalhes internos devolvidos ao cliente

Os endpoints de checkout retornam `err.message` do Stripe em respostas HTTP 500.

**Impacto:** exposição de detalhes do provedor, configuração, IDs e comportamento interno; facilita enumeração e prejudica UX.

**Correção:** responder com código estável, por exemplo `CHECKOUT_FAILED`, e manter detalhes somente em logs protegidos com correlation ID.

#### P1.2 — Logs de pagamento excessivos

O webhook registra user ID, session ID, package ID, créditos, metadata completa, resultados de RPC e corpos de erro. O evento Stripe completo também é enviado ao banco em `raw_event`.

**Impacto:** PII e dados financeiros podem ficar replicados em logs e banco por tempo indefinido.

**Correção:** definir allowlist de campos, mascarar IDs, eliminar metadata desnecessária, limitar `raw_event`, estabelecer retenção e acesso aos logs.

#### P1.3 — CORS permissivo

Endpoints de checkout e gamificação respondem preflight com `Access-Control-Allow-Origin: *`.

**Impacto:** tokens ainda são exigidos, mas a superfície aceita chamadas de qualquer origem e aumenta risco em caso de token comprometido ou mudança futura.

**Correção:** allowlist explícita de `https://linkhelp.app`, `https://www.linkhelp.app`, `https://app.linkhelp.app` e origens de preview controladas; incluir `Vary: Origin`.

#### P1.4 — Origem de retorno Stripe aceita qualquer subdomínio `*.vercel.app`

**Impacto:** qualquer projeto Vercel pode ser usado como destino de retorno pós-checkout. Não rouba o pagamento diretamente, mas favorece phishing e confusão de origem.

**Correção:** allowlist de hosts de preview pertencentes ao projeto/equipe ou desativar previews como retorno em produção.

#### P1.5 — Configuração capaz de embutir segredo Gemini no frontend

`vite.config.ts` define `process.env.GEMINI_API_KEY` com valor de ambiente no bundle. Não foi encontrado uso atual no código cliente, então tree-shaking provavelmente evita exposição hoje.

**Impacto:** qualquer uso futuro de `process.env.GEMINI_API_KEY` no frontend tornará o segredo público.

**Correção:** remover a definição; qualquer chamada Gemini deve passar por endpoint server-side autenticado, com rate limit e orçamento.

#### P1.6 — Falta de rate limiting e proteção contra abuso

Não há evidência de rate limiting server-side nos endpoints de checkout, gamificação, admin ou push.

**Impacto:** spam, aumento de custos, criação excessiva de sessões Stripe e pressão no Supabase.

**Correção:** limite por usuário/IP/ação; proteção anti-automação em cadastro e ações de alto custo; alertas de anomalia.

#### P1.7 — Tratamento inseguro de JSON inválido

Endpoints fazem `JSON.parse(req.body)` fora do bloco de erro principal.

**Impacto:** payload inválido pode virar 500 e gerar ruído/instabilidade.

**Correção:** parser seguro, limite de body e resposta 400 padronizada.

#### P1.8 — Ausência de auditoria atual de dependências

Não há resultado atual de CVEs para dependências de produção.

**Correção:** executar `npm audit --omit=dev` com autorização, revisar advisories e adicionar Dependabot/Renovate ou equivalente. Não atualizar versões cegamente; testar mudanças de React, Vite, Supabase, Stripe e Remotion.

### P2 — importante para estabilidade e conversão

#### P2.1 — Performance inicial

Bundle principal e pacote de ícones são grandes; CSS e imagens de gamificação também.

**Impacto:** pior LCP/INP em celular e rede móvel, abandono e consumo de dados.

**Correção:** imports individuais de ícones; lazy loading de áreas autenticadas/admin; converter/compactar PNGs; carregar heróis por nível; estabelecer budgets de bundle.

**Meta inicial:** JS inicial < 250 kB gzip, nenhuma imagem acima de 500 kB sem justificativa e Web Vitals medidos em aparelho móvel real.

#### P2.2 — Precache PWA pesado

O service worker precacheia ~4,46 MiB e usa atualização automática/`skipWaiting`.

**Impacto:** atualização pode trocar versão durante uma sessão; custo de primeira instalação e risco de incompatibilidade entre chunks.

**Correção:** reduzir precache, testar atualização com sessão ativa e exibir fluxo controlado quando houver nova versão.

#### P2.3 — Observabilidade e resposta a incidentes

Não foi identificada integração clara de error tracking, métricas de negócio, uptime e alertas.

**Correção:** capturar erros frontend/API sem PII; monitorar autenticação, checkout, webhook, RPC, chat e criação de pedido; criar runbook e responsáveis.

#### P2.4 — Cobertura E2E insuficiente

A suíte é forte em testes unitários/contratos, mas não comprova os journeys completos.

**Correção:** automatizar cadastro/login, OAuth, criação de pedido, candidatura, contratação, chat, conclusão, avaliação, compra de créditos e autorização negativa do admin.

#### P2.5 — Privacidade, termos e operação

O produto trata localização, telefone, mensagens, reputação e pagamentos.

**Correção:** confirmar política de privacidade, termos, consentimento, retenção, exclusão/exportação de conta, canal de suporte e procedimento de incidente aplicáveis ao Quebec/Canadá.

## 4. Pontos positivos

- Validação server-side do usuário antes de criar checkout.
- Pacote e Stripe Price ID são comparados no servidor.
- Webhook Stripe valida assinatura sobre o corpo bruto.
- RPCs financeiras e documentação indicam desenho idempotente.
- Admin dashboard usa verificação server-side do token.
- Supabase browser usa PKCE por padrão e cliente singleton.
- Rotas e componentes são amplamente lazy-loaded.
- Há testes de autorização, contratos, gamificação, realtime e regras de crédito.
- Build de produção e geração do service worker concluem com sucesso.
- Verificações anteriores do banco registram 10/10 checks críticos aprovados em junho.

## 5. Plano recomendado

### Fase 1 — bloquear riscos críticos

1. Remover fallback `super_admin`.
2. Proteger/remover o dump e ampliar `.gitignore`.
3. Corrigir TypeScript e os dois testes.
4. Sanitizar erros/logs Stripe.
5. Fechar CORS e origens de retorno.
6. Remover a injeção de `GEMINI_API_KEY`.

### Fase 2 — homologação

1. Criar CI obrigatório: install lockfile, typecheck, testes, build e scan de secrets.
2. Executar matriz RLS/grants e reconciliar migrations.
3. Rodar E2E dos journeys críticos em staging.
4. Validar Stripe Test, retries, idempotência e reconciliação.
5. Executar auditoria de dependências.
6. Testar PWA, mobile, acessibilidade e browsers suportados.

### Fase 3 — lançamento controlado

1. Deploy canário/soft launch com poucos usuários.
2. Dashboards e alertas ativos.
3. Backup e rollback testados.
4. Responsável de plantão e runbook.
5. Expandir tráfego somente após 24–72 h sem incidentes P0/P1.

## 6. Checklist GO/NO-GO

O lançamento só deve virar **GO** quando:

- [ ] typecheck, testes e build verdes no CI;
- [ ] nenhum fallback implícito para `super_admin`;
- [ ] nenhum dump/segredo/PII no Git ou artefato;
- [ ] RLS e grants verificados no banco alvo;
- [ ] Stripe E2E e reconciliação aprovados;
- [ ] erros e logs sanitizados;
- [ ] CORS/origens restritos;
- [ ] dependências auditadas sem vulnerabilidade crítica/alta sem mitigação;
- [ ] jornadas críticas E2E aprovadas;
- [ ] observabilidade, alertas e rollback operacionais;
- [ ] privacidade, termos, suporte e resposta a incidentes aprovados.

## 7. Conclusão

O LinkHelp está próximo de um **MVP tecnicamente demonstrável**, mas ainda não de um **MVP seguro para lançamento público**. A recomendação é um ciclo curto de hardening focado nos P0, seguido de homologação controlada. Com esses gates verdes, a base atual é adequada para um soft launch acompanhado.
