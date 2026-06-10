const PROD = 'https://www.linkhelp.app';

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

const html = await get(`${PROD}/`);
const indexMatch = html.match(/\/assets\/(index-[^"]+\.js)/);
console.log('index bundle:', indexMatch?.[1] ?? 'NOT FOUND');

if (!indexMatch) process.exit(1);

const indexJs = await get(`${PROD}/assets/${indexMatch[1]}`);
const clientDashMatches = [...indexJs.matchAll(/ClientDashboard-([A-Za-z0-9_-]+)\.js/g)].map((m) => m[0]);
const uniqueChunks = [...new Set(clientDashMatches)];
console.log('ClientDashboard chunks in index:', uniqueChunks.length ? uniqueChunks : 'none (check chunk directly)');

let jsToCheck = indexJs;
if (uniqueChunks.length) {
  jsToCheck = await get(`${PROD}/assets/${uniqueChunks[0]}`);
  console.log('checking chunk:', uniqueChunks[0]);
}

const markers = {
  translationServiceMode: jsToCheck.includes('translationServiceMode'),
  immigration: jsToCheck.includes('immigration'),
  government: jsToCheck.includes('government'),
  lastBudgetSuggestionKey: jsToCheck.includes('lastBudgetSuggestionKey'),
  market_suggestion: jsToCheck.includes('market_suggestion'),
};
console.log('markers:', markers);

const hasFix = markers.translationServiceMode && markers.immigration && markers.government;
console.log(hasFix ? 'PROD HAS translation budget fix' : 'PROD MISSING fix (deploy pending or old bundle)');
