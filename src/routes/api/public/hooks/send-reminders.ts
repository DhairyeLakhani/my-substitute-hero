import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/send-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendPush, signToken } = await import("@/lib/push.server");

        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        // Load today's pending subs + schedule
        const [{ data: subs }, { data: schedule }] = await Promise.all([
          supabaseAdmin
            .from("substitutions")
            .select("id,assigned_teacher_id,absent_teacher,class_name,period,subject,date,reminder_ack,alarm_requested,reminder_sent_at,alarm_sent_at")
            .eq("date", todayStr),
          supabaseAdmin.from("period_schedule").select("period,start_time"),
        ]);

        const sched = new Map<string, string>();
        (schedule ?? []).forEach((r) => sched.set(r.period, r.start_time));

        type Sub = NonNullable<typeof subs>[number];
        const dueReminders: Sub[] = [];
        const dueAlarms: Sub[] = [];

        for (const s of subs ?? []) {
          const st = sched.get(s.period);
          if (!st) continue;
          const [hh, mm] = st.split(":").map(Number);
          const start = new Date(now);
          start.setHours(hh, mm, 0, 0);
          const diffMin = (start.getTime() - now.getTime()) / 60_000;
          if (!s.reminder_sent_at && diffMin <= 10 && diffMin > 5) dueReminders.push(s);
          if (
            !s.alarm_sent_at &&
            !s.reminder_ack &&
            diffMin <= 5 &&
            diffMin > 0
          ) dueAlarms.push(s);
        }

        async function fanout(sub: Sub, kind: "reminder" | "alarm") {
          const { data: pushSubs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("id,endpoint,p256dh,auth")
            .eq("user_id", sub.assigned_teacher_id);
          if (!pushSubs?.length) return;
          const payload = {
            kind,
            substitutionId: sub.id,
            title:
              kind === "reminder"
                ? "Substitution in 10 minutes"
                : "Substitution in 5 minutes",
            body: `Period ${sub.period}: ${sub.class_name} — ${sub.subject} (covering ${sub.absent_teacher})`,
            ackToken: signToken(sub.id, "ack"),
            alarmToken: signToken(sub.id, "alarm"),
          } as const;
          for (const ps of pushSubs) {
            const res = await sendPush(ps, payload);
            if (res.gone) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("id", ps.id);
            }
          }
        }

        for (const s of dueReminders) {
          await fanout(s, "reminder");
          await supabaseAdmin
            .from("substitutions")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", s.id);
        }
        for (const s of dueAlarms) {
          await fanout(s, "alarm");
          await supabaseAdmin
            .from("substitutions")
            .update({ alarm_sent_at: new Date().toISOString() })
            .eq("id", s.id);
        }

        return Response.json({
          ok: true,
          reminders: dueReminders.length,
          alarms: dueAlarms.length,
        });
      },
    },
  },
});
