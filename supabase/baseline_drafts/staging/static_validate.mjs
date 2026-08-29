import fs from 'fs';
import path from 'path';

const root = 'supabase/baseline_drafts/staging';
const packs = path.join(root, 'packs');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const readPack = (f) => fs.readFileSync(path.join(packs, f), 'utf8');

const p30 = readPack('30_exclusive_lock.sql');
const p40 = readPack('40_pricing_authoritative.sql');
const p50 = readPack('50_finance_authoritative_p401.sql');
const p60 = readPack('60_service_completion_workflow.sql');
const readme = read('README.md');
const boot = read('BOOTSTRAP_ORDER.md');

const seed = (p40.match(/insert into public\.lead_subcategory_service_mode_policies[\s\S]*?on conflict/i) || [''])[0];
const seedCount = [...seed.matchAll(/'in_person_only'/g)].length
  + [...seed.matchAll(/'both'/g)].length
  + [...seed.matchAll(/'remote_only'/g)].length;

const checks = [
  ['seed_78', seedCount === 78, seedCount],
  ['debit_for_update', /for update/i.test(p30) && /credit_wallets/.test(p30)],
  ['debit_recheck_after_lock', p30.indexOf('for update') < p30.indexOf('alreadyCharged') || /Re-check idempotency after acquiring the wallet lock/.test(p30)],
  ['submit_request_for_update', /from public\.requests[\s\S]*for update/i.test(p50)],
  ['quote_before_debit', p50.indexOf('helper_compute_lead_quote') < p50.indexOf('helper_debit_application_interest')],
  ['vip_uidx', /applications_one_active_exclusive_uidx/.test(p30)],
  ['interest_uidx', /credit_transactions_helper_request_interest_uidx/.test(p30)],
  ['partial_refund_uidx', /credit_transactions_vip_partial_refund_uidx/.test(p50)],
  ['rejected_refund_uidx', /credit_transactions_vip_rejected_refund_uidx/.test(p50)],
  ['displace_order_asc', /order by a\.helper_id asc/i.test(p50)],
  ['normal_4', /authoritative_charge := 4;/.test(p50)],
  ['vip_plus_4', /authoritative_charge := snap_total \+ 4;/.test(p50)],
  ['hire_minus_4', /lead_total_lc - 4/.test(p50)],
  ['ceil_refund', /ceil\(debit_amount::numeric \/ 2\)/.test(p50)],
  ['p60_mark', /helper_mark_service_awaiting_confirmation/.test(p60)],
  ['p60_confirm', /client_confirm_service_completed/.test(p60)],
  ['p60_finalize', /finalize_service_completion/.test(p60)],
  ['p60_no_submit', !/create or replace function public\.helper_submit_application/i.test(p60)],
  ['p60_no_debit_redef', !/create or replace function public\.helper_debit_application_interest/i.test(p60)],
  ['p60_no_hire_redef', !/create or replace function public\.client_accept_proposal/i.test(p60)],
  ['p60_no_charge_hire', !/create or replace function public\.charge_helper_on_client_hire/i.test(p60)],
  ['p60_no_vip_refund', !/create or replace function public\.process_vip_/i.test(p60)],
  ['p60_already_marked', /alreadyMarked/.test(p60)],
  ['p60_already_completed', /alreadyCompleted/.test(p60)],
  ['readme_lead_version', /LEAD_PRICING_VERSION_MISSING/.test(readme)],
  ['readme_lead_category', /LEAD_CATEGORY_PRICE_MISSING/.test(readme)],
  ['readme_no_vip_pricing_active', !/→ \*\*`VIP_PRICING_NOT_CONFIGURED`\*\*/.test(readme)],
  ['bootstrap_60', /60_service_completion_workflow/.test(boot)],
  ['bootstrap_order', /30[\s\S]*40[\s\S]*50[\s\S]*60[\s\S]*verify/.test(boot)],
];

let fails = 0;
for (const [name, ok, extra] of checks) {
  if (!ok) fails += 1;
  console.log(`${ok ? 'OK' : 'FAIL'} ${name}${extra !== undefined ? ` extra=${extra}` : ''}`);
}
console.log(`FAILS=${fails}`);
process.exit(fails === 0 ? 0 : 1);
