const PROD = 'https://www.linkhelp.app';
const MARKERS = ['InterestedRing', 'interested_limit_reached', 'interested_legend_full', '0_20px_60px'];

async function get(url) {
  const res = await fetch(url);
  return res.text();
}

for (let i = 0; i < 30; i++) {
  const html = await get(`${PROD}/auth/login`);
  const indexMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  const helperMatch = html.match(/HelperDashboard-[^"]+\.js/);
  if (!indexMatch) {
    console.log(`wait ${i + 1}: no index bundle`);
    await new Promise((r) => setTimeout(r, 10000));
    continue;
  }
  const indexJs = await get(`${PROD}${indexMatch[1]}`);
  let helperJs = '';
  if (helperMatch) {
    helperJs = await get(`${PROD}/assets/${helperMatch[0]}`);
  } else {
    const dashChunk = html.match(/HelperDashboard-[^"]+\.js/);
    if (dashChunk) helperJs = await get(`${PROD}/assets/${dashChunk[0]}`);
  }
  const combined = indexJs + helperJs;
  const hits = MARKERS.filter((m) => combined.includes(m));
  if (hits.length >= 1 || combined.includes('interessados')) {
    console.log(`DEPLOY OK: ${indexMatch[1]}`);
    if (helperMatch) console.log(`HelperDashboard: ${helperMatch[0]}`);
    process.exit(0);
  }
  console.log(`wait ${i + 1}: ${indexMatch[1]} — ring not detected yet`);
  await new Promise((r) => setTimeout(r, 10000));
}
console.error('TIMEOUT waiting for InterestedRing deploy');
process.exit(1);
