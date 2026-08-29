# Service mode inventory — P4.0.3b

**Fonte de subcategorias:** `src/data/serviceCategories.ts`  
**Educação e Aulas:** fora de escopo.  
**Seed SQL:** **aprovado e semeado** no draft `packs/40_pricing_authoritative.sql` (2026-07-29).

Política:

| Código | Significado |
|--------|-------------|
| `in_person_only` | Publish só `service_mode = in_person` |
| `remote_only` | Publish só `service_mode = remote` |
| `both` | Cliente obrigatoriamente escolhe |

## Nota de produto — translation

Subs `government`, `immigration`, `consultation` (e demais translation): escopo **tradução/interpretação**.  
Não apresentar o profissional como consultor jurídico ou consultor de imigração licenciado (UI futura).

---

## Políticas semeadas (aprovadas)

| category | subcategory | policy | Status |
|----------|-------------|--------|--------|
| cleaning | apartment, house, commercial, post_construction, moving_clean, windows | in_person_only | SEEDED |
| sanitization | sofa, mattress, car, carpet | in_person_only | SEEDED |
| moving | houses, apartments, offices, companies, furniture_transport, long_distance, small_moves | in_person_only | SEEDED |
| assembly | ikea, wardrobe, bed, table, desk, tv_mount, curtains, wall_mount | in_person_only | SEEDED |
| automotive | tire, battery, jump_start, wont_start | in_person_only | SEEDED |
| beauty | nails, nail_extensions, barber, hairdresser, body_massage, facial_cleansing, brows, waxing, lashes | in_person_only | SEEDED |
| renovation | plumbing, leak, shower, painting, roof, drywall, small_repairs | in_person_only | SEEDED |
| outdoor | snow, garden, fence, exterior_clean, pool_cleaning | in_person_only | SEEDED |
| pet | walk, bath, sitter | in_person_only | SEEDED |
| tech | tv | in_person_only | SEEDED |
| tech | format, wifi, install, phone | both | SEEDED |
| translation | government, immigration, school, college, consultation, interview | both | SEEDED |
| translation | document | remote_only | SEEDED |
| design | logo_brand, social_media, ui_ux, presentation, photo_editing | remote_only | SEEDED |
| design | print | both | SEEDED |
| marketing | social_media, seo, paid_ads, content, email | remote_only | SEEDED |
| marketing | branding | both | SEEDED |
| other | other | both | SEEDED |

**Total esperado:** 78 linhas de política (todas as subcategorias atuais em `serviceCategories.ts`).

## Fora do seed

| Item | Motivo |
|------|--------|
| Educação e Aulas | Etapa futura — não criar agora |
| Qualquer sub não listada em `serviceCategories.ts` | `SERVICE_MODE_POLICY_MISSING` |
