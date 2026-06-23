import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, inputCls } from "./auth";

export const Route = createFileRoute("/auth/forgot")({
  head: () => ({ meta: [{ title: "Forgot Password — SubDesk" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/auth/reset-password` },
      );
      if (error) throw error;
      setSent(true);
      toast.success("Reset email sent! Check your inbox.");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 flex flex-col">
      <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 self-start">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Forgot password?</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your email and we'll send you a link to reset it.
        </p>

        {sent ? (
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="font-medium">Check your inbox</p>
            <p className="text-muted-foreground mt-1">
              We've sent a password reset link to <strong>{email}</strong>. Click it to set a new
              password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@school.edu"
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Reset Link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
