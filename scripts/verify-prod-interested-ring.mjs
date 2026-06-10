const PROD = 'https://www.linkhelp.app';
const html = await fetch(`${PROD}/auth/login`).then((r) => r.text());
const index = html.match(/index-[^"']+\.js/)?.[0];
const helper = html.match(/HelperDashboard-[^"']+\.js/)?.[0];
console.log('index:', index);
console.log('helper:', helper ?? '(lazy chunk — checking known path)');
const indexJs = index ? await fetch(`${PROD}/assets/${index}`).then((r) => r.text()) : '';
const markers = ['interested_limit_reached', 'interested_legend_full', 'FBBF24', 'Limite de interessados'];
for (const m of markers) {
  console.log(`index.${m}:`, indexJs.includes(m));
}
if (helper) {
  const helperJs = await fetch(`${PROD}/assets/${helper}`).then((r) => r.text());
  for (const m of markers) {
    console.log(`helper.${m}:`, helperJs.includes(m));
  }
}
