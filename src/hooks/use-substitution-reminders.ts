import { useEffect, useRef, useState, useCallback } from "react";
import { ReminderScheduler, fetchUpcomingForUser, type ScheduledSub, type ReminderEvent } from "@/lib/reminders";
import { ackReminder, requestAlarm } from "@/lib/reminders.functions";
import { supabase } from "@/integrations/supabase/client";

type AlarmState = { sub: ScheduledSub } | null;
type ReminderState = { sub: ScheduledSub } | null;

export function useSubstitutionReminders(userId: string | undefined) {
  const [reminder, setReminder] = useState<ReminderState>(null);
  const [alarm, setAlarm] = useState<AlarmState>(null);
  const schedRef = useRef<ReminderScheduler | null>(null);
  const subsRef = useRef<ScheduledSub[]>([]);

  const reload = useCallback(async () => {
    if (!userId) return;
    const subs = await fetchUpcomingForUser(userId);
    subsRef.current = subs;
    schedRef.current?.schedule(subs);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const onEvent = (e: ReminderEvent) => {
      if (e.kind === "reminder") {
        setReminder({ sub: e.sub });
        // Browser notification if allowed and hidden
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("Substitution in 10 min", {
              body: `Period ${e.sub.period}: ${e.sub.class_name} — ${e.sub.subject}`,
              tag: `reminder-${e.sub.id}`,
            });
          } catch { /* noop */ }
        }
      } else {
        // alarm event: only fire if not acked in the meantime
        const current = subsRef.current.find((s) => s.id === e.sub.id);
        if (current?.reminder_ack) return;
        setAlarm({ sub: e.sub });
      }
    };
    const sched = new ReminderScheduler(onEvent);
    schedRef.current = sched;
    reload();

    // Realtime: keep list in sync
    const channel = supabase
      .channel(`subs-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "substitutions", filter: `assigned_teacher_id=eq.${userId}` },
        () => reload(),
      )
      .subscribe();

    // Re-check every minute in case timers drift or tab was backgrounded
    const tick = window.setInterval(reload, 60_000);

    return () => {
      sched.clear();
      supabase.removeChannel(channel);
      window.clearInterval(tick);
    };
  }, [userId, reload]);

  const ack = useCallback(async (id: string) => {
    schedRef.current?.cancelForSub(id);
    setReminder(null);
    try {
      await ackReminder({ data: { substitutionId: id } });
    } catch { /* noop */ }
    subsRef.current = subsRef.current.map((s) => (s.id === id ? { ...s, reminder_ack: true } : s));
  }, []);

  const wantAlarm = useCallback(async (id: string) => {
    setReminder(null);
    try {
      await requestAlarm({ data: { substitutionId: id } });
    } catch { /* noop */ }
    subsRef.current = subsRef.current.map((s) => (s.id === id ? { ...s, alarm_requested: true } : s));
  }, []);

  const stopAlarm = useCallback(async (id: string) => {
    setAlarm(null);
    // Treat "Stop" as acknowledgement so it doesn't fire again from a re-schedule
    schedRef.current?.cancelForSub(id);
    try {
      await ackReminder({ data: { substitutionId: id } });
    } catch { /* noop */ }
    subsRef.current = subsRef.current.map((s) => (s.id === id ? { ...s, reminder_ack: true } : s));
  }, []);

  const snoozeAlarm = useCallback((id: string) => {
    setAlarm(null);
    const sub = subsRef.current.find((s) => s.id === id);
    if (!sub) return;
    window.setTimeout(() => {
      const current = subsRef.current.find((s) => s.id === id);
      if (current?.reminder_ack) return;
      setAlarm({ sub });
    }, 5 * 60 * 1000);
  }, []);

  return { reminder, alarm, ack, wantAlarm, stopAlarm, snoozeAlarm };
}
