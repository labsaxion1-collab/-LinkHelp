# WebP P0 experiments (Cliente Confiável)

Gerados com `sharp-cli` quality 88 — **não ligados ao Hero em produção**.

Comparar visualmente lado a lado com os PNG em `../backgrounds`, `../medals`, etc.

| Asset | PNG (KB) | WebP q88 (KB) | Redução |
|-------|---------:|--------------:|--------:|
| bg-roxo | ~1601 | ~44 | ~97% |
| confiavel | ~690 | ~64 | ~91% |
| pedestal-azul | ~2103 | ~116 | ~95% |
| particulas | ~2102 | ~106 | ~95% |

Método: `npx sharp-cli -f webp -q 88` (quality 88).

Dimensões: WebP gerado com as mesma dimensões dos PNGs de origem (sem resize nesta validação).

| Asset | PNG (bytes) | WebP q88 (bytes) | Redução | Alpha |
|-------|------------:|-----------------:|--------:|:-----:|
| bg-roxo | 1 639 645 | 44 892 | ~97% | sim |
| confiavel | 706 244 | 65 536 | ~91% | sim |
| pedestal-azul | 2 153 748 | 118 784 | ~94% | sim |
| particulas | 2 152 940 | 108 544 | ~95% | sim |
| **Total** | **~6,65 MB** | **~338 KB** | **~95%** | |

Observação visual: revisar no Preview lado a lado (transparência medalha/partículas, glow azul, pedestal).
