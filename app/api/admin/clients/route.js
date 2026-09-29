import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { wrapHtml, merge, firstName } from "../../../../lib/client-email";

export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ error: "Not authorized" }, { status: 403 });
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const cleanEmail = (e) => String(e || "").trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Readable temporary password: roth-7f3k-media
function tempPassword() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  const r = (n) => Array.from({ length: n }, () => a[Math.floor(Math.random() * a.length)]).join("");
  return `roth-${r(4)}-${r(4)}`;
}

async function findAuthUser(db, email) {
  // Supabase admin API pages at 50; rosters this size fit in a few pages.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = (data?.users || []).find((u) => (u.email || "").toLowerCase() === email);
    if (hit) return hit;
    if ((data?.users || []).length < 200) break;
  }
  return null;
}

// Roster + galleries + account status, one call.
export async function GET() {
  if (!(await isAdminRequest())) return deny();
  const db = supabaseAdmin();
  let { data: clients, error } = await db
    .from("clients")
    .select("id, email, name, phone, notes, created_at")
    .order("name", { ascending: true });
  if (error) {
    // phone/notes arrive with supabase/clients.sql — degrade to the base roster.
    ({ data: clients, error } = await db.from("clients").select("id, email, name, created_at").order("name"));
  }
  if (error) return bad(error.message, 500);
  const { data: galleries } = await db
    .from("galleries")
    .select("id, title, share_token, media_count, event_date, client_id, created_at")
    .order("created_at", { ascending: false });
  const byClient = {};
  for (const g of galleries || []) (byClient[g.client_id] ||= []).push(g);

  const accounts = {};
  try {
    for (let page = 1; page <= 20; page++) {
      const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
      for (const u of data?.users || []) accounts[(u.email || "").toLowerCase()] = { lastSignIn: u.last_sign_in_at || null, created: u.created_at };
      if ((data?.users || []).length < 200) break;
    }
  } catch {}

  return NextResponse.json({
    emailReady: resendConfigured,
    clients: (clients || []).map((c) => ({
      ...c,
      phone: c.phone || "",
      notes: c.notes || "",
      galleries: byClient[c.id] || [],
      account: accounts[c.email.toLowerCase()] || null,
    })),
  });
}

export async function POST(request) {
  if (!(await isAdminRequest())) return deny();
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();

  if (body.action === "add") {
    const email = cleanEmail(body.email);
    const name = String(body.name || "").trim().slice(0, 80);
    if (!EMAIL_RE.test(email)) return bad("That email doesn't look right");
    const { data, error } = await db
      .from("clients")
      .insert({ email, name: name || email.split("@")[0], ...(body.phone ? { phone: String(body.phone).slice(0, 40) } : {}) })
      .select("id").single();
    if (error) return bad(/duplicate|unique/i.test(error.message) ? "That email is already on the roster" : error.message, 500);
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (body.action === "update") {
    const { id } = body;
    if (!id) return bad("Bad request");
    const patch = {};
    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 80);
    if (body.phone !== undefined) patch.phone = String(body.phone).trim().slice(0, 40);
    if (body.notes !== undefined) patch.notes = String(body.notes).slice(0, 4000);
    if (body.email !== undefined) {
      const email = cleanEmail(body.email);
      if (!EMAIL_RE.test(email)) return bad("That email doesn't look right");
      patch.email = email;
    }
    let { error } = await db.from("clients").update(patch).eq("id", id);
    if (error && /phone|notes/i.test(error.message)) {
      delete patch.phone; delete patch.notes;
      ({ error } = await db.from("clients").update(patch).eq("id", id));
    }
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove") {
    const { id } = body;
    if (!id) return bad("Bad request");
    const { count } = await db.from("galleries").select("id", { count: "exact", head: true }).eq("client_id", id);
    if (count) return bad("This client has galleries — delete those first (or keep the client).");
    const { error } = await db.from("clients").delete().eq("id", id);
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  // Give a client a temporary password (creates the login if they never set one).
  if (body.action === "set-password") {
    const email = cleanEmail(body.email);
    if (!EMAIL_RE.test(email)) return bad("Bad email");
    const password = String(body.password || "").trim() || tempPassword();
    if (password.length < 8) return bad("Password needs 8+ characters");
    try {
      const existing = await findAuthUser(db, email);
      if (existing) {
        const { error } = await db.auth.admin.updateUserById(existing.id, { password });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) throw new Error(error.message);
      }
    } catch (err) {
      return bad(err.message, 500);
    }
    return NextResponse.json({ ok: true, password });
  }

  // "Your gallery is ready" — share link, with the portal as the long-term door.
  if (body.action === "gallery-ready") {
    if (!resendConfigured) return bad("Email isn't set up yet — add RESEND_API_KEY in Vercel.", 503);
    const { clientId, galleryId, note } = body;
    const [{ data: c }, { data: g }] = await Promise.all([
      db.from("clients").select("id, email, name").eq("id", clientId).maybeSingle(),
      db.from("galleries").select("id, title, share_token, media_count").eq("id", galleryId).maybeSingle(),
    ]);
    if (!c || !g) return bad("Client or gallery not found", 404);
    const link = `https://rothmediaco.com/g/${g.share_token}`;
    const text = `Hi ${firstName(c.name, c.email)},\n\nYour gallery is ready: ${g.title}.\n\n${note ? note + "\n\n" : ""}Open it here — no login needed, and you can share the link with family and friends:\n${link}\n\nEverything is yours to keep. Download originals anytime.\n\n— Brandon`;
    try {
      await sendEmail({
        to: c.email,
        subject: `Your gallery is ready — ${g.title}`,
        text,
        html: wrapHtml({ body: `Hi ${firstName(c.name, c.email)},\n\nYour gallery is ready: ${g.title}.${note ? "\n\n" + note : ""}\n\nOpen it below — no login needed, and you can share the link with family and friends. Everything is yours to keep; download originals anytime.\n\n— Brandon`, cta: { label: "Open your gallery", href: link } }),
      });
    } catch (err) {
      return bad(err.message, 502);
    }
    return NextResponse.json({ ok: true });
  }

  // Broadcast to a list of client ids (or everyone). {name} merges per recipient.
  if (body.action === "broadcast") {
    if (!resendConfigured) return bad("Email isn't set up yet — add RESEND_API_KEY in Vercel.", 503);
    const subject = String(body.subject || "").trim().slice(0, 200);
    const message = String(body.message || "").trim().slice(0, 10000);
    if (!subject || !message) return bad("Subject and message are both needed");
    let q = db.from("clients").select("id, email, name");
    if (Array.isArray(body.ids) && body.ids.length) q = q.in("id", body.ids.slice(0, 500));
    const { data: clients, error } = await q;
    if (error) return bad(error.message, 500);
    const seen = new Set();
    let sent = 0;
    const failed = [];
    for (const c of clients || []) {
      const email = cleanEmail(c.email);
      if (!EMAIL_RE.test(email) || seen.has(email)) continue;
      seen.add(email);
      try {
        const bodyText = merge(message, c);
        await sendEmail({ to: email, subject: merge(subject, c), text: bodyText, html: wrapHtml({ body: bodyText }) });
        sent += 1;
      } catch (err) {
        failed.push(`${email}: ${err.message}`);
      }
    }
    return NextResponse.json({ ok: true, sent, failed });
  }

  return bad("Unknown action", 400);
}
