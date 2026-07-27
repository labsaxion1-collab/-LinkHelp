import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  linkCreditsHistoryState,
  parseLinkCreditsHistoryFrom,
  resolveLinkCreditsHistoryBackPath,
} from '@/utils/linkCreditsHistoryNav';
import {
  computeLinkCreditsHistoryTotals,
  filterLinkCreditsHistoryAmounts,
} from '@/utils/linkCreditsHistoryTotals';
import { ROUTES } from '@/utils/constants';

describe('linkCreditsHistoryNav', () => {
  it('1. histórico pelo Perfil volta ao Perfil Cliente', () => {
    expect(resolveLinkCreditsHistoryBackPath('client', 'profile')).toBe(ROUTES.profile);
  });

  it('2. histórico pelo Perfil volta ao Perfil Helper', () => {
    expect(resolveLinkCreditsHistoryBackPath('helper', 'profile')).toBe(ROUTES.profile);
  });

  it('3. histórico pela área de créditos volta para créditos', () => {
    expect(resolveLinkCreditsHistoryBackPath('client', 'credits')).toBe(ROUTES.clientCredits);
    expect(resolveLinkCreditsHistoryBackPath('helper', 'credits')).toBe(ROUTES.helperCredits);
  });

  it('4. acesso direto usa fallback seguro para Perfil', () => {
    expect(resolveLinkCreditsHistoryBackPath('client', null)).toBe(ROUTES.profile);
    expect(resolveLinkCreditsHistoryBackPath('helper', undefined)).toBe(ROUTES.profile);
    expect(parseLinkCreditsHistoryFrom('nope')).toBeNull();
    expect(linkCreditsHistoryState('profile')).toEqual({ linkCreditsHistoryFrom: 'profile' });
  });
});

describe('linkCreditsHistoryTotals + filters', () => {
  const amounts = [35, -4, 10, -8, 0];

  it('6–8. filtros Todos / Entradas / Saídas', () => {
    const items = amounts.map((amount, id) => ({ id, amount }));
    expect(filterLinkCreditsHistoryAmounts(items, 'all', (i) => i.amount)).toHaveLength(5);
    expect(
      filterLinkCreditsHistoryAmounts(items, 'in', (i) => i.amount).map((i) => i.amount),
    ).toEqual([35, 10]);
    expect(
      filterLinkCreditsHistoryAmounts(items, 'out', (i) => i.amount).map((i) => i.amount),
    ).toEqual([-4, -8]);
  });

  it('9. totais usam dados reais (sem hardcoded)', () => {
    expect(computeLinkCreditsHistoryTotals(amounts)).toEqual({
      totalReceived: 45,
      totalUsed: 12,
    });
  });

  it('rótulos de totais são escopo da lista carregada (não totais gerais)', async () => {
    const pt = await readFile(resolve('src/translations/pt/index.ts'), 'utf8');
    const en = await readFile(resolve('src/translations/en/index.ts'), 'utf8');
    const fr = await readFile(resolve('src/translations/fr/index.ts'), 'utf8');
    expect(pt).toContain("history_total_received: 'Recebido nesta lista'");
    expect(pt).toContain("history_total_used: 'Utilizado nesta lista'");
    expect(en).toContain("history_total_received: 'Received in this list'");
    expect(en).toContain("history_total_used: 'Used in this list'");
    expect(fr).toContain("history_total_received: 'Reçu dans cette liste'");
    expect(fr).toContain("history_total_used: 'Utilisé dans cette liste'");
    const clientHistory = await readFile(
      resolve('src/pages/client/ClientCreditsHistoryPage.tsx'),
      'utf8',
    );
    expect(clientHistory).toContain('limit: 100');
  });
});

describe('LinkCredits history polish — source contracts', () => {
  it('5. botão Comprar LinkCredits não corta texto', async () => {
    const card = await readFile(
      resolve('src/components/profile/ProfileLinkCreditsCard.tsx'),
      'utf8',
    );
    expect(card).toContain('whitespace-normal');
    expect(card).not.toMatch(/truncate">\{t\('profile_page\.buy_credits'\)\}/);
    expect(card).toContain("linkCreditsHistoryState('profile')");
  });

  it('10–11. Cliente ledger / Helper transactions', async () => {
    const clientHistory = await readFile(
      resolve('src/pages/client/ClientCreditsHistoryPage.tsx'),
      'utf8',
    );
    const helperHistory = await readFile(
      resolve('src/pages/helper/HelperCreditsHistoryPage.tsx'),
      'utf8',
    );
    expect(clientHistory).toContain('fetchClientCreditLedger');
    expect(clientHistory).not.toContain('CreditTransactionHistoryList');
    expect(helperHistory).toContain('CreditTransactionHistoryList');
    expect(helperHistory).not.toContain('fetchClientCreditLedger');
    expect(clientHistory).toContain('resolveLinkCreditsHistoryBackPath');
    expect(helperHistory).toContain('resolveLinkCreditsHistoryBackPath');
  });

  it('12–14. Stripe/checkout intactos; sem SQL', async () => {
    const webhook = await readFile(resolve('api/stripe/webhook.ts'), 'utf8');
    const createHelper = await readFile(resolve('api/stripe/create-checkout-session.ts'), 'utf8');
    const createClient = await readFile(
      resolve('api/stripe/create-client-checkout-session.ts'),
      'utf8',
    );
    const charge = await readFile(resolve('src/config/helperCreditCharge.ts'), 'utf8');
    const packages = await readFile(resolve('src/config/linkCreditPackages.ts'), 'utf8');
    expect(webhook).toContain('checkout.session.completed');
    expect(createHelper).toContain('stripe.checkout.sessions.create');
    expect(createClient).toContain('stripe.checkout.sessions.create');
    expect(charge).toContain('getApplicationChargeLc');
    expect(packages).toContain('credits: 35');
  });

  it('créditos navegam com state de origem', async () => {
    const client = await readFile(resolve('src/pages/client/ClientCreditsPage.tsx'), 'utf8');
    const helper = await readFile(resolve('src/pages/helper/HelperCreditsPage.tsx'), 'utf8');
    expect(client).toContain("linkCreditsHistoryState('credits')");
    expect(helper).toContain("linkCreditsHistoryState('credits')");
  });
});

describe('Helper history dark parity with Client structure', () => {
  it('1. Helper renderiza botão Voltar visível', async () => {
    const helperHistory = await readFile(
      resolve('src/pages/helper/HelperCreditsHistoryPage.tsx'),
      'utf8',
    );
    expect(helperHistory).toContain('helper_credits.back_to_summary');
    expect(helperHistory).toContain('Icons.ArrowLeft');
    expect(helperHistory).toContain('aria-label={t(');
    expect(helperHistory).toContain('border-blue-400/35');
  });

  it('2–4. Voltar Helper respeita profile / credits / fallback Perfil', () => {
    expect(resolveLinkCreditsHistoryBackPath('helper', 'profile')).toBe(ROUTES.profile);
    expect(resolveLinkCreditsHistoryBackPath('helper', 'credits')).toBe(ROUTES.helperCredits);
    expect(resolveLinkCreditsHistoryBackPath('helper', null)).toBe(ROUTES.profile);
  });

  it('5–6. Helper mostra resumo e filtros (mesma estrutura do Cliente)', async () => {
    const helperHistory = await readFile(
      resolve('src/pages/helper/HelperCreditsHistoryPage.tsx'),
      'utf8',
    );
    expect(helperHistory).toContain('LinkCreditsHistorySummary');
    expect(helperHistory).toContain('LinkCreditsHistoryFilterBar');
    expect(helperHistory).toContain('credits.history_total_received');
    expect(helperHistory).toContain('credits.history_total_used');
    expect(helperHistory).toContain('credits.history_balance_now');
    expect(helperHistory).toContain('credits.history_filter_all');
    expect(helperHistory).toContain('credits.history_filter_in');
    expect(helperHistory).toContain('credits.history_filter_out');
    expect(helperHistory).toContain('variant="dark"');
    expect(helperHistory).toContain('bg-[#030B1A]');
    expect(helperHistory).toContain('rounded-2xl border border-white/10');
  });

  it('7–8. filtros Entradas/Saídas (positivos/negativos)', () => {
    const items = [
      { amount: 20 },
      { amount: -5 },
      { amount: 8 },
    ];
    expect(filterLinkCreditsHistoryAmounts(items, 'in', (i) => i.amount).every((i) => i.amount > 0)).toBe(
      true,
    );
    expect(
      filterLinkCreditsHistoryAmounts(items, 'out', (i) => i.amount).every((i) => i.amount < 0),
    ).toBe(true);
  });

  it('9. Helper usa credit_transactions (CreditContext list)', async () => {
    const helperHistory = await readFile(
      resolve('src/pages/helper/HelperCreditsHistoryPage.tsx'),
      'utf8',
    );
    expect(helperHistory).toContain('useCredits');
    expect(helperHistory).toContain('CreditTransactionHistoryList');
    expect(helperHistory).not.toContain('fetchClientCreditLedger');
  });

  it('10. histórico Cliente permanece intacto (layout light + ledger)', async () => {
    const clientHistory = await readFile(
      resolve('src/pages/client/ClientCreditsHistoryPage.tsx'),
      'utf8',
    );
    expect(clientHistory).toContain('bg-[#F8FAFC]');
    expect(clientHistory).toContain('variant="light"');
    expect(clientHistory).toContain('ClientCreditHistoryList');
    expect(clientHistory).toContain('fetchClientCreditLedger');
    expect(clientHistory).not.toContain('bg-[#030B1A]');
  });

  it('11–12. Stripe/regras intactos; sem SQL neste polish', async () => {
    const webhook = await readFile(resolve('api/stripe/webhook.ts'), 'utf8');
    const charge = await readFile(resolve('src/config/helperCreditCharge.ts'), 'utf8');
    expect(webhook).toContain('checkout.session.completed');
    expect(charge).toContain('getApplicationChargeLc');
  });
});
