import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Users, UserCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SubDesk — School Substitution Manager" },
      { name: "description", content: "Assign and receive school period substitutions in seconds." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/40 px-5 py-10 flex flex-col">
      <header className="text-center mb-10 mt-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4 shadow-sm">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">SubDesk</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
          Manage daily class substitutions for your school
        </p>
      </header>

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto gap-4">
        <Link
          to="/auth"
          search={{ role: "assigner" }}
          className="group flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm active:scale-[0.98] transition-all hover:bg-muted"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Assigning Teacher</div>
            <div className="text-xs text-muted-foreground">Create and manage substitutions</div>
          </div>
        </Link>

        <Link
          to="/auth"
          search={{ role: "substitute" }}
          className="group flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm active:scale-[0.98] transition-all hover:bg-muted"
        >
          <div className="h-12 w-12 rounded-xl bg-secondary text-secondary-foreground grid place-items-center shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Substitution Teacher</div>
            <div className="text-xs text-muted-foreground">View and confirm your assignments</div>
          </div>
        </Link>
      </div>

      <footer className="text-center text-xs text-muted-foreground mt-8">
        Optimized for mobile · Android & iPhone
      </footer>
    </main>
  );
}
