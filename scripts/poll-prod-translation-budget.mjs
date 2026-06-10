const PROD = 'https://www.linkhelp.app';

async function get(url) {
  const res = await fetch(url);
  return res.text();
}

for (let i = 0; i < 24; i++) {
  const html = await get(`${PROD}/`);
  const m = html.match(/src="(\/assets\/ClientDashboard-[^"]+\.js)"/);
  if (!m) {
    console.log(`wait ${i + 1}: no ClientDashboard bundle`);
    await new Promise((r) => setTimeout(r, 10000));
    continue;
  }
  const js = await get(`${PROD}${m[1]}`);
  const hasFix =
    js.includes('translationServiceMode') &&
    js.includes('government') &&
    js.includes('immigration');
  const hasOldExclusion = /translation['"]\)\s*return\s*null/.test(js);
  if (hasFix && !hasOldExclusion) {
    console.log(`DEPLOY OK: ${m[1]}`);
    process.exit(0);
  }
  console.log(`wait ${i + 1}: ${m[1]} fix=${hasFix} old=${hasOldExclusion}`);
  await new Promise((r) => setTimeout(r, 10000));
}
console.error('TIMEOUT waiting for translation budget deploy');
process.exit(1);
