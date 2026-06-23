import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, inputCls } from "./auth";
import { z } from "zod";

const searchSchema = z.object({
  role: z.enum(["assigner", "substitute"]).optional(),
});

export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Create Account — SubDesk" }] }),
  validateSearch: searchSchema,
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { role: urlRole } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const role = urlRole ?? "substitute";

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your full name");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: name.trim(), role },
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("registered")) {
          toast.error("This email is already registered. Try signing in.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Account created! Check your email to verify.");
      navigate({ to: "/auth/verify", search: { email: cleanEmail } });
    } catch (err: any) {
      toast.error(err.message ?? "Sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 flex flex-col">
      <Link to="/auth" search={{ role: urlRole }} className="inline-flex items-center gap-2 text-sm text-muted-foreground w-fit">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto py-6">
        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-muted-foreground mb-6">
          We'll send a verification code to your email
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <Field label="Full Name">
            <input
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Sarah Khan"
            />
          </Field>
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
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="At least 6 characters"
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Account
          </button>
        </form>
      </div>
    </main>
  );
}
