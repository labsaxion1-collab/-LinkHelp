const PROD = 'https://www.linkhelp.app';
const html = await fetch(`${PROD}/auth/login`).then((r) => r.text());
const index = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1] ?? 'no bundle';
const helper = html.match(/HelperDashboard-[^"]+\.js/)?.[0] ?? '(lazy)';
console.log('index:', index);
console.log('helper:', helper);
