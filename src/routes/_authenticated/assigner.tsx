import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { deleteSubstituteTeacher } from "@/lib/admin.functions";
import {
  LogOut,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  Users,
  UserCheck,
  CalendarDays,
  ListChecks,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PeriodScheduleCard } from "@/components/PeriodScheduleCard";

export const Route = createFileRoute("/_authenticated/assigner")({
  head: () => ({ meta: [{ title: "Admin Console — SubDesk" }] }),
  component: AssignerDashboard,
});

type Substitute = {
  id: string;
  name: string;
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
  assigned_by: string;
  date: string;
  status: string;
};

type Tab = "assignments" | "teachers";
type Filter = "all" | "pending" | "received";

function AssignerDashboard() {
  const navigate = useNavigate();
  const { session, role, name, loading: authLoading } = useAuth();
  const myId = session?.user.id ?? null;
  const [substitutes, setSubstitutes] = useState<Substitute[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [prefillId, setPrefillId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("assignments");
  const [filter, setFilter] = useState<Filter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteTeacherFn = useServerFn(deleteSubstituteTeacher);

  useEffect(() => {
    if (!authLoading && role && role !== "assigner") {
      toast.error("Opening your substitute dashboard");
      navigate({ to: "/substitute" });
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
        .select("id, name, availability_status, account_status")
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

  async function handleDelete(id: string, ownerId: string) {
    if (ownerId !== myId) {
      toast.error("You can only delete substitutions you created");
      return;
    }
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

  const today = new Date().toISOString().slice(0, 10);
  const stats = useMemo(
    () => ({
      teachers: substitutes.length,
      available: substitutes.filter(
        (s) => s.availability_status === "available" && s.account_status === "active",
      ).length,
      pending: subs.filter((s) => s.status === "pending").length,
      today: subs.filter((s) => s.date === today).length,
    }),
    [substitutes, subs, today],
  );

  const filteredSubs = subs.filter((s) =>
    filter === "all" ? true : s.status === filter,
  );

  function openAssign(prefill?: string) {
    setPrefillId(prefill);
    setShowForm(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Dark header band */}
      <header className="bg-slate-900 text-slate-50">
        <div className="px-5 pt-5 pb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 grid place-items-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-indigo-300/80 font-semibold">
                  Admin Console
                </div>
                <div className="font-semibold truncate text-sm">
                  {name ?? "…"}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Substitution control center
          </h1>
          <p className="text-sm text-slate-300/80 mt-0.5">
            Manage assignments and registered teachers.
          </p>
        </div>
      </header>

      {/* Stat grid — overlaps header */}
      <section className="px-5 -mt-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Teachers"
            value={stats.teachers}
            tone="indigo"
          />
          <StatCard
            icon={<UserCheck className="h-4 w-4" />}
            label="Available"
            value={stats.available}
            tone="emerald"
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Pending"
            value={stats.pending}
            tone="amber"
          />
          <StatCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Today"
            value={stats.today}
            tone="sky"
          />
        </div>
      </section>

      {/* Command bar */}
      <section className="px-5 mt-5">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => openAssign()}
            className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition"
          >
            <Plus className="h-4 w-4" /> Add Substitution
          </button>
          <button
            onClick={() => {
              setTab("teachers");
              window.scrollTo({ top: 240, behavior: "smooth" });
            }}
            className="h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <Users className="h-4 w-4" /> View Teachers
          </button>
        </div>
      </section>

      {/* Tabs */}
      <section className="px-5 mt-6">
        <div className="inline-flex p-1 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 text-sm font-medium">
          <TabBtn active={tab === "assignments"} onClick={() => setTab("assignments")}>
            <ListChecks className="h-3.5 w-3.5" /> Assignments
          </TabBtn>
          <TabBtn active={tab === "teachers"} onClick={() => setTab("teachers")}>
            <Users className="h-3.5 w-3.5" /> Teachers
          </TabBtn>
        </div>

        {tab === "assignments" ? (
          <div className="mt-4">
            <div className="flex gap-2 mb-3 overflow-x-auto">
              {(["all", "pending", "received"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border transition ${
                    filter === f
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                      : "bg-transparent border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid place-items-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSubs.length === 0 ? (
              <EmptyState
                title="No assignments"
                body="Tap “Add Substitution” to assign a class to a teacher."
              />
            ) : (
              <ul className="space-y-2.5">
                {filteredSubs.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[11px] font-medium text-slate-500">
                            {s.date} · Period {s.period}
                          </span>
                          <StatusPill status={s.status} />
                          {s.assigned_by === myId && <MinePill />}
                        </div>
                        <div className="font-semibold truncate">
                          {s.class_name} — {s.subject}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          Absent: <span className="text-foreground">{s.absent_teacher}</span>
                        </div>
                        <div className="text-sm text-slate-500">
                          Covering:{" "}
                          <span className="text-foreground">
                            {nameById(s.assigned_teacher_id)}
                          </span>
                        </div>
                      </div>
                      {s.assigned_by === myId ? (
                        <button
                          onClick={() => handleDelete(s.id, s.assigned_by)}
                          className="h-9 w-9 grid place-items-center rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <div
                          className="h-9 w-9 grid place-items-center rounded-lg text-slate-300 dark:text-slate-700 shrink-0"
                          title="Only the creator can delete this assignment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="mt-4">
            {loading ? (
              <div className="grid place-items-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : substitutes.length === 0 ? (
              <EmptyState
                title="No teachers yet"
                body="Substitute teachers appear here as soon as they sign up."
              />
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                {substitutes.map((s) => (
                  <div
                    key={s.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 grid place-items-center font-semibold text-sm shrink-0">
                      {s.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{s.name}</div>
                      <div className="flex gap-1.5 mt-1.5">
                        <AvailabilityPill status={s.availability_status} />
                        <AccountPill status={s.account_status} />
                      </div>
                    </div>
                    <button
                      onClick={() => openAssign(s.id)}
                      className="h-9 px-3 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                    >
                      Assign <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {showForm && (
        <AssignForm
          substitutes={substitutes}
          prefillId={prefillId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
      <div className="max-w-3xl mx-auto px-4 mt-6">
        <PeriodScheduleCard />
      </div>
    </main>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition ${
        active
          ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm"
          : "text-slate-600 dark:text-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "indigo" | "emerald" | "amber" | "sky";
}) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  };
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
      <div className={`h-7 w-7 rounded-md grid place-items-center ${tones[tone]}`}>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-bold leading-none">{value}</div>
      <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-wide font-medium">
        {label}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40 p-8 text-center">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-slate-500 mt-1">{body}</div>
    </div>
  );
}

function MinePill() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 px-2 py-0.5">
      Mine
    </span>
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

function AvailabilityPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    available: { label: "Available", cls: "bg-green-500/15 text-green-700 dark:text-green-400" },
    unavailable: { label: "Unavailable", cls: "bg-red-500/15 text-red-700 dark:text-red-400" },
    on_leave: { label: "On Leave", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  };
  const v = map[status] ?? map.available;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${v.cls}`}>
      {v.label}
    </span>
  );
}

function AccountPill({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${
        active
          ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function AssignForm({
  substitutes,
  prefillId,
  onClose,
  onSaved,
}: {
  substitutes: Substitute[];
  prefillId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [absent, setAbsent] = useState("");
  const [className, setClassName] = useState("");
  const [period, setPeriod] = useState("");
  const [subject, setSubject] = useState("");
  const [assignedTo, setAssignedTo] = useState(prefillId ?? substitutes[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [freePeriods, setFreePeriods] = useState<string[]>([]);
  const [takenPeriods, setTakenPeriods] = useState<string[]>([]);
  const [loadingFree, setLoadingFree] = useState(false);

  useEffect(() => {
    if (!assignedTo || !date) {
      setFreePeriods([]);
      setTakenPeriods([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingFree(true);
      const [{ data: freeData }, { data: takenData }] = await Promise.all([
        supabase
          .from("free_periods")
          .select("period")
          .eq("user_id", assignedTo)
          .eq("date", date),
        supabase
          .from("substitutions")
          .select("period")
          .eq("assigned_teacher_id", assignedTo)
          .eq("date", date),
      ]);
      if (cancelled) return;
      const taken = (takenData ?? []).map((r: { period: string | number }) => String(r.period));
      const free = (freeData ?? [])
        .map((r: { period: string | number }) => String(r.period))
        .filter((p) => !taken.includes(p));
      setTakenPeriods(taken);
      setFreePeriods(free);
      setPeriod((p) => (free.includes(p) ? p : ""));
      setLoadingFree(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [assignedTo, date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignedTo) {
      toast.error("No substitute teacher selected");
      return;
    }
    if (takenPeriods.includes(period)) {
      toast.error("This teacher is already assigned for this period");
      return;
    }
    if (!freePeriods.includes(period)) {
      toast.error("This period is not marked free by the teacher");
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

  const noFree = !loadingFree && !!assignedTo && freePeriods.length === 0;

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
          <Field label="Class">
            <input
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="input"
              placeholder="9-B"
            />
          </Field>
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
              {substitutes.map((s) => {
                const labelStatus =
                  s.account_status !== "active"
                    ? "Inactive"
                    : s.availability_status === "on_leave"
                    ? "On Leave"
                    : s.availability_status === "unavailable"
                    ? "Unavailable"
                    : "Available";
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} — {labelStatus}
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="Period (only free periods)">
            {loadingFree ? (
              <div className="text-xs text-muted-foreground py-2 inline-flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading free periods…
              </div>
            ) : noFree ? (
              <div className="text-xs text-destructive py-2">
                {takenPeriods.length > 0
                  ? `All free periods for this teacher on ${date} are already assigned.`
                  : `This teacher has not marked any free periods on ${date}.`}
              </div>

            ) : (
              <select
                required
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input"
              >
                <option value="">Select a free period…</option>
                {freePeriods
                  .slice()
                  .sort((a, b) => Number(a) - Number(b))
                  .map((p) => (
                    <option key={p} value={p}>
                      Period {p}
                    </option>
                  ))}
              </select>
            )}
          </Field>
          <button
            type="submit"
            disabled={
              saving ||
              substitutes.length === 0 ||
              loadingFree ||
              freePeriods.length === 0 ||
              !period
            }
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
