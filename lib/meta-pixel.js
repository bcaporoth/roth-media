// Meta (Facebook) Pixel — inert until NEXT_PUBLIC_META_PIXEL_ID is set on
// Vercel. Everything here no-ops on the server, on the owner's admin device,
// and when the pixel hasn't loaded, so it's safe to call from anywhere.
//
// Setup: Events Manager → the "Roth Media" dataset → copy its ID into the
// Vercel env as NEXT_PUBLIC_META_PIXEL_ID, redeploy. See docs/FACEBOOK-ADS.md.

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

// Our own event names (lib/track.js) → Meta standard events, so campaigns
// can optimise for "Lead" and "Purchase" instead of clicks.
const STANDARD = {
  quote_sent: "Lead",
  ad_lead_sent: "Lead",
  card_lead_sent: "Lead",
  promo_entry_sent: "Lead",
  intake_sent: "Lead",
  call_booked: "Schedule",
  book_now_click: "InitiateCheckout",
};

function fbq(...args) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") window.fbq(...args);
  } catch {}
}

export function pixelPageView() {
  fbq("track", "PageView");
}

// Called by track(): forwards the events Meta cares about, drops the rest.
export function pixelEvent(name, data = {}) {
  const std = STANDARD[name];
  if (!std) return;
  const params = {};
  if (data.category) params.content_category = data.category;
  if (data.package) params.content_name = data.package;
  if (typeof data.total === "number") { params.value = data.total; params.currency = "USD"; }
  fbq("track", std, params);
}

// A paid Stripe checkout. eventID lets Meta de-duplicate a reloaded /booked.
export function pixelPurchase({ value, sessionId, category, packageId }) {
  fbq("track", "Purchase", { value, currency: "USD", content_category: category, content_name: packageId }, sessionId ? { eventID: sessionId } : undefined);
}
