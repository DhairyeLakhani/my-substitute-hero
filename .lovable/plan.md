
## Goal

Remind a substitute teacher 10 min before their period, and play a stoppable/snoozable alarm 5 min before if they don't acknowledge.

## Period → time mapping

New table `period_schedule` (assigner-managed): `period` (text, unique), `start_time` (time), `sort_order` (int). Seeded with periods 1–8 at typical times. Editable via a small "Period Schedule" card on the Assigner dashboard.

Reminder time = `substitutions.date + start_time - 10 min`. Alarm time = -5 min.

## Delivery: in-app + Web Push

### In-app scheduler (tab open)
- Hook `useSubstitutionReminders` on substitute dashboard.
- Loads upcoming pending subs joined with `period_schedule`; sets per-sub timers for T-10 and T-5.
- At T-10: browser `Notification` (if permission granted) + in-app modal with:
  - **"OK, I remember"** → sets `reminder_ack = true`, cancels T-5 alarm.
  - **"Remind me with alarm"** → sets `alarm_requested = true`; alarm fires at T-5.
- At T-5 (no ack, or alarm_requested): full-screen `AlarmModal` looping bundled `src/assets/alarm.mp3` with **Stop** and **Snooze 5 min** buttons.

### Web Push (tab closed; Android/desktop, iOS only when installed as PWA)
- Generate VAPID keys via `generate_secret` → `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Public key mirrored to `VITE_VAPID_PUBLIC_KEY` via `set_secret`.
- Table `push_subscriptions` (user_id, endpoint, p256dh, auth). RLS: users manage own.
- Substitute dashboard: "Enable reminders" button requests Notification permission and subscribes.
- Extend service worker via `vite-plugin-pwa` `injectManifest` mode so we own `sw.ts`: handle `push` (show notification with `ack` / `alarm` actions) and `notificationclick` (POST to `/api/public/hooks/reminder-ack` with HMAC-signed token, or `postMessage` to open clients to trigger alarm).
- Route `POST /api/public/hooks/reminder-ack` — verifies HMAC token, updates substitution flags.
- Route `POST /api/public/hooks/send-reminders` — apikey-protected; called by pg_cron every minute:
  - Sends reminder push for subs due in next minute, marks `reminder_sent_at`.
  - Sends alarm push for subs at T-5 with no ack, marks `alarm_sent_at`.
- pg_cron: `* * * * *` hitting the stable `project--<id>.lovable.app` URL.

## Schema

- `substitutions` adds: `reminder_sent_at timestamptz`, `reminder_ack boolean default false`, `alarm_requested boolean default false`, `alarm_sent_at timestamptz`.
- New: `period_schedule`, `push_subscriptions`. All with proper GRANTs and RLS.

## Server functions (`src/lib/reminders.functions.ts`)
- `ackReminder({ substitutionId })`
- `requestAlarm({ substitutionId })`
- `savePushSubscription({ endpoint, p256dh, auth })`
- `deletePushSubscription({ endpoint })`
- `listUpcomingReminders()` — returns joined sub + start_time for scheduler.

Uses `requireSupabaseAuth`. Helpers (webpush send, HMAC sign/verify) live in `src/lib/push.server.ts`.

## New files
- `supabase/migrations/*_reminders.sql`
- `src/lib/reminders.ts`, `src/lib/reminders.functions.ts`, `src/lib/push.server.ts`, `src/lib/push-client.ts`
- `src/routes/api/public/hooks/send-reminders.ts`, `src/routes/api/public/hooks/reminder-ack.ts`
- `src/components/ReminderModal.tsx`, `src/components/AlarmModal.tsx`, `src/components/PeriodScheduleCard.tsx`, `src/components/EnableRemindersButton.tsx`
- `src/assets/alarm.mp3` (bundled royalty-free tone)
- Custom `src/sw.ts` (injectManifest) replacing generated SW; keeps offline caching.

## Caveats to surface
- iOS Safari: web push requires app installed to Home Screen (PWA already set up).
- Two-button notification actions render on Android; on desktop the notification body click defaults to opening the app and starting alarm.
- In-app timers only run while the tab is open; push covers the rest.
