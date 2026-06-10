const PROD = 'https://www.linkhelp.app';

async function get(url) {
  const res = await fetch(url);
  return res.text();
}

for (let i = 0; i < 24; i++) {
  const html = await get(`${PROD}/auth/login`);
  const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (!m) {
    console.log(`wait ${i + 1}: no bundle`);
    await new Promise((r) => setTimeout(r, 10000));
    continue;
  }
  const js = await get(`${PROD}${m[1]}`);
  if (!js.includes('oauth:navigate') && !js.includes('navigateToOAuthProvider')) {
    console.log(`DEPLOY OK: ${m[1]} (native OAuth, no oauth:navigate)`);
    process.exit(0);
  }
  console.log(`wait ${i + 1}: ${m[1]} — still has oauth:navigate or navigateToOAuthProvider`);
  await new Promise((r) => setTimeout(r, 10000));
}
console.error('TIMEOUT waiting for deploy');
process.exit(1);
