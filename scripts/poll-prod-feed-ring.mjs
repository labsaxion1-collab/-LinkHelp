const PROD = 'https://www.linkhelp.app';
const OLD_BUNDLE = 'index-DXYmLDL7.js';

async function get(url) {
  const res = await fetch(url);
  return res.text();
}

for (let i = 0; i < 24; i++) {
  const html = await get(`${PROD}/auth/login`);
  const indexMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  const helperMatch = html.match(/HelperDashboard-[^"]+\.js/);
  const bundle = indexMatch?.[1] ?? '';
  const indexJs = bundle ? await get(`${PROD}${bundle}`) : '';
  let helperJs = '';
  if (helperMatch) {
    helperJs = await get(`${PROD}/assets/${helperMatch[0]}`);
  }
  const combined = indexJs + helperJs;
  const bundleChanged = bundle && !bundle.includes(OLD_BUNDLE);

  if (bundleChanged) {
    console.log(`DEPLOY OK: ${bundle}`);
    if (helperMatch) console.log(`HelperDashboard: ${helperMatch[0]}`);
    process.exit(0);
  }

  console.log(`wait ${i + 1}: ${bundle || 'no bundle'}`);
  await new Promise((r) => setTimeout(r, 10000));
}

console.error('TIMEOUT waiting for feed ring deploy');
process.exit(1);
