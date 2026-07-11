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
      // Normalize to string so this always matches p.period regardless of
      // whether the DB column comes back as text or number.
      setFree(new Set((fp ?? []).map((r: { period: string | number }) => String(r.period))));
      setLoading(false);
    })();
  }, [userId, date]);

  async function toggle(period: string) {
    // Guard: ignore taps while ANY save is in flight (blocks double-tap /
    // rapid re-tap races that caused the duplicate key error).
    if (saving !== null) return;

    setSaving(period);
    const isFree = free.has(period);

    if (isFree) {
      const { error } = await supabase
        .from("free_periods")
        .delete()
        .eq("user_id", userId)
        .eq("date", date)
        .eq("period", period);

      if (error) {
        toast.error(error.message);
      } else {
        setFree((prev) => {
          const next = new Set(prev);
          next.delete(period);
          return next;
        });
      }
    } else {
      // Upsert instead of plain insert: if a row already exists for this
      // user/date/period (e.g. from a stray earlier request), this just
      // no-ops instead of throwing a duplicate key error.
      const { error } = await supabase
        .from("free_periods")
        .upsert(
          { user_id: userId, date, period },
          { onConflict: "user_id,date,period", ignoreDuplicates: true }
        );

      // Belt-and-suspenders: even if a duplicate key error somehow still
      // comes back (code 23505), treat it as "already free" rather than
      // as a failure — the end state the user wants is the same.
      if (error && error.code !== "23505") {
        toast.error(error.message);
      } else {
        setFree((prev) => new Set(prev).add(period));
      }
    }

    setSaving(null);
  }

  async function clearAll() {
    setSaving("all");
    const { error } = await supabase
      .from("free_periods")
      .delete()
      .eq("user_id", userId)
      .eq("date", date);

    if (error) toast.error(error.message);
    else setFree(new Set());

    setSaving(null);
  }

  return (
    <div className="rounded-2xl border bg-card p-4 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm font-semibold">My Free Periods Today</div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Tap the periods you're free — assigners see this when assigning subs. Tap again to
        unmark, or use Clear all to reset everything.
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
            // Disable ALL period buttons while any save is in flight
            // (single-period toggle OR clear-all), not just this one.
            const busy = saving !== null;
            const thisOneBusy = saving === p.period;

            return (
              <button
                key={p.id}
                onClick={() => toggle(p.period)}
                disabled={busy}
                aria-pressed={active}
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
                {thisOneBusy && (
                  <Loader2 className="h-3 w-3 animate-spin absolute top-1 right-1" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="text-[11px] text-muted-foreground">
          {free.size} of {periods.length} marked free
        </div>
        {free.size > 0 && (
          <button
            onClick={clearAll}
            className="text-[11px] font-medium text-destructive hover:underline"
            disabled={saving !== null}
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
