import { useEffect, useState } from "react";
import { Bell, BellRing, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { enablePushReminders, disablePushReminders, currentPushStatus } from "@/lib/push-client";

export function EnableRemindersButton() {
  const [status, setStatus] = useState<"granted" | "denied" | "default" | "unsupported" | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentPushStatus().then(setStatus);
  }, []);

  async function enable() {
    setBusy(true);
    const res = await enablePushReminders();
    setBusy(false);
    if (res.ok) {
      setStatus("granted");
      toast.success("Push reminders enabled");
    } else if (res.reason === "denied") {
      setStatus("denied");
      toast.error("Notifications blocked in browser settings");
    } else if (res.reason === "unsupported") {
      toast.error("Push not supported on this browser");
    } else {
      toast.error("Could not enable push");
    }
  }

  async function disable() {
    setBusy(true);
    await disablePushReminders();
    setBusy(false);
    setStatus("default");
    toast.success("Push reminders disabled");
  }

  if (status === "loading") return null;
  if (status === "unsupported") return null;

  const enabled = status === "granted";
  return (
    <button
      onClick={enabled ? disable : enable}
      disabled={busy || status === "denied"}
      className="w-full h-11 rounded-xl border bg-background font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : enabled ? (
        <BellRing className="h-4 w-4 text-primary" />
      ) : status === "denied" ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {status === "denied"
        ? "Notifications blocked"
        : enabled
          ? "Push reminders on — tap to disable"
          : "Enable push reminders"}
    </button>
  );
}
