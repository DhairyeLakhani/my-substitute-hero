// Push notification handlers, imported into the generated Workbox service worker.
/* eslint-disable no-undef */

self.addEventListener("push", (event) => {
  let data = { kind: "reminder", title: "Reminder", body: "", substitutionId: "", ackToken: "", alarmToken: "" };
  try { data = event.data ? event.data.json() : data; } catch { /* noop */ }

  const isAlarm = data.kind === "alarm";
  const actions = isAlarm
    ? [{ action: "open-alarm", title: "Open" }]
    : [
        { action: "ack", title: "OK, I remember" },
        { action: "alarm", title: "Alarm me at 5m" },
      ];

  event.waitUntil(
    self.registration.showNotification(data.title || "Reminder", {
      body: data.body || "",
      tag: `sub-${data.substitutionId}-${data.kind}`,
      requireInteraction: isAlarm,
      renotify: true,
      data,
      actions,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;

  event.waitUntil((async () => {
    // Handle ack/alarm buttons by posting to the public endpoint
    if (action === "ack" && data.ackToken) {
      try {
        await fetch("/api/public/hooks/reminder-ack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: data.ackToken }),
        });
        return;
      } catch { /* fall through to open */ }
    }
    if (action === "alarm" && data.alarmToken) {
      try {
        await fetch("/api/public/hooks/reminder-ack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: data.alarmToken }),
        });
        return;
      } catch { /* fall through to open */ }
    }

    // Otherwise open/focus the substitute dashboard
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const url = "/substitute";
    const existing = clientsList.find((c) => c.url.includes(url));
    if (existing) { await existing.focus(); return; }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
