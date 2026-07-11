import { useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
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

export function PasswordInput({
  value,
  onChange,
  autoComplete = "current-password",
  placeholder,
  minLength,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + " pr-12"}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

