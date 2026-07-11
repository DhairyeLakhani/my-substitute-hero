import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";

type Period = { id: string; period: string; start_time: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function FreePeriodsCard({ userId }: { userId: string }) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [free, setFree] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const date = todayISO();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: sched }, { data: fp }] = await Promise.all([
        supabase
          .from("period_schedule")
          .select("id,period,start_time")
          .order("sort_order", { ascending: true }),
        supabase
          .from("free_periods")
          .select("period")
          .eq("user_id", userId)
          .eq("date", date),
      ]);
      setPeriods((sched as Period[]) ?? []);
      setFree(new Set((fp ?? []).map((r: { period: string }) => r.period)));
      setLoading(false);
    })();
  }, [userId, date]);

  async function toggle(period: string) {
    setSaving(period);
    const isFree = free.has(period);
    if (isFree) {
      const { error } = await supabase
        .from("free_periods")
        .delete()
        .eq("user_id", userId)
        .eq("date", date)
        .eq("period", period);
      if (error) toast.error(error.message);
      else {
        const next = new Set(free);
        next.delete(period);
        setFree(next);
      }
    } else {
      const { error } = await supabase
        .from("free_periods")
        .insert({ user_id: userId, date, period });
      if (error) toast.error(error.message);
      else setFree(new Set(free).add(period));
    }
    setSaving(null);
  }

  return (
    <div className="rounded-2xl border bg-card p-4 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm font-semibold">My Free Periods Today</div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Tap the periods you're free — assigners see this when assigning subs.
      </p>
      {loading ? (
        <div className="grid place-items-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : periods.length === 0 ? (
        <div className="text-xs text-muted-foreground">No periods configured yet.</div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {periods.map((p) => {
            const active = free.has(p.period);
            const busy = saving === p.period;
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.period)}
                disabled={busy}
                className={`h-12 rounded-xl text-sm font-semibold border transition relative ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background"
                } disabled:opacity-60`}
              >
                <div>P{p.period}</div>
                <div className="text-[10px] font-normal opacity-70">
                  {p.start_time.slice(0, 5)}
                </div>
                {busy && (
                  <Loader2 className="h-3 w-3 animate-spin absolute top-1 right-1" />
                )}
              </button>
            );
          })}
        </div>
      )}
      <div className="text-[11px] text-muted-foreground mt-3">
        {free.size} of {periods.length} marked free
      </div>
    </div>
  );
}
