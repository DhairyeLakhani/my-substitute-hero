import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ email: z.string().email().optional() });

export const Route = createFileRoute("/auth/verify")({
  head: () => ({ meta: [{ title: "Verify Email — SubDesk" }] }),
  validateSearch: searchSchema,
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const [resending, setResending] = useState(false);

  // Auto-redirect once the user clicks the email link and a session appears.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();
        toast.success("Email verified!");
        navigate({ to: roleRow?.role === "assigner" ? "/assigner" : "/substitute" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleResend() {
    if (!email) return toast.error("No email on file. Please sign up again.");
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/auth/verify` },
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
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 self-center">
          <MailCheck className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-sm text-muted-foreground mb-6">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{email ?? "your email"}</span>.
          Tap the button in that email to verify your account — you'll be signed in
          automatically.
        </p>

        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full h-12 rounded-xl border border-border bg-card font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
        >
          {resending && <Loader2 className="h-4 w-4 animate-spin" />}
          Resend verification email
        </button>

        <p className="text-xs text-muted-foreground mt-6">
          Already verified?{" "}
          <Link to="/auth/signin" className="text-primary font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
