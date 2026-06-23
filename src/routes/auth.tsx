import { createFileRoute, Outlet } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  role: z.enum(["assigner", "substitute"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
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
