import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteSubstituteTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // Verify caller is an assigner (admin)
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "assigner",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    // Verify target user is a substitute (don't allow deleting other admins)
    const { data: targetIsSub, error: targetErr } = await context.supabase.rpc("has_role", {
      _user_id: data.userId,
      _role: "substitute",
    });
    if (targetErr) throw new Error(targetErr.message);
    if (!targetIsSub) throw new Error("Target user is not a substitute teacher");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true };
  });
