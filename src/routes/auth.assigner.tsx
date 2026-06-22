import { createFileRoute } from "@tanstack/react-router";
import AuthForm from "@/components/AuthForm";

export const Route = createFileRoute("/auth/assigner")({
  head: () => ({ meta: [{ title: "Assigner Login — SubDesk" }] }),
  component: () => <AuthForm role="assigner" title="Assigning Teacher" />,
});
