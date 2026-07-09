import { Bell, Check, AlarmClock } from "lucide-react";
import type { ScheduledSub } from "@/lib/reminders";

type Props = {
  sub: ScheduledSub;
  onAck: () => void;
  onWantAlarm: () => void;
};

export function ReminderModal({ sub, onAck, onWantAlarm }: Props) {
  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-xl">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 text-primary grid place-items-center mb-4">
          <Bell className="h-7 w-7" />
        </div>
        <div className="text-center text-xs uppercase tracking-wide text-muted-foreground">
          Reminder
        </div>
        <div className="text-center text-lg font-bold mt-1">Substitution in 10 minutes</div>
        <div className="mt-3 rounded-xl border bg-muted/40 p-3">
          <div className="text-xs text-muted-foreground">
            Period {sub.period} · {sub.start_time.slice(0, 5)}
          </div>
          <div className="font-semibold">
            {sub.class_name} — {sub.subject}
          </div>
          <div className="text-sm text-muted-foreground">
            Covering for {sub.absent_teacher}
          </div>
        </div>
        <div className="grid gap-2 mt-5">
          <button
            onClick={onAck}
            className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" /> OK, I remember
          </button>
          <button
            onClick={onWantAlarm}
            className="h-11 rounded-xl border bg-background font-semibold inline-flex items-center justify-center gap-2"
          >
            <AlarmClock className="h-4 w-4" /> Remind me again with alarm
          </button>
        </div>
      </div>
    </div>
  );
}
