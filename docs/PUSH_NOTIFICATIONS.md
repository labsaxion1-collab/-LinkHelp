# Push notifications (Web Push / PWA)

LinkHelp stores browser push subscriptions in Supabase (`push_subscriptions`, migration `0020_push_subscriptions.sql`) and shows in-app notifications in the `notifications` table.

## Client setup

1. Generate a VAPID key pair (e.g. `npx web-push generate-vapid-keys`).
2. Set `VITE_VAPID_PUBLIC_KEY` in `.env` / Vercel env.
3. Deploy the `send-push` edge function with `VAPID_PRIVATE_KEY` (never expose to the browser).
4. Users opt in via `PushNotificationPrompt` (`usePushNotifications` → `savePushSubscription`).

Service worker: `public/push-sw.js`.

## Event matrix

| Event | Recipient | Internal (`notifications`) | Foreground push (`dispatchPushEvent`) | Server push (edge) |
| --- | --- | --- | --- | --- |
| Helper applied | Client | `remoteApply` insert | `helper_applied` | TODO: call `send-push` |
| Proposal accepted | Helper | `remoteOfficiallyHireHelper` | `helper_accepted` | TODO |
| New message | Peer | `notifyPeerNewMessage` | `new_message` | TODO |
| Request cancelled | Helpers | `remoteCancelClientRequest` | `request_cancelled` | TODO |
| Job tomorrow | Helper / client | `useJobReminderNotifications` | `job_reminder_tomorrow` | TODO (cron) |
| New matching request | Helpers | TODO: DB trigger / cron | `new_opportunity` | TODO |

## Sending from backend

The stub edge function `supabase/functions/send-push` accepts:

```json
{ "userId": "uuid", "title": "...", "body": "...", "url": "/path" }
```

It loads all `push_subscriptions` for the user and sends Web Push with the VAPID private key.

Wire this function from Postgres triggers or from existing RPCs when production push is required.

## Feature flag

Client billing for new requests: `CLIENT_LINKCREDITS_ENABLED` in `src/config/clientLinkCredits.ts` (currently `false`).
