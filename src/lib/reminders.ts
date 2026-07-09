// In-app scheduler for substitution reminders + alarms.
// Runs only while the tab is open; web push covers closed-tab delivery.

import { supabase } from "@/integrations/supabase/client";

export type ScheduledSub = {
  id: string;
  absent_teacher: string;
  class_name: string;
  period: string;
  subject: string;
  date: string;
  status: string;
  reminder_ack: boolean;
  alarm_requested: boolean;
  start_time: string; // "HH:MM:SS"
};

export type ReminderEvent =
  | { kind: "reminder"; sub: ScheduledSub }
  | { kind: "alarm"; sub: ScheduledSub };

export function subStartDate(sub: { date: string; start_time: string }): Date {
  // date "YYYY-MM-DD", start_time "HH:MM[:SS]"
  const [y, m, d] = sub.date.split("-").map(Number);
  const [hh, mm] = sub.start_time.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

export async function fetchUpcomingForUser(userId: string): Promise<ScheduledSub[]> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [{ data: subs }, { data: schedule }] = await Promise.all([
    supabase
      .from("substitutions")
      .select("id,absent_teacher,class_name,period,subject,date,status,reminder_ack,alarm_requested")
      .eq("assigned_teacher_id", userId)
      .gte("date", todayStr),
    supabase.from("period_schedule").select("period,start_time"),
  ]);

  const map = new Map<string, string>();
  (schedule ?? []).forEach((r: { period: string; start_time: string }) =>
    map.set(r.period, r.start_time),
  );

  return ((subs ?? []) as Omit<ScheduledSub, "start_time">[])
    .map((s) => {
      const start_time = map.get(s.period);
      if (!start_time) return null;
      return { ...s, start_time } as ScheduledSub;
    })
    .filter((x): x is ScheduledSub => x !== null);
}

export class ReminderScheduler {
  private timers = new Map<string, number[]>();
  private onEvent: (e: ReminderEvent) => void;
  constructor(onEvent: (e: ReminderEvent) => void) {
    this.onEvent = onEvent;
  }
  clear() {
    this.timers.forEach((arr) => arr.forEach((t) => window.clearTimeout(t)));
    this.timers.clear();
  }
  schedule(subs: ScheduledSub[]) {
    this.clear();
    const now = Date.now();
    for (const sub of subs) {
      const start = subStartDate(sub).getTime();
      const remAt = start - 10 * 60 * 1000;
      const alarmAt = start - 5 * 60 * 1000;
      const arr: number[] = [];
      if (!sub.reminder_ack && remAt > now) {
        arr.push(window.setTimeout(() => this.onEvent({ kind: "reminder", sub }), remAt - now));
      }
      if (!sub.reminder_ack && alarmAt > now) {
        arr.push(window.setTimeout(() => this.onEvent({ kind: "alarm", sub }), alarmAt - now));
      }
      if (arr.length) this.timers.set(sub.id, arr);
    }
  }
  cancelForSub(id: string) {
    const arr = this.timers.get(id);
    if (!arr) return;
    arr.forEach((t) => window.clearTimeout(t));
    this.timers.delete(id);
  }
}
