import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, inputCls } from "./auth";
import { z } from "zod";

const searchSchema = z.object({
  role: z.enum(["assigner", "substitute"]).optional(),
});

export const Route = createFileRoute("/auth/signin")({
  head: () => ({ meta: [{ title: "Sign In — SubDesk" }] }),
  validateSearch: searchSchema,
  component: SigninPage,
});

function nameToEmail(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
  return `${slug}@subdesk.local`;
}

function SigninPage() {
  const navigate = useNavigate();
  const { role } = Route.useSearch();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your name");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: nameToEmail(name),
        password,
      });
      if (error) throw error;
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
      <Link to="/auth" search={{ role }} className="inline-flex items-center gap-2 text-sm text-muted-foreground w-fit">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4 self-start">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to manage substitutions</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="Full Name">
            <input
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Your full name"
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

