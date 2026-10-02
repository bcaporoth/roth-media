// Album access: change an album's owner, add an extra person, and — the one
// automated client email Brandon approved (2026-10-02) — invite that person
// the moment they're given access. Nothing else here may message a client.

import { ADMIN_EMAIL } from "./supabase-admin";
import { resendConfigured, sendEmail } from "./resend";
import { wrapHtml, firstName } from "./client-email";

const SITE = "https://rothmediaco.com";
export const cleanEmail = (e) => String(e || "").trim().toLowerCase();
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Resolve (or create) the roster row for an email. Optional name updates an
// existing row only when one was typed.
async function ensureClient(db, email, name) {
  let { data: client } = await db.from("clients").select("id, name, email").eq("email", email).maybeSingle();
  const typed = String(name || "").trim().slice(0, 80);
  if (!client) {
    const { data, error } = await db
      .from("clients")
      .insert({ email, name: typed || email.split("@")[0].replace(/[._]/g, " ") })
      .select("id, name, email").single();
    if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "That email is already on the roster" : error.message);
    client = data;
  } else if (typed && typed !== client.name) {
    await db.from("clients").update({ name: typed }).eq("id", client.id);
    client.name = typed;
  }
  return client;
}

// "You've been added to <album>" — share link (no login) + portal setup.
// Returns { to, sent, error? } and never throws: the access change already
// happened; the panel just needs to say whether the email went out.
export async function sendAccessInvite({ email, name, gallery }) {
  const to = cleanEmail(email);
  if (to === ADMIN_EMAIL) return { to, sent: false, skipped: "admin" };
  if (!resendConfigured) return { to, sent: false, error: "Email not sent (email isn't set up)" };
  const albumLink = `${SITE}/g/${gallery.share_token}`;
  const portalLink = `${SITE}/portal?email=${encodeURIComponent(to)}&setup=1`;
  const hi = `Hi ${firstName(name, to)},`;
  const intro = `You've been added to the album "${gallery.title}" from Roth Media.`;
  const openNow = `Open it right now — no login needed, and you can pass the link along to family and friends.`;
  const setupLead = `Want your own login? Tap "First time here?" on the portal, enter this email (${to}), and you'll get a one-time code to set a password. That gives you a year of access and unlimited downloads of the originals.`;
  const text = `${hi}\n\n${intro}\n\n${openNow}\n${albumLink}\n\n${setupLead}\n${portalLink}\n\n— Brandon`;
  const html = wrapHtml({
    body: `${hi}\n\n${intro}\n\n${openNow}`,
    cta: [
      { label: "Open the album", href: albumLink },
      { lead: setupLead, label: "Set up your login", href: portalLink, secondary: true },
    ],
    signoff: "— Brandon",
  });
  try {
    await sendEmail({ to, subject: `You've been added to ${gallery.title}`, text, html });
    return { to, sent: true };
  } catch (err) {
    return { to, sent: false, error: `Invite failed: ${err.message}` };
  }
}

// Move an album to a (possibly new) owner. Emails them only when the owner
// actually changes — an ordinary save with the same email sends nothing.
export async function setOwner(db, { galleryId, email: raw, name }) {
  const email = cleanEmail(raw);
  if (!EMAIL_RE.test(email)) throw new Error("That email doesn't look right");
  const { data: g } = await db.from("galleries").select("id, title, share_token, client_id").eq("id", galleryId).maybeSingle();
  if (!g) throw new Error("Gallery not found");
  const client = await ensureClient(db, email, name);
  const changed = client.id !== g.client_id;
  return { clientId: client.id, changed, client, gallery: g };
}

// Put another person on an album. Emails them only when they're new to it.
export async function addMember(db, { galleryId, email: raw, name }) {
  const email = cleanEmail(raw);
  if (!galleryId || !EMAIL_RE.test(email)) throw new Error("Need a gallery and a real email");
  const { data: g } = await db.from("galleries").select("id, title, share_token, client_id").eq("id", galleryId).maybeSingle();
  if (!g) throw new Error("Gallery not found");
  const client = await ensureClient(db, email, name);
  const { data: existing, error: e1 } = await db
    .from("gallery_members").select("client_id").eq("gallery_id", galleryId).eq("client_id", client.id).maybeSingle();
  if (e1) throw new Error(/relation .* does not exist/i.test(e1.message) ? "Run supabase/gallery-members.sql first" : e1.message);
  if (!existing) {
    const { error } = await db.from("gallery_members").upsert({ gallery_id: galleryId, client_id: client.id });
    if (error) throw new Error(error.message);
  }
  const isNew = !existing && client.id !== g.client_id; // the owner already has it
  const invite = isNew ? await sendAccessInvite({ email, name: client.name, gallery: g }) : null;
  return { clientId: client.id, isNew, invite };
}
