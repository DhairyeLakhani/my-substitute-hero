import webpush from "web-push";
import { createHmac, timingSafeEqual } from "node:crypto";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:reminders@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type PushPayload = {
  kind: "reminder" | "alarm";
  substitutionId: string;
  title: string;
  body: string;
  ackToken?: string;
  alarmToken?: string;
};

export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<{ ok: boolean; gone: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 300 },
    );
    return { ok: true, gone: false };
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    return { ok: false, gone: status === 404 || status === 410 };
  }
}

export function signToken(substitutionId: string, action: "ack" | "alarm"): string {
  const secret = process.env.REMINDER_ACK_SECRET!;
  const payload = `${substitutionId}.${action}`;
  const mac = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifyToken(token: string): { substitutionId: string; action: "ack" | "alarm" } | null {
  const secret = process.env.REMINDER_ACK_SECRET!;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, action, mac] = parts;
  if (action !== "ack" && action !== "alarm") return null;
  const expected = createHmac("sha256", secret).update(`${id}.${action}`).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { substitutionId: id, action };
}
