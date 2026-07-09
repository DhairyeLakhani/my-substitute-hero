import { useEffect, useRef } from "react";
import { AlarmClock, BellOff, Timer } from "lucide-react";
import type { ScheduledSub } from "@/lib/reminders";

type Props = {
  sub: ScheduledSub;
  onStop: () => void;
  onSnooze: () => void;
};

// Generates a repeating beep via Web Audio. Avoids shipping an mp3 asset.
function useBeep(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    ctxRef.current = ctx;
    const beep = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.001;
      osc.connect(gain).connect(ctx.destination);
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.4);
    };
    beep();
    intervalRef.current = window.setInterval(beep, 700);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      ctx.close().catch(() => {});
    };
  }, [active]);
}

export function AlarmModal({ sub, onStop, onSnooze }: Props) {
  useBeep(true);
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto h-16 w-16 rounded-full bg-destructive/15 text-destructive grid place-items-center mb-4 animate-pulse">
          <AlarmClock className="h-8 w-8" />
        </div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Alarm</div>
        <div className="text-lg font-bold mt-1">Substitution in 5 minutes</div>
        <div className="mt-3 rounded-xl border bg-muted/40 p-3 text-left">
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
        <div className="grid grid-cols-2 gap-2 mt-5">
          <button
            onClick={onSnooze}
            className="h-11 rounded-xl border bg-background font-semibold inline-flex items-center justify-center gap-2"
          >
            <Timer className="h-4 w-4" /> Snooze 5m
          </button>
          <button
            onClick={onStop}
            className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2"
          >
            <BellOff className="h-4 w-4" /> Stop
          </button>
        </div>
      </div>
    </div>
  );
}
