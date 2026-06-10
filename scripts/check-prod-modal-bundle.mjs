const PROD = 'https://www.linkhelp.app';
const EXPECT = ['Nenhuma observa', 'Confirmar cancelamento', '0_20px_60px_rgba(15,23,42,0.08)'];

async function get(url) {
  const res = await fetch(url);
  return res.text();
}

for (let i = 0; i < 30; i++) {
  const html = await get(`${PROD}/auth/login`);
  const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (!m) {
    console.log(`wait ${i + 1}: no bundle in HTML`);
    await new Promise((r) => setTimeout(r, 10000));
    continue;
  }
  const bundlePath = m[1];
  const js = await get(`${PROD}${bundlePath}`);
  const helperChunkMatch = html.match(/HelperDashboard-[^"]+\.js/);
  let helperJs = '';
  if (helperChunkMatch) {
    helperJs = await get(`${PROD}/assets/${helperChunkMatch[0]}`);
  }
  const combined = js + helperJs;
  const hit = EXPECT.filter((s) => combined.includes(s));
  if (hit.length >= 1 || combined.includes('0_20px_60px_rgba(15,23,42,0.08)')) {
    console.log(`DEPLOY OK: ${bundlePath}`);
    if (helperChunkMatch) console.log(`HelperDashboard: ${helperChunkMatch[0]}`);
    process.exit(0);
  }
  console.log(`wait ${i + 1}: ${bundlePath} — modal strings not found yet (${hit.length}/${EXPECT.length})`);
  await new Promise((r) => setTimeout(r, 10000));
}
console.error('TIMEOUT waiting for modal deploy');
process.exit(1);
