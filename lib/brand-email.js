// "Send brand palette" — the invite Brandon sends from Studio → Clients →
// profile → Brand. Same landing logic as "It's ready" (lib/ready-email.js):
//   has a login  → /portal/brand (sign in first if needed, then straight there)
//   no login yet → /portal?email=…&setup=1&next=/portal/brand : one-time
//                  code, choose a password, then the palette
// Plain module: Studio's Copy link uses brandLink, the API sends brandInviteEmail.

import { wrapHtml, firstName } from "./client-email";

const SITE = "https://rothmediaco.com";
export const BRAND_PATH = "/portal/brand";

export function brandLink({ email, hasLogin }) {
  return hasLogin || !email
    ? `${SITE}${BRAND_PATH}`
    : `${SITE}/portal?email=${encodeURIComponent(email)}&setup=1&next=${encodeURIComponent(BRAND_PATH)}`;
}

// note: an optional line in Brandon's own words, dropped in after the first line.
export function brandInviteEmail({ name, email, hasLogin, note = "" }) {
  const href = brandLink({ email, hasLogin });
  const hi = `Hi ${firstName(name, email)},`;
  const line = "Here's your brand palette: one page for your logo, colors, look, customers and goals. I plan every shoot, edit and caption for you from it.";
  const how2 = "The essentials take about ten minutes. Skip anything you're not sure of and we'll cover it on a call. It saves as you go, so you can stop and come back.";
  const extra = String(note || "").trim();
  const how = hasLogin
    ? "Sign in with your email and password and it opens right up."
    : "First time? That button sets up your login — one quick code, then a password — and opens your palette.";
  const body = [hi, line, extra, how2].filter(Boolean).join("\n\n");
  const text = `${body}\n\n${how}\n${href}\n\n— Brandon`;
  const html = wrapHtml({ body, cta: { lead: how, label: "Open your brand palette", href }, signoff: "— Brandon" });
  return { subject: "Your brand palette — Roth Media", text, html, href };
}
