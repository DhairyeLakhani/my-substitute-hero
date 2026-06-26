import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { LogOut, Loader2, CheckCircle2, Clock, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/substitute")({
  head: () => ({ meta: [{ title: "My Substitutions — SubDesk" }] }),
  component: SubstituteDashboard,
});

type Sub = {
  id: string;
  absent_teacher: string;
  class_name: string;
  period: string;
  subject: string;
  date: string;
  status: string;
};

function SubstituteDashboard() {
  const navigate = useNavigate();
  const { role, name, session, loading: authLoading } = useAuth();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<string>("available");

  useEffect(() => {
    if (!authLoading && role && role !== "substitute") {
      toast.error("Not a substitute account");
      navigate({ to: "/" });
    }
  }, [authLoading, role, navigate]);

  async function load() {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from("substitutions")
      .select("*")
      .eq("assigned_teacher_id", session.user.id)
      .order("date", { ascending: false });
    setSubs((data as Sub[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (session) load();
  }, [session]);

  async function markReceived(id: string) {
    const { error } = await supabase
      .from("substitutions")
      .update({ status: "received" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Marked as received");
      load();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const pending = subs.filter((s) => s.status === "pending");

  return (
    <main className="min-h-screen bg-muted/30 pb-10">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Substitute</div>
            <div className="font-semibold truncate">{name ?? "…"}</div>
          </div>
          <button
            onClick={signOut}
            className="h-10 w-10 grid place-items-center rounded-full border bg-background shrink-0"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="px-5 pt-5">
        <div className="rounded-2xl bg-primary text-primary-foreground p-5 mb-6">
          <div className="text-xs uppercase tracking-wide opacity-80">Pending substitutions</div>
          <div className="text-4xl font-bold mt-1">{pending.length}</div>
        </div>

        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          All Assignments
        </h2>

        {loading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : subs.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            You have no substitutions assigned.
          </div>
        ) : (
          <ul className="space-y-3">
            {subs.map((s) => (
              <li key={s.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {s.date} · Period {s.period}
                  </span>
                  {s.status === "received" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Received
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                  )}
                </div>
                <div className="font-semibold">
                  {s.class_name} — {s.subject}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Covering for <span className="text-foreground">{s.absent_teacher}</span>
                </div>

                {s.status === "pending" && (
                  <button
                    onClick={() => markReceived(s.id)}
                    className="mt-3 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition"
                  >
                    <Check className="h-4 w-4" /> Mark as Received
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
