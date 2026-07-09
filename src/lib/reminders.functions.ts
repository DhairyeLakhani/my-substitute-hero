import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string; p256dh: string; auth: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: userId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

export const ackReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { substitutionId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("substitutions")
      .update({ reminder_ack: true })
      .eq("id", data.substitutionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const requestAlarm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { substitutionId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("substitutions")
      .update({ alarm_requested: true })
      .eq("id", data.substitutionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
