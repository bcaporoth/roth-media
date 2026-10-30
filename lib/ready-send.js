// "It's ready" — the one place the album email actually goes out, whether
// Brandon clicks Send now (Studio → Galleries → Manage → It's ready) or set
// it up under "Send it later" and the cron fires at that moment.
//
// Scheduling lives on the gallery row (supabase/ready-later.sql):
//   ready_scheduled_at   when to send (null = nothing scheduled)
//   ready_scheduled_note Brandon's line for that send
// The cron (/api/cron/ready, every 5 min) sends anything due, then clears
// both columns and stamps ready_sent_at — same as a hand send, so the
// after-delivery chain (review → friend code → rebook) starts from there.

import { resendConfigured, sendEmail } from "./resend";
import { ADMIN_EMAIL } from "./supabase-admin";
import { cleanEmail, EMAIL_RE } from "./album-access";
import { canSignIn } from "./auth-users";
import { readyEmail } from "./ready-email";
import { isNoEmail } from "./no-email";

export const SCHEDULE_COLS = "ready_scheduled_at, ready_scheduled_note";

// Everyone on the gallery with a real email: owner first, then members.
export async function readyRecipients(db, galleryId) {
  const { data: g } = await db
    .from("galleries")
    .select("id, title, share_token, client_id, clients!client_id(name, email)")
    .eq("id", galleryId)
    .maybeSingle();
  if (!g) return { gallery: null, recipients: [] };
  const people = [{ name: g.clients?.name || "", email: cleanEmail(g.clients?.email) }];
  try {
    const { data } = await db.from("gallery_members").select("client_id, clients(name, email)").eq("gallery_id", galleryId);
    for (const m of data || []) people.push({ name: m.clients?.name || "", email: cleanEmail(m.clients?.email) });
  } catch {}
  const seen = new Set();
  const recipients = people.filter(
    (p) => EMAIL_RE.test(p.email) && !isNoEmail(p.email) && p.email !== ADMIN_EMAIL && !seen.has(p.email) && seen.add(p.email)
  );
  return { gallery: g, recipients };
}

// Who can already sign in with a password (Supabase auth pages; a roster
// this size fits in a page or two). A login with no password (setup asked
// for, never finished) still gets the setup link.
async function loginSet(db) {
  const logins = new Set();
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    for (const u of data?.users || []) if (canSignIn(u)) logins.add((u.email || "").toLowerCase());
    if ((data?.users || []).length < 200) break;
  }
  return logins;
}

// Send the album to everyone on it. Returns { ok, sentAt, recorded, results }
// or { ok: false, error, status } when it can't go out at all.
export async function sendReady(db, galleryId, note = "") {
  note = String(note || "").trim().slice(0, 600);
  if (!resendConfigured) return { ok: false, status: 500, error: "Email isn't set up on this server (RESEND_API_KEY)." };
  const { gallery: g, recipients } = await readyRecipients(db, galleryId);
  if (!g) return { ok: false, status: 404, error: "Gallery not found" };
  if (!recipients.length) return { ok: false, status: 422, error: "Nobody on this gallery has an email yet — add one under Edit first." };
  const logins = await loginSet(db);
  const results = [];
  for (const p of recipients) {
    const hasLogin = logins.has(p.email);
    const mail = readyEmail({ name: p.name, email: p.email, gallery: g, hasLogin, note });
    try {
      // Brandon gets a copy of every one, so his inbox shows what each client saw.
      await sendEmail({ to: p.email, cc: [ADMIN_EMAIL], subject: mail.subject, text: mail.text, html: mail.html });
      results.push({ to: p.email, name: p.name, hasLogin, sent: true });
    } catch (err) {
      results.push({ to: p.email, name: p.name, hasLogin, sent: false, error: err.message });
    }
  }
  const sentAt = new Date().toISOString();
  let recorded = false;
  if (results.some((r) => r.sent)) {
    const { error } = await db.from("galleries").update({ ready_sent_at: sentAt }).eq("id", galleryId);
    recorded = !error;
    // A hand send while one was scheduled: the scheduled one is no longer needed.
    await db.from("galleries").update({ ready_scheduled_at: null, ready_scheduled_note: null }).eq("id", galleryId).then(() => {}, () => {});
  }
  return { ok: true, sentAt, recorded, results };
}

// Everything whose time has come. Each gallery is claimed (columns cleared)
// before its send, so two overlapping cron runs can't both email the client.
export async function sendDueReady(db, { dry = false } = {}) {
  const now = new Date().toISOString();
  const { data: due, error } = await db
    .from("galleries")
    .select(`id, title, ${SCHEDULE_COLS}`)
    .not("ready_scheduled_at", "is", null)
    .lte("ready_scheduled_at", now)
    .order("ready_scheduled_at", { ascending: true })
    .limit(50);
  if (error) return { ok: false, error: error.message, needsSql: /ready_scheduled/.test(error.message) };
  const out = [];
  for (const g of due || []) {
    if (dry) { out.push({ id: g.id, title: g.title, at: g.ready_scheduled_at, dry: true }); continue; }
    const { data: claimed } = await db
      .from("galleries")
      .update({ ready_scheduled_at: null, ready_scheduled_note: null })
      .eq("id", g.id)
      .eq("ready_scheduled_at", g.ready_scheduled_at)
      .select("id");
    if (!claimed?.length) continue; // another run got it first
    const r = await sendReady(db, g.id, g.ready_scheduled_note || "");
    out.push({ id: g.id, title: g.title, at: g.ready_scheduled_at, ...r });
  }
  return { ok: true, now, galleries: out };
}
