// "Your album is ready" — the email Brandon sends from Studio → Galleries →
// Manage → It's ready. One button; where it lands depends on the person:
//   has a login   → the gallery in the portal (sign in first if needed, then
//                   straight there — /portal?next=… carries the destination)
//   no login yet  → /portal?email=…&setup=1&next=… : the one-time code,
//                   choose a password, then the gallery
// The share link rides along as a second button for anyone who'd rather skip
// the login. Plain module: the Studio panel previews it, the API sends it.

import { wrapHtml, firstName } from "./client-email";

const SITE = "https://rothmediaco.com";

export function readyLinks({ gallery, email, hasLogin }) {
  const galleryPath = `/portal/gallery/${gallery.id}`;
  const view = hasLogin
    ? `${SITE}${galleryPath}`
    : `${SITE}/portal?email=${encodeURIComponent(email)}&setup=1&next=${encodeURIComponent(galleryPath)}`;
  return { view, share: `${SITE}/g/${gallery.share_token}` };
}

// note: an optional line in Brandon's own words, dropped in after the first line.
export function readyEmail({ name, email, gallery, hasLogin, note = "" }) {
  const links = readyLinks({ gallery, email, hasLogin });
  const hi = `Hi ${firstName(name, email)},`;
  const line = `Your album "${gallery.title}" is ready.`;
  const extra = String(note || "").trim();
  const how = hasLogin
    ? "Sign in with your email and password and it opens right up."
    : "First time? That button sets up your login — one quick code, then a password — and opens the album.";
  const alt = "Or open it without logging in (this link works for family and friends too):";
  const body = [hi, line, extra].filter(Boolean).join("\n\n");
  const text = `${body}\n\n${how}\n${links.view}\n\n${alt}\n${links.share}\n\n— Brandon`;
  const html = wrapHtml({
    body,
    cta: [
      { lead: how, label: "View your album", href: links.view },
      { lead: alt, label: "Open the share link", href: links.share, secondary: true },
    ],
    signoff: "— Brandon",
  });
  return { subject: `Your album is ready — ${gallery.title}`, text, html, links };
}
