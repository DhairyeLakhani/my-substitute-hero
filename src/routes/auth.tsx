import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LogIn, UserPlus, GraduationCap } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  role: z.enum(["assigner", "substitute"]).optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Get Started — SubDesk" }] }),
  validateSearch: searchSchema,
  component: AuthSelectPage,
});

function AuthSelectPage() {
  const { role } = Route.useSearch();
  const roleLabel = role === "assigner" ? "Assigning Teacher" : "Substitution Teacher";

  return (
    <main className="min-h-screen bg-background px-5 py-6 flex flex-col">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground w-fit">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4 self-start">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Get started</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {role ? `Continue as ${roleLabel}` : "Sign in or create an account"}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            to="/auth/signin"
            search={{ role }}
            className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <LogIn className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Sign In</div>
              <div className="text-xs text-muted-foreground">Already have an account</div>
            </div>
          </Link>

          <Link
            to="/auth/signup"
            search={{ role }}
            className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="h-12 w-12 rounded-xl bg-secondary text-secondary-foreground grid place-items-center shrink-0">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Create Account</div>
              <div className="text-xs text-muted-foreground">New to SubDesk</div>
            </div>
          </Link>
        </div>
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
