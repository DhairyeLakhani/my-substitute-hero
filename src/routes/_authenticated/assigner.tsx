import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { LogOut, Plus, Trash2, Loader2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assigner")({
  head: () => ({ meta: [{ title: "Assigner Dashboard — SubDesk" }] }),
  component: AssignerDashboard,
});

type Substitute = {
  id: string;
  name: string;
  email: string | null;
  availability_status: string;
  account_status: string;
};
type Sub = {
  id: string;
  absent_teacher: string;
  class_name: string;
  period: string;
  subject: string;
  assigned_teacher_id: string;
  date: string;
  status: string;
};

function AssignerDashboard() {
  const navigate = useNavigate();
  const { role, name, loading: authLoading } = useAuth();
  const [substitutes, setSubstitutes] = useState<Substitute[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && role && role !== "assigner") {
      toast.error("Not an assigner account");
      navigate({ to: "/" });
    }
  }, [authLoading, role, navigate]);

  async function load() {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "substitute");
    const ids = (roles ?? []).map((r) => r.user_id);
    let profs: Substitute[] = [];
    if (ids.length) {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, availability_status, account_status")
        .in("id", ids);
      profs = (data as Substitute[]) ?? [];
    }
    setSubstitutes(profs);

    const { data: s } = await supabase
      .from("substitutions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    setSubs((s as Sub[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    const { error } = await supabase.from("substitutions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const nameById = (id: string) =>
    substitutes.find((s) => s.id === id)?.name ?? "Unknown";

  return (
    <main className="min-h-screen bg-muted/30 pb-24">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Assigner</div>
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Substitute Teachers ({substitutes.length})
        </h2>
        <div className="space-y-2">
          {substitutes.length === 0 && (
            <div className="text-sm text-muted-foreground py-2">
              No substitute teachers signed up yet.
            </div>
          )}
          {substitutes.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {s.email ?? "—"} · Substitute
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <AvailabilityPill status={s.availability_status} />
                <AccountPill status={s.account_status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Assignments ({subs.length})
          </h2>
        </div>

        {loading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : subs.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            No assignments yet. Tap “New” to create one.
          </div>
        ) : (
          <ul className="space-y-3">
            {subs.map((s) => (
              <li key={s.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {s.date} · Period {s.period}
                      </span>
                      <StatusPill status={s.status} />
                    </div>
                    <div className="font-semibold truncate">
                      {s.class_name} — {s.subject}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Absent: <span className="text-foreground">{s.absent_teacher}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Covering: <span className="text-foreground">{nameById(s.assigned_teacher_id)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="h-9 w-9 grid place-items-center rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-5 h-14 px-6 rounded-full bg-primary text-primary-foreground shadow-lg inline-flex items-center gap-2 font-semibold active:scale-95 transition"
      >
        <Plus className="h-5 w-5" /> New
      </button>

      {showForm && (
        <AssignForm
          substitutes={substitutes}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "received")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5">
        <CheckCircle2 className="h-3 w-3" /> Received
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function AssignForm({
  substitutes,
  onClose,
  onSaved,
}: {
  substitutes: Substitute[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [absent, setAbsent] = useState("");
  const [className, setClassName] = useState("");
  const [period, setPeriod] = useState("");
  const [subject, setSubject] = useState("");
  const [assignedTo, setAssignedTo] = useState(substitutes[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignedTo) {
      toast.error("No substitute teacher selected");
      return;
    }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("substitutions").insert({
      absent_teacher: absent,
      class_name: className,
      period,
      subject,
      assigned_teacher_id: assignedTo,
      assigned_by: userRes.user!.id,
      date,
      status: "pending",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Assignment saved");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">New Substitution</h3>
          <button onClick={onClose} className="text-sm text-muted-foreground">
            Cancel
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Absent Teacher">
            <input
              required
              value={absent}
              onChange={(e) => setAbsent(e.target.value)}
              className="input"
              placeholder="e.g. Mr. Ahmed"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Class">
              <input
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="input"
                placeholder="9-B"
              />
            </Field>
            <Field label="Period">
              <input
                required
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input"
                placeholder="3"
              />
            </Field>
          </div>
          <Field label="Subject">
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              placeholder="Math"
            />
          </Field>
          <Field label="Date">
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Assigned Teacher">
            <select
              required
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="input"
            >
              {substitutes.length === 0 && <option value="">No substitutes available</option>}
              {substitutes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="submit"
            disabled={saving || substitutes.length === 0}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Assignment
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
