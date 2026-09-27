import { createHash } from "node:crypto";

// Server-side request fingerprinting for first-party stats — no cookies.
// The visitor id is a hash of IP + browser + today's date, so it stays
// stable for a day and can't be traced back to a person.

const SALT = process.env.SUPABASE_SERVICE_ROLE_KEY || "roth-media";

const BOT_RE =
  /bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse|pingdom|curl|wget|python|axios|node-fetch|go-http|java\/|facebookexternalhit|embedly|whatsapp|vercel/i;

export function clientIp(request) {
  const h = request.headers;
  return (
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    ""
  );
}

export function isBot(request) {
  const ua = request.headers.get("user-agent") || "";
  return !ua || BOT_RE.test(ua);
}

export function visitorId(request) {
  const day = new Date().toISOString().slice(0, 10);
  const ua = request.headers.get("user-agent") || "";
  return createHash("sha256")
    .update(`${SALT}|${day}|${clientIp(request)}|${ua}`)
    .digest("hex")
    .slice(0, 16);
}

export function parseUA(ua = "") {
  const device = /ipad|tablet|kindle|playbook|silk/i.test(ua)
    ? "tablet"
    : /mobi|iphone|android/i.test(ua)
      ? "mobile"
      : "desktop";
  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\/|opera/i.test(ua)
      ? "Opera"
      : /samsungbrowser/i.test(ua)
        ? "Samsung"
        : /fbav|fban|instagram|tiktok|musical_ly|bytedance/i.test(ua)
          ? "In-app (social)"
          : /crios|chrome/i.test(ua)
            ? "Chrome"
            : /fxios|firefox/i.test(ua)
              ? "Firefox"
              : /safari/i.test(ua)
                ? "Safari"
                : "Other";
  const os = /iphone|ipad|ipod/i.test(ua)
    ? "iOS"
    : /android/i.test(ua)
      ? "Android"
      : /mac os x|macintosh/i.test(ua)
        ? "macOS"
        : /windows/i.test(ua)
          ? "Windows"
          : /cros/i.test(ua)
            ? "ChromeOS"
            : /linux/i.test(ua)
              ? "Linux"
              : "Other";
  return { device, browser, os };
}

// Vercel adds approximate location headers on every request (city-level).
export function geo(request) {
  const h = request.headers;
  const dec = (v) => {
    try {
      return decodeURIComponent(v || "");
    } catch {
      return v || "";
    }
  };
  return {
    country: h.get("x-vercel-ip-country") || "",
    region: dec(h.get("x-vercel-ip-country-region")),
    city: dec(h.get("x-vercel-ip-city")),
  };
}

export const clip = (v, n = 200) => String(v ?? "").trim().slice(0, n);
