import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, inputCls, PasswordInput } from "./auth";
import { z } from "zod";

const searchSchema = z.object({
  role: z.enum(["assigner", "substitute"]).optional(),
});

export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Create Account — SubDesk" }] }),
  validateSearch: searchSchema,
  component: SignupPage,
});

function nameToEmail(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
  return `${slug}@subdesk.local`;
}

function SignupPage() {
  const navigate = useNavigate();
  const { role: urlRole } = Route.useSearch();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const role = urlRole ?? "substitute";

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your full name");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      const syntheticEmail = nameToEmail(name);
      const { data, error } = await supabase.auth.signUp({
        email: syntheticEmail,
        password,
        options: {
          data: { name: name.trim(), role },
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("registered")) {
          toast.error("This name is already taken. Try signing in or pick a different name.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      if (!data.session) {
        await supabase.auth.signInWithPassword({ email: syntheticEmail, password });
      }
      toast.success("Account created!");
      navigate({ to: role === "assigner" ? "/assigner" : "/substitute" });
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
          Just a name and password — no email needed
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

          <Field label="Password">
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={6}
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
