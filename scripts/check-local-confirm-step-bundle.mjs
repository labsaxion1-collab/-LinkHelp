import fs from 'fs';

const files = fs.readdirSync('dist/assets').filter((f) => f.startsWith('ClientDashboard-') && f.endsWith('.js'));
const js = fs.readFileSync(`dist/assets/${files[0]}`, 'utf8');
console.log('bundle:', files[0]);
console.log('has date_today quick pick:', js.includes('date_today'));
console.log('has time_morning quick pick:', js.includes('time_morning'));
console.log('has work_date_label key:', js.includes('work_date_label'));
console.log('has Calendar icon import:', js.includes('clock-'));
