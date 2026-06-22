import { createFileRoute } from "@tanstack/react-router";
import AuthForm from "@/components/AuthForm";

export const Route = createFileRoute("/auth/substitute")({
  head: () => ({ meta: [{ title: "Substitute Login — SubDesk" }] }),
  component: () => <AuthForm role="substitute" title="Substitution Teacher" />,
});
