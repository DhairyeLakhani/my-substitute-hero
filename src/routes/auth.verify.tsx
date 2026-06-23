import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, inputCls } from "./auth";
import { z } from "zod";

const searchSchema = z.object({ email: z.string().email().optional() });

export const Route = createFileRoute("/auth/verify")({
  head: () => ({ meta: [{ title: "Verify Email — SubDesk" }] }),
  validateSearch: searchSchema,
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const { email: initialEmail } = Route.useSearch();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: "email",
      });
      if (error) throw error;
      toast.success("Email verified!");
      const uid = data.user!.id;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      navigate({ to: roleRow?.role === "assigner" ? "/assigner" : "/substitute" });
    } catch (err: any) {
      toast.error(err.message ?? "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) return toast.error("Enter your email first");
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });
      if (error) throw error;
      toast.success("Verification email sent");
    } catch (err: any) {
      toast.error(err.message ?? "Could not resend");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 flex flex-col">
      <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground w-fit">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 self-start">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Verify your email</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter the 6-digit code we emailed to{email ? ` ${email}` : " you"}.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Verification Code">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              className={`${inputCls} tracking-[0.5em] text-center text-xl`}
              placeholder="000000"
            />
          </Field>
          <button
            type="submit"
            disabled={loading || token.length < 6}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify Email
          </button>
        </form>

        <button
          onClick={handleResend}
          disabled={resending}
          className="mt-4 text-sm text-muted-foreground inline-flex items-center justify-center gap-2"
        >
          {resending && <Loader2 className="h-3 w-3 animate-spin" />}
          Didn't get a code? Resend
        </button>
      </div>
    </main>
  );
}
