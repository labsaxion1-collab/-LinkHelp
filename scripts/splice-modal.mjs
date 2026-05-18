import fs from 'fs';
const p = 'src/pages/client/ClientDashboard.tsx';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const start = lines.findIndex((l) => l.includes('Create Order Modal Overlay'));
const end = lines.findIndex((l, i) => i > start && l.includes('max-w-[1600px]'));
const insert = [
  '      <CreateRequestModal',
  '        open={showCreateModal}',
  '        onClose={() => setShowCreateModal(false)}',
  '        onPublished={() => {',
  "          setToastNotification({ message: t('client_toast.request_created'), show: true });",
  "          setTimeout(() => setToastNotification({ message: '', show: false }), 4000);",
  '        }}',
  '      />',
  '',
];
const out = [...lines.slice(0, start), ...insert, ...lines.slice(end)];
fs.writeFileSync(p, out.join('\n'));
console.log('ok', start, end);
