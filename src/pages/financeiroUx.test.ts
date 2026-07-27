/**
 * Sprint Financeiro UX — isolation, preview limit, post-payment redirects (source + unit).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  clearPendingLinkCreditPurchase,
  readPendingLinkCreditPurchase,
  writePendingLinkCreditPurchase,
} from '@/utils/pendingLinkCreditPurchase';
import { LINK_CREDIT_PACKAGES } from '@/config/linkCreditPackages';

const memory = new Map<string, string>();

function installSessionStorage() {
  memory.clear();
  const api = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
    removeItem: (k: string) => {
      memory.delete(k);
    },
    clear: () => memory.clear(),
    key: (i: number) => [...memory.keys()][i] ?? null,
    get length() {
      return memory.size;
    },
  };
  // @ts-expect-error test shim
  globalThis.sessionStorage = api;
  // @ts-expect-error test shim
  globalThis.window = { sessionStorage: api };
}

describe('Financeiro UX — pending purchase + isolation', () => {
  beforeEach(() => {
    installSessionStorage();
  });

  afterEach(() => {
    clearPendingLinkCreditPurchase();
  });

  it('9. toast amount comes from real package credits, not hardcoded', () => {
    const starter = LINK_CREDIT_PACKAGES.find((p) => p.id === 'starter')!;
    writePendingLinkCreditPurchase({
      credits: starter.credits,
      role: 'client',
      packageId: starter.id,
    });
    expect(readPendingLinkCreditPurchase('client')?.credits).toBe(starter.credits);
    expect(starter.credits).toBe(35);
  });

  it('14–15. conta B não lê pending da conta A / role isolada', () => {
    writePendingLinkCreditPurchase({ credits: 80, role: 'client', packageId: 'popular' });
    expect(readPendingLinkCreditPurchase('helper')).toBeNull();
    expect(readPendingLinkCreditPurchase('client')?.credits).toBe(80);
    clearPendingLinkCreditPurchase();
    expect(readPendingLinkCreditPurchase('client')).toBeNull();
  });
});

describe('Financeiro UX — source contracts', () => {
  it('1–2. Cliente e Helper usam históricos separados', async () => {
    const client = await readFile(resolve('src/pages/client/ClientCreditsPage.tsx'), 'utf8');
    const helper = await readFile(resolve('src/pages/helper/HelperCreditsPage.tsx'), 'utf8');
    expect(client).toContain('ClientCreditHistoryList');
    expect(client).toContain('fetchClientCreditLedger');
    expect(helper).toContain('CreditTransactionHistoryList');
    expect(helper).not.toContain('fetchClientCreditLedger');
    expect(client).not.toContain('CreditTransactionHistoryList');
  });

  it('3–4 / 10–11. preview máximo 3; ordem recente primeiro; Ver tudo abre completo', async () => {
    const client = await readFile(resolve('src/pages/client/ClientCreditsPage.tsx'), 'utf8');
    const helper = await readFile(resolve('src/pages/helper/HelperCreditsPage.tsx'), 'utf8');
    expect(client).toContain('PREVIEW_LIMIT = 3');
    expect(helper).toContain('PREVIEW_LIMIT = 3');
    expect(client).toContain('limit={PREVIEW_LIMIT}');
    expect(helper).toContain('limit={PREVIEW_LIMIT}');
    expect(client).toContain('new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()');
    expect(helper).toContain('b.createdAt - a.createdAt');
    expect(client).toContain('ROUTES.clientCreditsHistory');
    expect(helper).toContain('ROUTES.helperCreditsHistory');
  });

  it('histórico completo usa layout compacto (sem shell da loja)', async () => {
    const clientHistory = await readFile(
      resolve('src/pages/client/ClientCreditsHistoryPage.tsx'),
      'utf8',
    );
    const helperHistory = await readFile(
      resolve('src/pages/helper/HelperCreditsHistoryPage.tsx'),
      'utf8',
    );
    const clientList = await readFile(
      resolve('src/components/client/ClientCreditHistoryList.tsx'),
      'utf8',
    );
    const helperList = await readFile(
      resolve('src/components/credits/CreditTransactionHistoryList.tsx'),
      'utf8',
    );
    expect(clientHistory).toContain('density="compact"');
    expect(clientHistory).not.toContain('linkcredits-store-background');
    expect(clientHistory).not.toContain('LinkCreditsCompactBalanceCard');
    expect(clientHistory).not.toContain('LINK_CREDIT_PACKAGES');
    expect(clientHistory).toContain('resolveLinkCreditsHistoryBackPath');
    expect(helperHistory).toContain('density="compact"');
    expect(helperHistory).not.toContain('HelperDashboardNav');
    expect(helperHistory).not.toContain('LinkCreditsCompactBalanceCard');
    expect(helperHistory).not.toContain('LINK_CREDIT_PACKAGES');
    expect(helperHistory).toContain('resolveLinkCreditsHistoryBackPath');
    expect(clientList).toContain("density === 'compact'");
    expect(helperList).toContain("density === 'compact'");
  });

  it('6 / 13. card compacto usa saldo real e botão sem truncate forçado no label', async () => {
    const card = await readFile(
      resolve('src/components/credits/LinkCreditsCompactBalanceCard.tsx'),
      'utf8',
    );
    expect(card).toContain('whitespace-nowrap');
    expect(card).toContain('useAnimatedLinkCreditBalance');
    expect(card).toContain('buyLabel');
    expect(card).not.toContain('truncate">{buyLabel}');
  });

  it('7–8. pagamento aprovado volta para Home da role', async () => {
    const clientSuccess = await readFile(
      resolve('src/pages/client/ClientCreditsSuccessPage.tsx'),
      'utf8',
    );
    const helperSuccess = await readFile(
      resolve('src/pages/helper/HelperCreditsSuccessPage.tsx'),
      'utf8',
    );
    expect(clientSuccess).toContain('navigate(ROUTES.clientDashboard');
    expect(helperSuccess).toContain('navigate(ROUTES.helperDashboard');
    expect(clientSuccess).toContain('credits_added_toast');
    expect(helperSuccess).toContain('credits_added_toast');
    // Success path must not Link back to credits; wrong-role Navigate fallback is allowed.
    expect(clientSuccess).not.toMatch(/<Link[\s\S]*to=\{ROUTES\.clientCredits\}/);
    expect(helperSuccess).not.toMatch(/<Link[\s\S]*to=\{ROUTES\.helperCredits\}/);
  });

  it('11–12. cancelamento não altera saldo; erro não duplica crédito', async () => {
    const client = await readFile(resolve('src/pages/client/ClientCreditsPage.tsx'), 'utf8');
    const helperStore = await readFile(
      resolve('src/pages/helper/HelperLinkCreditsPage.tsx'),
      'utf8',
    );
    expect(client).toContain('checkout_cancelled');
    expect(helperStore).toContain('cancelled_banner');
    expect(client).not.toContain('setCredits(');
    expect(helperStore).not.toContain('setWallet(');
    const clientSuccess = await readFile(
      resolve('src/pages/client/ClientCreditsSuccessPage.tsx'),
      'utf8',
    );
    expect(clientSuccess).toContain('redirected.current');
    expect(clientSuccess).toContain('clearPendingLinkCreditPurchase');
  });

  it('14–16. regras de créditos e Stripe backend intactos', async () => {
    const charge = await readFile(resolve('src/config/helperCreditCharge.ts'), 'utf8');
    const packages = await readFile(resolve('src/config/linkCreditPackages.ts'), 'utf8');
    const webhook = await readFile(resolve('api/stripe/webhook.ts'), 'utf8');
    const createHelper = await readFile(resolve('api/stripe/create-checkout-session.ts'), 'utf8');
    const createClient = await readFile(
      resolve('api/stripe/create-client-checkout-session.ts'),
      'utf8',
    );
    expect(charge).toContain('ENABLE_FULL_HELPER_CREDIT_CHARGE');
    expect(charge).toContain('getApplicationChargeLc');
    expect(packages).toContain('credits: 35');
    expect(webhook).toContain('checkout.session.completed');
    expect(createHelper).toContain('stripe.checkout.sessions.create');
    expect(createClient).toContain('stripe.checkout.sessions.create');
  });

  it('saldo visual não flasha zero no card compacto', async () => {
    const client = await readFile(resolve('src/pages/client/ClientCreditsPage.tsx'), 'utf8');
    expect(client).toContain('typeof profile?.credits === \'number\'');
    expect(client).not.toContain('profile?.credits ?? 0');
  });
});
