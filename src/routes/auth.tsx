import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — SubDesk" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          toast.error("Please verify your email first.");
          navigate({ to: "/auth/verify", search: { email: email.trim().toLowerCase() } });
          return;
        }
        throw error;
      }
      const uid = data.user!.id;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      toast.success("Signed in");
      navigate({ to: roleRow?.role === "assigner" ? "/assigner" : "/substitute" });
    } catch (err: any) {
      toast.error(err.message ?? "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 flex flex-col">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground w-fit">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4 self-start">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to manage substitutions</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="you@school.edu"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="Your password"
            />
          </Field>

          <div className="flex justify-end">
            <Link to="/auth/forgot" className="text-sm text-primary font-medium">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          New here?{" "}
          <Link to="/auth/signup" className="text-primary font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

export const inputCls =
  "w-full h-12 rounded-xl border border-input bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
