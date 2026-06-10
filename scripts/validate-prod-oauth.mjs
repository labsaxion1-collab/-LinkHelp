/**
 * Production OAuth checklist — https://www.linkhelp.app
 *
 *   node scripts/validate-prod-oauth.mjs redirect     # steps 1-2 (automated)
 *   node scripts/validate-prod-oauth.mjs manual       # steps 1-5 (headed — complete Google login)
 *   node scripts/validate-prod-oauth.mjs persist      # steps 6-7 after manual (reload + new context)
 *   node scripts/validate-prod-oauth.mjs full         # all steps if GOOGLE_TEST_EMAIL/PASSWORD set
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const PROD = 'https://www.linkhelp.app';
const PROFILE_DIR = path.join(process.cwd(), '.oauth-test-profile');
const STATE_FILE = path.join(PROFILE_DIR, 'storage-state.json');
const mode = process.argv[2] ?? 'redirect';

function log(step, msg) {
  console.log(`✓ [${step}] ${msg}`);
}

function fail(step, msg) {
  console.error(`✗ [${step}] ${msg}`);
  process.exit(1);
}

async function testRedirect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => {
    const t = m.text();
    if (/Google OAuth|LinkHelp Auth|oauth/i.test(t)) logs.push(t);
  });

  await page.goto(`${PROD}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const bundleHasNavigate = await page.evaluate(async () => {
    const scripts = [...document.querySelectorAll('script[src*="/assets/index-"]')];
    const src = scripts[0]?.getAttribute('src');
    if (!src) return false;
    const res = await fetch(src);
    const js = await res.text();
    return js.includes('oauth:navigate') && js.includes('navigateToOAuthProvider');
  });

  const btn = page.getByRole('button', { name: /Continuar com Google|Continue with Google/i });
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  await Promise.all([
    page.waitForURL(/accounts\.google\.com|supabase\.co\/auth\/v1\/authorize/i, { timeout: 25000 }),
    btn.click(),
  ]);

  log('1-2', `Google redirect OK — ${page.url().slice(0, 100)}…`);
  log('bundle', bundleHasNavigate ? 'Deploy includes navigateToOAuthProvider' : 'WARN: bundle missing navigateToOAuthProvider');

  if (logs.some((l) => l.includes('oauth:navigate'))) log('1-2', 'Console: oauth:navigate fired');
  else if (logs.some((l) => l.includes('signInWithOAuth:redirecting'))) log('1-2', 'Console: signInWithOAuth:redirecting (legacy assign path)');

  await browser.close();
}

async function googleLogin(page, email, password) {
  await page.waitForURL(/accounts\.google\.com/i, { timeout: 30000 });
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(email);
    await page.getByRole('button', { name: /Avançar|Next/i }).click();
  }
  const passInput = page.locator('input[type="password"]');
  await passInput.waitFor({ state: 'visible', timeout: 15000 });
  await passInput.fill(password);
  await page.getByRole('button', { name: /Avançar|Next/i }).click();
}

async function waitForDashboard(page, timeout = 120000) {
  await page.waitForURL(/\/auth\/callback|\/(client|helper)\/dashboard|\/dashboard/i, { timeout });
  if (page.url().includes('/auth/callback')) {
    await page.waitForURL(/\/(client|helper)\/dashboard|\/dashboard/i, { timeout: 60000 });
  }
}

async function assertSession(page) {
  const storage = await page.evaluate(() => localStorage.getItem('linkhelp-auth'));
  if (!storage || storage === 'null') fail('4', 'linkhelp-auth missing — session not created');
  log('4', 'Session stored in localStorage (linkhelp-auth)');
  return storage;
}

async function testManual() {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const context = await chromium.launchPersistentContext(PROFILE_DIR, { headless: false });
  const page = context.pages()[0] ?? (await context.newPage());

  console.log('→ Complete Google login in the opened browser…');
  await page.goto(`${PROD}/auth/login`);
  const btn = page.getByRole('button', { name: /Continuar com Google|Continue with Google/i });
  await btn.click();

  await page.waitForURL(/accounts\.google\.com/i, { timeout: 30000 });
  log('1-2', 'On Google account picker / sign-in');

  await waitForDashboard(page, 300000);
  const url = page.url();
  if (url.includes('/auth/login')) fail('3-5', `Still on login: ${url}`);
  if (!/\/(client|helper)\/dashboard|\/dashboard/.test(url)) fail('5', `Unexpected destination: ${url}`);

  log('3', 'Returned through /auth/callback');
  log('5', `Dashboard: ${url}`);
  await assertSession(page);

  await context.storageState({ path: STATE_FILE });
  await context.close();
  log('manual', `Saved ${STATE_FILE}`);
}

async function testPersist() {
  if (!fs.existsSync(STATE_FILE)) fail('6', 'Run manual mode first to save storage-state.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STATE_FILE });
  const page = await context.newPage();

  await page.goto(`${PROD}/client/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await assertSession(page);
  const url1 = page.url();
  if (url1.includes('/auth/login')) fail('6', `No session after reload path: ${url1}`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const url2 = page.url();
  if (url2.includes('/auth/login')) fail('6', `Session lost after F5: ${url2}`);
  log('6', `Session persists after F5 — ${url2}`);

  await context.close();

  const browser2 = await chromium.launch({ headless: true });
  const context2 = await browser2.newContext({ storageState: STATE_FILE });
  const page2 = await context2.newPage();
  await page2.goto(`${PROD}/helper/dashboard`, { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(3000);
  const url3 = page2.url();
  if (url3.includes('/auth/login')) fail('7', `Session invalid in new browser context: ${url3}`);
  log('7', `Session valid in fresh browser context — ${url3}`);

  await browser2.close();
}

async function testFull() {
  const email = process.env.GOOGLE_TEST_EMAIL;
  const password = process.env.GOOGLE_TEST_PASSWORD;
  if (!email || !password) fail('full', 'Set GOOGLE_TEST_EMAIL and GOOGLE_TEST_PASSWORD');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${PROD}/auth/login`);
  await page.getByRole('button', { name: /Continuar com Google|Continue with Google/i }).click();
  await googleLogin(page, email, password);
  await waitForDashboard(page);
  log('3-5', `Dashboard: ${page.url()}`);
  await assertSession(page);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  if (page.url().includes('/auth/login')) fail('6', 'Session lost after F5');
  log('6', 'Session persists after F5');

  await context.storageState({ path: STATE_FILE });
  await context.close();
  await testPersist();
}

try {
  if (mode === 'redirect') await testRedirect();
  else if (mode === 'manual') await testManual();
  else if (mode === 'persist') await testPersist();
  else if (mode === 'full') await testFull();
  else fail('?', 'Mode: redirect | manual | persist | full');
} catch (e) {
  console.error('✗', e instanceof Error ? e.message : e);
  process.exit(1);
}
