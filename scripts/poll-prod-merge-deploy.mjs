const PROD = 'https://www.linkhelp.app';
const OLD_BUNDLE = 'index-o3MQdsFa.js';
const MARKERS = [
  'EXCLUSIVE_APPLICATION_LOCKED',
  'helper_mark_service_awaiting_confirmation',
  'client_confirm_service_completed',
  'confirm_initial_profile_role',
  'IntroSplash',
];

async function get(url) {
  const res = await fetch(url);
  return res.text();
}

for (let i = 0; i < 30; i++) {
  const html = await get(`${PROD}/auth/login`);
  const indexMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  const bundle = indexMatch?.[1] ?? '';
  const bundleName = bundle.split('/').pop() ?? '';
  const helperMatch = html.match(/HelperDashboard-[^"]+\.js/);

  if (!bundle) {
    console.log(`wait ${i + 1}: no bundle`);
    await new Promise((r) => setTimeout(r, 10000));
    continue;
  }

  const indexJs = await get(`${PROD}${bundle}`);
  let helperJs = '';
  if (helperMatch) helperJs = await get(`${PROD}/assets/${helperMatch[0]}`);
  const combined = indexJs + helperJs;
  const bundleChanged = !bundleName.includes(OLD_BUNDLE.replace('.js', ''));
  const hits = MARKERS.filter((m) => combined.includes(m));

  if (bundleChanged && hits.length >= 3) {
    console.log('DEPLOY_OK');
    console.log('bundle:', bundle);
    if (helperMatch) console.log('helper:', `/assets/${helperMatch[0]}`);
    console.log('markers:', hits.join(', '));
    process.exit(0);
  }

  console.log(
    `wait ${i + 1}: ${bundleName} changed=${bundleChanged} markers=${hits.length}/${MARKERS.length}`,
  );
  await new Promise((r) => setTimeout(r, 10000));
}

console.error('TIMEOUT waiting for merge deploy');
process.exit(1);
