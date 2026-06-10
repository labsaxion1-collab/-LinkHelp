const html = await fetch('https://www.linkhelp.app/auth/login').then((r) => r.text());
console.log('index:', html.match(/index-[^"']+\.js/g));
console.log('HelperDashboard:', html.match(/HelperDashboard-[^"']+\.js/g));
console.log('HelperUpcomingJobsPage:', html.match(/HelperUpcomingJobsPage-[^"']+\.js/g));
