import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/reminder-ack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyToken } = await import("@/lib/push.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let body: { token?: string };
        try {
          body = (await request.json()) as { token?: string };
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const token = body?.token;
        if (!token) return new Response("Missing token", { status: 400 });
        const parsed = verifyToken(token);
        if (!parsed) return new Response("Invalid token", { status: 401 });
        const update =
          parsed.action === "ack"
            ? { reminder_ack: true }
            : { alarm_requested: true };
        await supabaseAdmin
          .from("substitutions")
          .update(update)
          .eq("id", parsed.substitutionId);
        return Response.json({ ok: true });
      },
    },
  },
});
