const chunk = process.argv[2] || 'ClientDashboard-1Pqi-ITL.js';
const js = await (await fetch(`https://www.linkhelp.app/assets/${chunk}`)).text();
console.log('chunk:', chunk);
console.log('work_date_label:', js.includes('work_date_label'));
console.log('preferredDateMode:', js.includes('preferredDateMode'));
console.log('setPreferredDateMode:', js.includes('setPreferredDateMode'));
console.log('date_pick button flow:', js.includes('date_pick'));
console.log('type date input:', /type:"date"/.test(js));
