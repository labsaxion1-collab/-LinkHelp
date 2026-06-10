const base = 'https://www.linkhelp.app';
const html = await fetch(`${base}/`).then((r) => r.text());
const indexMatch = html.match(/assets\/index-[^"']+\.js/);
if (!indexMatch) {
  console.log('PROD: index chunk not found');
  process.exit(2);
}
const indexJs = await fetch(`${base}/${indexMatch[0]}`).then((r) => r.text());
const dashMatch = indexJs.match(/assets\/HelperDashboard-[^"']+\.js/);
const urls = dashMatch ? [`${base}/${dashMatch[0]}`] : [];
if (!urls.length) {
  console.log('PROD: HelperDashboard lazy chunk ref not in index yet');
  process.exit(2);
}
for (const url of urls) {
  const js = await fetch(url).then((r) => r.text());
  const hasBreakout = /50%-50vw|ml-\[calc\(50%-50vw\)\]/.test(js);
  const hasFix = /min-w-0 max-w-full/.test(js);
  console.log('chunk:', url.replace(base + '/', ''));
  console.log('has_breakout:', hasBreakout);
  console.log('has_layout_fix:', hasFix);
  if (hasBreakout) process.exit(1);
}
const clientMatch = indexJs.match(/assets\/ClientDashboard-[^"']+\.js/);
if (clientMatch) {
  const cjs = await fetch(`${base}/${clientMatch[0]}`).then((r) => r.text());
  console.log('client_chunk:', clientMatch[0]);
  console.log('client_has_breakout:', /50%-50vw/.test(cjs));
}
process.exit(0);
