import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Loader2, Save } from "lucide-react";

type Row = { id: string; period: string; start_time: string; sort_order: number };

export function PeriodScheduleCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("period_schedule")
      .select("id,period,start_time,sort_order")
      .order("sort_order", { ascending: true });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    const updates = rows.map((r) =>
      supabase.from("period_schedule").update({ start_time: r.start_time }).eq("id", r.id),
    );
    const results = await Promise.all(updates);
    setSaving(false);
    const err = results.find((r) => r.error)?.error;
    if (err) toast.error(err.message);
    else toast.success("Schedule saved");
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm font-semibold">Period Schedule</div>
      </div>
      {loading ? (
        <div className="grid place-items-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {rows.map((r, i) => (
              <label key={r.id} className="text-sm">
                <span className="block text-xs text-muted-foreground mb-1">Period {r.period}</span>
                <input
                  type="time"
                  value={r.start_time.slice(0, 5)}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...r, start_time: `${e.target.value}:00` };
                    setRows(next);
                  }}
                  className="h-10 w-full rounded-lg border bg-background px-2"
                />
              </label>
            ))}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="mt-3 w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save schedule
          </button>
          <p className="text-[11px] text-muted-foreground mt-2">
            Substitutes get a reminder 10 min before, and an alarm 5 min before, the period starts.
          </p>
        </>
      )}
    </div>
  );
}
