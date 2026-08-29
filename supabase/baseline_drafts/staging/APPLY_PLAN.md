# APPLY_PLAN — Baseline staging (P4.0.5)

**Status:** DOCUMENTAÇÃO INERTE — **não executar** nesta etapa.  
**Prontidão SQL isolada:** `GO COM PRÉ-REQUISITOS` (UI + pause/cancel ainda abertos para cutover Preview).

## 1. Pré-requisitos antes de qualquer apply

1. Projeto Supabase **staging novo** criado e vazio (não o projeto histórico).
2. **Não** usar `supabase/config.toml` `project_id` existente sem confirmar/substituir pelo ref do staging.
3. Autorização explícita por escrito para: link CLI só-staging, apply SQL, deploy Edge, troca Preview env.
4. Packs `20a`–`60` revisados (concorrência P4.0.5 + completion workflow).
5. UI ainda **não** envia `service_mode` — smoke publish falha até sprint UI.
6. Pause/resume/cancel **ainda ausentes** — FE falha nesses botões até pack futuro.

## 2. Ordem exata de execução (staging vazio apenas)

```
A. supabase/migrations/0001 … 0052   (ordem lexicográfica)
B. packs/20a_client_scale_grants.sql
C. packs/20b_client_stack.sql
D. packs/30_exclusive_lock.sql
E. packs/40_pricing_authoritative.sql
F. packs/50_finance_authoritative_p401.sql
G. packs/60_service_completion_workflow.sql
H. verify/verify_staging_baseline_readonly.sql   (somente SELECT)
```

Não intercalear `apply_*.sql` históricos — sobrescrevem `helper_submit` / VIP / completion.

## 3. Mecanismo recomendado (documentação — não executar agora)

Opção A (preferida): SQL Editor do **projeto staging** — colar A→G; depois H.

Opção B: CLI somente após link **inequívoco** ao ref staging (nunca Production).

```text
# DOCUMENTAÇÃO — NÃO EXECUTAR EM P4.0.5
# 1) Confirmar ref staging no dashboard
# 2) Link APENAS a esse ref
# 3) Aplicar migrations oficiais
# 4) Aplicar packs 20a→60
# 5) Rodar verify read-only
```

## 4. Confirmar projeto staging

- [ ] Labels dashboard = staging / teste
- [ ] Ref ≠ histórico
- [ ] Auth URLs sem domínio Production
- [ ] Schema público vazio antes do apply
- [ ] Segundo revisor confirma ref

## 5–6. Verificações

Antes: dry-read ordem; Vercel Production fechada.  
Depois: `verify_staging_baseline_readonly.sql` (78 policies, FOR UPDATE debit/submit, pack 60 RPCs, ceil, VIP uidx).

Smoke opcional: Normal/VIP apply concorrente (1 débito); mark→confirm; finalize idempotente.

## 7–8. Interrupção / rollback

Parar a fila; recriar staging vazio; nunca tocar Production.

## 9. Production / Vercel

Sem alteração Production DB/env. Preview só com autorização pós-UI.

## 10. Lacunas restantes para cutover Preview

- UI `service_mode` / snapshots / erros
- Pack futuro pause/resume/cancel (LC)
- Edge/Cron/OAuth staging
