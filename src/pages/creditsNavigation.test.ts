/**
 * LinkCredits purchase vs history navigation — dedicated routes (source contracts).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/utils/constants';

describe('LinkCredits navigation — dedicated purchase vs history', () => {
  it('1–2. Perfil Cliente: Comprar → /client/credits; Histórico → /client/credits/history', async () => {
    const profile = await readFile(resolve('src/pages/profile/ProfileDashboardPage.tsx'), 'utf8');
    expect(ROUTES.clientCredits).toBe('/client/credits');
    expect(ROUTES.clientCreditsHistory).toBe('/client/credits/history');
    expect(profile).toContain('buyRoute={isHelper ? ROUTES.helperLinkCredits : ROUTES.clientCredits}');
    expect(profile).toContain(
      'historyRoute={isHelper ? ROUTES.helperCreditsHistory : ROUTES.clientCreditsHistory}',
    );
    expect(profile).not.toMatch(/historyRoute=\{[^}]*\?history/);
  });

  it('3–4. Perfil Helper: Comprar → /helper/linkcredits; Histórico → /helper/credits/history', async () => {
    expect(ROUTES.helperLinkCredits).toBe('/helper/linkcredits');
    expect(ROUTES.helperCreditsHistory).toBe('/helper/credits/history');
    const profile = await readFile(resolve('src/pages/profile/ProfileDashboardPage.tsx'), 'utf8');
    expect(profile).toContain('buyRoute={isHelper ? ROUTES.helperLinkCredits : ROUTES.clientCredits}');
    expect(profile).toContain('ROUTES.helperCreditsHistory');
    // Profile buy must not deep-link straight to legacy store-only path as history.
    expect(profile).not.toContain('historyRoute={isHelper ? ROUTES.helperCredits : ROUTES.clientCredits}');
  });

  it('5. saldo LC da Home abre a rota de compra correta', async () => {
    const clientBadge = await readFile(
      resolve('src/components/client/ClientCreditsWalletBadge.tsx'),
      'utf8',
    );
    const helperDash = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    expect(clientBadge).toContain('navigate(ROUTES.clientCredits)');
    expect(helperDash).toContain('navigate(ROUTES.helperCredits)');
    expect(helperDash).not.toContain(
      'const goToCredits = React.useCallback(() => navigate(ROUTES.helperLinkCredits)',
    );
  });

  it('6. página de compra mantém checkout atual', async () => {
    const client = await readFile(resolve('src/pages/client/ClientCreditsPage.tsx'), 'utf8');
    const helperStore = await readFile(
      resolve('src/pages/helper/HelperLinkCreditsPage.tsx'),
      'utf8',
    );
    expect(client).toContain('startClientLinkCreditCheckout');
    expect(client).toContain('LINK_CREDIT_PACKAGES');
    expect(helperStore).toContain('startLinkCreditCheckout');
    expect(helperStore).toContain('LINK_CREDIT_PACKAGES');
  });

  it('7. página de histórico não renderiza pacotes', async () => {
    const clientHistory = await readFile(
      resolve('src/pages/client/ClientCreditsHistoryPage.tsx'),
      'utf8',
    );
    const helperHistory = await readFile(
      resolve('src/pages/helper/HelperCreditsHistoryPage.tsx'),
      'utf8',
    );
    expect(clientHistory).not.toContain('LINK_CREDIT_PACKAGES');
    expect(clientHistory).not.toContain('startClientLinkCreditCheckout');
    expect(clientHistory).not.toContain('LinkCreditPackageStoreCard');
    expect(helperHistory).not.toContain('LINK_CREDIT_PACKAGES');
    expect(helperHistory).not.toContain('startLinkCreditCheckout');
    expect(helperHistory).not.toContain('HelperLinkCreditsPage');
  });

  it('8–9. Cliente usa client_credit_ledger; Helper usa credit_transactions', async () => {
    const clientHistory = await readFile(
      resolve('src/pages/client/ClientCreditsHistoryPage.tsx'),
      'utf8',
    );
    const helperHistory = await readFile(
      resolve('src/pages/helper/HelperCreditsHistoryPage.tsx'),
      'utf8',
    );
    expect(clientHistory).toContain('fetchClientCreditLedger');
    expect(clientHistory).toContain('ClientCreditHistoryList');
    expect(clientHistory).not.toContain('CreditTransactionHistoryList');
    expect(helperHistory).toContain('CreditTransactionHistoryList');
    expect(helperHistory).toContain('useCredits');
    expect(helperHistory).not.toContain('fetchClientCreditLedger');
  });

  it('10. Voltar do histórico respeita origem (créditos ou perfil)', async () => {
    const clientHistory = await readFile(
      resolve('src/pages/client/ClientCreditsHistoryPage.tsx'),
      'utf8',
    );
    const helperHistory = await readFile(
      resolve('src/pages/helper/HelperCreditsHistoryPage.tsx'),
      'utf8',
    );
    expect(clientHistory).toContain('resolveLinkCreditsHistoryBackPath');
    expect(helperHistory).toContain('resolveLinkCreditsHistoryBackPath');
    expect(clientHistory).toContain('navigate(backPath)');
    expect(helperHistory).toContain('navigate(backPath)');
  });

  it('11. links antigos ?history=1 redirecionam', async () => {
    const client = await readFile(resolve('src/pages/client/ClientCreditsPage.tsx'), 'utf8');
    const helper = await readFile(resolve('src/pages/helper/HelperCreditsPage.tsx'), 'utf8');
    expect(client).toContain("history') === '1'");
    expect(helper).toContain("history') === '1'");
    expect(client).toContain('ROUTES.clientCreditsHistory');
    expect(client).toContain("linkCreditsHistoryState('credits')");
    expect(helper).toContain('ROUTES.helperCreditsHistory');
    expect(helper).toContain("linkCreditsHistoryState('credits')");
    expect(client).toContain('<Navigate');
    expect(helper).toContain('<Navigate');
  });

  it('12. success/cancel permanecem intactos', async () => {
    const clientSuccess = await readFile(
      resolve('src/pages/client/ClientCreditsSuccessPage.tsx'),
      'utf8',
    );
    const helperSuccess = await readFile(
      resolve('src/pages/helper/HelperCreditsSuccessPage.tsx'),
      'utf8',
    );
    const client = await readFile(resolve('src/pages/client/ClientCreditsPage.tsx'), 'utf8');
    const helperStore = await readFile(
      resolve('src/pages/helper/HelperLinkCreditsPage.tsx'),
      'utf8',
    );
    expect(clientSuccess).toContain('navigate(ROUTES.clientDashboard');
    expect(helperSuccess).toContain('navigate(ROUTES.helperDashboard');
    expect(client).toContain('checkout_cancelled');
    expect(helperStore).toContain('cancelled_banner');
    expect(ROUTES.clientCreditsSuccess).toBe('/client/credits/success');
    expect(ROUTES.helperCreditsSuccess).toBe('/helper/credits/success');
  });

  it('13–14. Stripe backend e regras de LinkCredits não foram alterados', async () => {
    const charge = await readFile(resolve('src/config/helperCreditCharge.ts'), 'utf8');
    const packages = await readFile(resolve('shared/linkCreditCatalog.ts'), 'utf8');
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

  it('15. rotas dedicadas registradas em AppRoutes; sem SQL neste diff', async () => {
    const routes = await readFile(resolve('src/routes/AppRoutes.tsx'), 'utf8');
    const constants = await readFile(resolve('src/utils/constants.ts'), 'utf8');
    expect(constants).toContain("clientCreditsHistory: '/client/credits/history'");
    expect(constants).toContain("helperCreditsHistory: '/helper/credits/history'");
    expect(routes).toContain('ClientCreditsHistoryPage');
    expect(routes).toContain('HelperCreditsHistoryPage');
    expect(routes).toContain('ROUTES.clientCreditsHistory');
    expect(routes).toContain('ROUTES.helperCreditsHistory');
    // Guardrail: this navigation change must not touch migrations.
    expect(routes).not.toContain('.sql');
  });
});
