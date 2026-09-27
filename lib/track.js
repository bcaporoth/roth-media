// Event tracking — Vercel Web Analytics custom events plus our own
// first-party stats (/api/t, shown in Studio admin → Stats). Safe to call
// anywhere — no-ops on the server or when either sink isn't available.

const ADMIN_FLAG = "rm-admin-device";

// Studio admin sets this so the owner's own browsing never counts.
export function markAdminDevice() {
  try {
    localStorage.setItem(ADMIN_FLAG, "1");
  } catch {}
}

function isAdminDevice() {
  try {
    return localStorage.getItem(ADMIN_FLAG) === "1";
  } catch {
    return false;
  }
}

// UTM tags (or ?src=qr from the business card) from the landing URL,
// remembered for the rest of the visit so a later quote still credits them.
export function readUtm() {
  try {
    const q = new URLSearchParams(window.location.search);
    const fresh = {
      source: q.get("utm_source") || q.get("src") || "",
      medium: q.get("utm_medium") || "",
      campaign: q.get("utm_campaign") || "",
    };
    if (fresh.source) {
      sessionStorage.setItem("rm-utm", JSON.stringify(fresh));
      return fresh;
    }
    return JSON.parse(sessionStorage.getItem("rm-utm") || "null") || {};
  } catch {
    return {};
  }
}

export function beacon(payload) {
  try {
    if (typeof window === "undefined" || isAdminDevice()) return;
    const body = JSON.stringify(payload);
    if (!(navigator.sendBeacon && navigator.sendBeacon("/api/t", body))) {
      fetch("/api/t", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {}
}

export function track(name, data) {
  try {
    if (typeof window !== "undefined" && typeof window.va === "function") {
      window.va("event", { name, data });
    }
  } catch {}
  if (typeof window !== "undefined") {
    beacon({ type: "event", name, path: window.location.pathname, data: data || {} });
  }
}
