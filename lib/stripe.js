// Minimal Stripe client — plain fetch, no SDK. Needs STRIPE_SECRET_KEY on
// Vercel; STRIPE_WEBHOOK_SECRET once the webhook endpoint exists.

import crypto from "node:crypto";

const KEY = process.env.STRIPE_SECRET_KEY || "";
export const stripeConfigured = /^sk_(live|test)_/.test(KEY);
export const stripeLive = /^sk_live_/.test(KEY);

// Flatten nested params into Stripe's form encoding: a[b][0][c]=v
function encode(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? encode(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") encode(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripe(method, path, params) {
  if (!stripeConfigured) throw new Error("Stripe not configured");
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body: method === "GET" ? undefined : encode(params).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  return json;
}

// Verify a webhook payload: t=timestamp,v1=hmac over `${t}.${body}`.
export function verifyWebhook(rawBody, sigHeader, secret, toleranceSec = 300) {
  if (!secret || !sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=")));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const given = String(parts.v1 || "");
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
