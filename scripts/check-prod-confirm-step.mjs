const PROD = 'https://www.linkhelp.app';

async function get(url) {
  const res = await fetch(url);
  return res.text();
}

for (let i = 0; i < 24; i++) {
  const html = await get(`${PROD}/`);
  const indexMatch = html.match(/\/assets\/(index-[^"]+\.js)/);
  if (!indexMatch) {
    console.log(`wait ${i + 1}: no index`);
    await new Promise((r) => setTimeout(r, 10000));
    continue;
  }
  const indexJs = await get(`${PROD}/assets/${indexMatch[1]}`);
  const chunk = indexJs.match(/ClientDashboard-([A-Za-z0-9_-]+)\.js/)?.[0];
  if (!chunk) {
    console.log(`wait ${i + 1}: no ClientDashboard ref`);
    await new Promise((r) => setTimeout(r, 10000));
    continue;
  }
  const js = await get(`${PROD}/assets/${chunk}`);
  const hasNew = js.includes('work_date_label') && js.includes('work_time_label');
  const hasOldButtons = js.includes('date_tomorrow') && js.includes('time_evening') && js.includes('grid-cols-3');
  if (hasNew && !hasOldButtons) {
    console.log(`DEPLOY OK: ${chunk}`);
    process.exit(0);
  }
  console.log(`wait ${i + 1}: ${chunk} new=${hasNew} old=${hasOldButtons}`);
  await new Promise((r) => setTimeout(r, 10000));
}
console.error('TIMEOUT');
process.exit(1);
