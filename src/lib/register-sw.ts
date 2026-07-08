// Guarded service worker registration wrapper.
// See PWA skill: never register in dev, iframe preview, or Lovable preview hosts.
const SW_URL = "/sw.js";

function hostnameIsLovablePreview(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterMatching(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const url = new URL(window.location.href);
  const killSwitch = url.searchParams.get("sw") === "off";
  const hostname = window.location.hostname;

  const shouldRefuse =
    !import.meta.env.PROD ||
    inIframe ||
    killSwitch ||
    hostnameIsLovablePreview(hostname);

  if (shouldRefuse) {
    await unregisterMatching();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch (err) {
    console.error("Service worker registration failed:", err);
  }
}
