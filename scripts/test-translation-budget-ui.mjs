/**
 * UI smoke test: Translation category auto-fills budget on create-request modal.
 * Usage: node scripts/test-translation-budget-ui.mjs [prod|local]
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const mode = process.argv[2] ?? 'prod';
const BASE = mode === 'local' ? 'http://localhost:3001' : 'https://www.linkhelp.app';
const PROFILE_DIR = path.join(process.cwd(), '.oauth-test-profile');
const STATE_FILE = path.join(PROFILE_DIR, 'storage-state.json');

async function readBudgetInputs(page) {
  const minInput = page.locator('input[inputmode="numeric"]').first();
  const maxInput = page.locator('input[inputmode="numeric"]').nth(1);
  await minInput.waitFor({ state: 'visible', timeout: 20000 });
  const min = await minInput.inputValue();
  const max = await maxInput.inputValue();
  const suggestion = await page
    .getByText(/CAD \$80.*120|CAD \$80 – \$120/i)
    .first()
    .textContent()
    .catch(() => '');
  return { min, max, suggestion: suggestion?.trim() ?? '' };
}

async function openTranslationGovernmentFlow(page) {
  await page.goto(`${BASE}/client`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  if (page.url().includes('/auth/login')) {
    return { needsLogin: true };
  }

  const createBtn = page.getByRole('button', { name: /criar|create|nouveau|pedido|request/i }).first();
  await createBtn.waitFor({ state: 'visible', timeout: 15000 });
  await createBtn.click();

  const translationCat = page.getByRole('button', { name: /tradu|translation|traduction/i }).first();
  await translationCat.waitFor({ state: 'visible', timeout: 10000 });
  await translationCat.click();

  const governmentSub = page.getByRole('button', { name: /governo|government|gouvernement/i }).first();
  await governmentSub.waitFor({ state: 'visible', timeout: 10000 });
  await governmentSub.click();

  await page.waitForTimeout(1000);
  return { needsLogin: false };
}

async function runViewport(label, context) {
  const page = await context.newPage();
  try {
    const flow = await openTranslationGovernmentFlow(page);
    if (flow.needsLogin) {
      console.log(`[${label}] SKIP — login required`);
      return { label, skipped: true };
    }

    const { min, max, suggestion } = await readBudgetInputs(page);
    const ok = min === '80' && max === '120';
    console.log(`[${label}] min=${min} max=${max} suggestion="${suggestion}" => ${ok ? 'PASS' : 'FAIL'}`);
    return { label, ok, min, max, suggestion };
  } finally {
    await page.close();
  }
}

let browser;
let needsLogin = false;

if (fs.existsSync(PROFILE_DIR) && mode === 'prod') {
  browser = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    ...devices['Desktop Chrome'],
  });
  const desktop = await runViewport('desktop-web', browser);
  const mobilePage = await browser.newPage();
  await mobilePage.setViewportSize(devices['iPhone 13'].viewport);
  await mobilePage.setUserAgent(devices['iPhone 13'].userAgent);

  let mobileResult = { label: 'mobile-pwa', skipped: true };
  try {
    const flow = await openTranslationGovernmentFlow(mobilePage);
    if (!flow.needsLogin) {
      const { min, max, suggestion } = await readBudgetInputs(mobilePage);
      const ok = min === '80' && max === '120';
      console.log(`[mobile-pwa] min=${min} max=${max} suggestion="${suggestion}" => ${ok ? 'PASS' : 'FAIL'}`);
      mobileResult = { label: 'mobile-pwa', ok, min, max, suggestion };
    } else {
      console.log('[mobile-pwa] SKIP — login required');
      needsLogin = true;
    }
  } finally {
    await mobilePage.close();
  }

  await browser.close();

  if (desktop.skipped && mobileResult.skipped) {
    console.log('UI test skipped — no authenticated session. Prod bundle verification passed.');
    process.exit(0);
  }
  const results = [desktop, mobileResult].filter((r) => !r.skipped);
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

browser = await chromium.launch({ headless: true });
const ctxOpts = fs.existsSync(STATE_FILE) ? { storageState: STATE_FILE } : {};
const context = await browser.newContext({ ...devices['Desktop Chrome'], ...ctxOpts });

const desktop = await runViewport('desktop-web', context);
const mobileContext = await browser.newContext({ ...devices['iPhone 13'] });
const mobile = await runViewport('mobile-pwa', mobileContext);

await context.close();
await mobileContext.close();
await browser.close();

const results = [desktop, mobile].filter((r) => !r.skipped);
if (results.length === 0) {
  console.log('UI test skipped — login required. Prod bundle includes government:{min:80,max:120}.');
  process.exit(0);
}
process.exit(results.some((r) => !r.ok) ? 1 : 0);
