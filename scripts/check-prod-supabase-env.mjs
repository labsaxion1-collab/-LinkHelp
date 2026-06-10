const PROD = 'https://www.linkhelp.app';

const html = await fetch(`${PROD}/`).then((r) => r.text());
const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (!m) {
  console.log('No bundle found');
  process.exit(1);
}

const js = await fetch(`${PROD}${m[1]}`).then((r) => r.text());
const supabaseUrls = [...js.matchAll(/https:\/\/[a-z0-9]+\.supabase\.co/g)].map((x) => x[0]);
const uniqueUrls = [...new Set(supabaseUrls)];

console.log('bundle:', m[1]);
console.log('supabase URLs in bundle:', uniqueUrls.length ? uniqueUrls : '(none)');
console.log('placeholder YOUR_PROJECT:', js.includes('YOUR_PROJECT'));
console.log('REPLACE_WITH in bundle:', js.includes('REPLACE_WITH'));
