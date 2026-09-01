// Tiny wrapper around Vercel Web Analytics custom events. Safe to call
// anywhere — no-ops on the server or when analytics isn't loaded.
export function track(name, data) {
  try {
    if (typeof window !== "undefined" && typeof window.va === "function") {
      window.va("event", { name, data });
    }
  } catch {}
}
