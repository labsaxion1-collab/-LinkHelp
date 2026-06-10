const PROD = 'https://www.linkhelp.app';

const html = await fetch(`${PROD}/auth/login`).then((r) => r.text());
const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (!m) {
  console.error('No index bundle found');
  process.exit(1);
}

const bundleUrl = `${PROD}${m[1]}`;
const js = await fetch(bundleUrl).then((r) => r.text());

const checks = {
  'oauth:navigate': js.includes('oauth:navigate'),
  navigateToOAuthProvider: js.includes('navigateToOAuthProvider'),
};

console.log('bundle:', m[1]);
console.log('checks:', checks);
console.log('note: skipBrowserRedirect may appear from @supabase/supabase-js — not our manual OAuth path');

const bad = Object.entries(checks).filter(([, v]) => v).map(([k]) => k);
if (bad.length) {
  console.error('FAIL — legacy OAuth strings still in bundle:', bad.join(', '));
  process.exit(1);
}

console.log('OK — native Supabase OAuth bundle (no oauth:navigate)');
