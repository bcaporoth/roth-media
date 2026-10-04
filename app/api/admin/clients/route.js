import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin, ADMIN_EMAIL } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail, sendBatch } from "../../../../lib/resend";
import { wrapHtml, merge, firstName, unsubscribeUrl } from "../../../../lib/client-email";
import { addMember } from "../../../../lib/album-access";
import { CALL, TYPE_LABEL, typeOf } from "../../../../lib/intake";
import { isNoEmail, standInEmail } from "../../../../lib/no-email";

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
  // Supabase admin API pages; rosters this size fit in a page or two.
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
    .select("id, email, name, phone, notes, email_opt_out, created_at")
    .order("name", { ascending: true });
  if (error) {
    // phone/notes (clients.sql) and email_opt_out (clients-optout.sql) — degrade to the base roster.
    ({ data: clients, error } = await db.from("clients").select("id, email, name, phone, notes, created_at").order("name"));
  }
  if (error) {
    ({ data: clients, error } = await db.from("clients").select("id, email, name, created_at").order("name"));
  }
  if (error) return bad(error.message, 500);
  const { data: galleries } = await db
    .from("galleries")
    .select("id, title, share_token, media_count, event_date, client_id, created_at")
    .order("created_at", { ascending: false });
  // Extra people on each album (spouse, parents) — table arrives with gallery-members.sql.
  const membersByGallery = {};
  const memberOf = {};
  try {
    const { data: members } = await db.from("gallery_members").select("gallery_id, client_id, clients(id, name, email)");
    for (const m of members || []) {
      (membersByGallery[m.gallery_id] ||= []).push({ id: m.client_id, name: m.clients?.name || "", email: m.clients?.email || "" });
      (memberOf[m.client_id] ||= []).push(m.gallery_id);
    }
  } catch {}
  const withMembers = (g) => ({ ...g, members: membersByGallery[g.id] || [] });
  const byId = {};
  for (const g of galleries || []) byId[g.id] = g;
  const byClient = {};
  for (const g of galleries || []) (byClient[g.client_id] ||= []).push(withMembers(g));
  for (const [cid, gids] of Object.entries(memberOf))
    for (const gid of gids) if (byId[gid]) (byClient[cid] ||= []).push({ ...withMembers(byId[gid]), shared: true });

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
    const name = String(body.name || "").trim().slice(0, 80);
    // Email is optional: a name alone is enough (they get a stand-in address until you add a real one).
    let email = cleanEmail(body.email);
    if (!email) {
      if (!name) return bad("Add a name or an email");
      email = standInEmail(name);
    } else if (!EMAIL_RE.test(email)) return bad("That email doesn't look right");
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
      // Was added without an email: carry their call sheets, inquiries and shoots over to the real address.
      try {
        const { data: was } = await db.from("clients").select("email").eq("id", id).maybeSingle();
        const old = cleanEmail(was?.email);
        if (isNoEmail(old) && old !== email) {
          await db.from("submissions").update({ email }).eq("email", old);
          await db.from("shoots").update({ client_email: email }).eq("client_email", old);
        }
      } catch {}
      // Keep the login in step — RLS matches on the auth email, so a roster-only
      // change would silently lock them out of every gallery.
      try {
        const { data: cur } = await db.from("clients").select("email").eq("id", id).maybeSingle();
        if (cur && cur.email.toLowerCase() !== email) {
          const au = await findAuthUser(db, cur.email.toLowerCase());
          if (au) await db.auth.admin.updateUserById(au.id, { email, email_confirm: true });
        }
      } catch {}
    }
    let { error } = await db.from("clients").update(patch).eq("id", id);
    if (error && /phone|notes/i.test(error.message)) {
      delete patch.phone; delete patch.notes;
      ({ error } = await db.from("clients").update(patch).eq("id", id));
    }
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  // Put another person on an album: ensures they're on the roster, links them,
  // and (only when they're new to it) emails them an access invite.
  if (body.action === "add-member") {
    try {
      const r = await addMember(db, { galleryId: body.galleryId, email: body.email, name: body.name });
      return NextResponse.json({ ok: true, ...r });
    } catch (err) {
      return bad(err.message, /real email|not found/i.test(err.message) ? 422 : 500);
    }
  }

  if (body.action === "remove-member") {
    const { galleryId, clientId } = body;
    if (!galleryId || !clientId) return bad("Bad request");
    const { error } = await db.from("gallery_members").delete().eq("gallery_id", galleryId).eq("client_id", clientId);
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove") {
    const { id } = body;
    if (!id) return bad("Bad request");
    const { count } = await db.from("galleries").select("id", { count: "exact", head: true }).eq("client_id", id);
    if (count) return bad("This client has galleries — delete those first (or keep the client).");
    const { data: c } = await db.from("clients").select("email").eq("id", id).maybeSingle();
    try { await db.from("gallery_members").delete().eq("client_id", id); } catch {}
    const { error } = await db.from("clients").delete().eq("id", id);
    if (error) return bad(error.message, 500);
    // Their login goes too — a roster-less account can't see anything anyway,
    // and leaving it means a stale password floating around.
    let loginRemoved = false;
    try {
      const au = c?.email ? await findAuthUser(db, cleanEmail(c.email)) : null;
      if (au && au.email?.toLowerCase() !== ADMIN_EMAIL) {
        const { error: e2 } = await db.auth.admin.deleteUser(au.id);
        loginRemoved = !e2;
      }
    } catch {}
    return NextResponse.json({ ok: true, loginRemoved });
  }

  // Put someone back on the broadcast list after they unsubscribed (they asked).
  if (body.action === "resubscribe") {
    const { id } = body;
    if (!id) return bad("Bad request");
    const { error } = await db.from("clients").update({ email_opt_out: false }).eq("id", id);
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  // Give a client a temporary password (creates the login if they never set one).
  if (body.action === "set-password") {
    const email = cleanEmail(body.email);
    if (!EMAIL_RE.test(email)) return bad("Bad email");
    if (isNoEmail(email)) return bad("Add their email first — the login is their email.");
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
    if (isNoEmail(c.email)) return bad("Add their email first — or copy the share link and text it.");
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
    const pick = (cols) => {
      let q = db.from("clients").select(cols);
      if (Array.isArray(body.ids) && body.ids.length) q = q.in("id", body.ids.slice(0, 500));
      return q;
    };
    let { data: clients, error } = await pick("id, email, name, email_opt_out, unsubscribe_token");
    if (error) ({ data: clients, error } = await pick("id, email, name")); // before clients-optout.sql
    if (error) return bad(error.message, 500);
    const seen = new Set();
    const list = [];
    let skipped = 0;
    for (const c of clients || []) {
      const email = cleanEmail(c.email);
      if (!EMAIL_RE.test(email) || seen.has(email) || isNoEmail(email)) continue;
      if (c.email_opt_out) { skipped += 1; continue; }
      seen.add(email);
      const bodyText = merge(message, c);
      const unsubscribe = unsubscribeUrl(c);
      const footer = unsubscribe ? `\n\nDon't want emails from Roth Media? Unsubscribe: ${unsubscribe}` : "";
      list.push({ to: email, subject: merge(subject, c), text: bodyText + footer, html: wrapHtml({ body: bodyText, unsubscribe }), unsubscribe });
    }
    // Resend's batch endpoint takes 100 per call — one request, no 2/sec throttle to trip.
    let sent = 0;
    const failed = [];
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      try {
        await sendBatch(chunk);
        sent += chunk.length;
      } catch (err) {
        failed.push(`${chunk.length} recipients: ${err.message}`);
      }
    }
    return NextResponse.json({ ok: true, sent, skipped, failed });
  }

  // Make sure someone who only inquired is on the roster (opens their profile).
  if (body.action === "ensure") {
    const email = cleanEmail(body.email);
    if (!EMAIL_RE.test(email)) return bad("Bad email");
    const { data: hit } = await db.from("clients").select("id").eq("email", email).maybeSingle();
    if (hit) return NextResponse.json({ ok: true, id: hit.id });
    const name = String(body.name || "").trim().slice(0, 80) || email.split("@")[0].replace(/[._]/g, " ");
    const { data, error } = await db.from("clients").insert({ email, name, ...(body.phone ? { phone: String(body.phone).slice(0, 40) } : {}) }).select("id").single();
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true, id: data.id });
  }

  // An inquiry that came in before Studio existed (texted, emailed, old form) — pasted in by hand.
  if (body.action === "add-inquiry") {
    const email = cleanEmail(body.email);
    const text = String(body.text || "").trim().slice(0, 8000);
    if (!EMAIL_RE.test(email) || !text) return bad("Need the email and the text");
    const when = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || "")) ? `${body.date}T12:00:00Z` : new Date().toISOString();
    const { data, error } = await db.from("submissions").insert({
      kind: "contact", status: "contacted", read_at: new Date().toISOString(), created_at: when,
      name: String(body.name || "").slice(0, 120), email, phone: String(body.phone || "").slice(0, 40),
      subject: `Inquiry — ${body.name || email}`, summary: "Inquiry (added by hand)",
      fields: [["what they sent", text]], source_path: "/portal/admin/clients", utm: {},
    }).select("id, created_at, kind, name, email, phone, subject, summary, fields, notes, status, utm").single();
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true, item: data });
  }

  // "Send intake link" — remembers that it went out (the client's answers replace this row).
  if (body.action === "intake-sent") {
    const email = cleanEmail(body.email);
    if (!EMAIL_RE.test(email)) return bad("Bad email");
    const type = typeOf(body.type);
    const { data: dup } = await db.from("submissions").select("id").eq("kind", "intake_sent").eq("email", email).maybeSingle();
    if (dup) return NextResponse.json({ ok: true, id: dup.id, already: true });
    const { data, error } = await db.from("submissions").insert({
      kind: "intake_sent", status: "contacted", read_at: new Date().toISOString(),
      name: String(body.name || "").slice(0, 120), email, phone: String(body.phone || "").slice(0, 40),
      subject: `Intake link sent — ${body.name || email}`, summary: `${TYPE_LABEL[type]} intake link sent`,
      fields: [], source_path: "/portal/admin/clients", utm: { type },
    }).select("id").single();
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true, id: data.id });
  }

  // Orientation-call sheet: create on first tap, then every change saves the whole sheet.
  if (body.action === "call-save") {
    const email = cleanEmail(body.email);
    if (!EMAIL_RE.test(email)) return bad("Bad email");
    const type = typeOf(body.type);
    const prompts = CALL[type].prompts;
    const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
    const fields = prompts.map((q) => [q, String(answers[q] || "").slice(0, 4000)]);
    const checks = {};
    for (const c of CALL[type].checks) checks[c] = Boolean(body.checks?.[c]);
    const callDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.callDate || "")) ? body.callDate : new Date().toISOString().slice(0, 10);
    const followUp = /^\d{4}-\d{2}-\d{2}$/.test(String(body.followUp || "")) ? body.followUp : "";
    const row = {
      kind: "call", status: "contacted", read_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      name: String(body.name || "").slice(0, 120), email, phone: String(body.phone || "").slice(0, 40),
      subject: `Call sheet — ${body.name || email}`,
      summary: `${TYPE_LABEL[type]} call · ${callDate}`,
      fields, notes: String(body.notes || "").slice(0, 10000),
      source_path: "/portal/admin/clients", utm: { type, checks, call_date: callDate, follow_up: followUp },
    };
    const q = body.id ? db.from("submissions").update(row).eq("id", body.id).eq("kind", "call") : db.from("submissions").insert(row);
    const { data, error } = await q.select("id, created_at, updated_at, kind, name, email, phone, summary, fields, notes, status, utm").single();
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true, item: data });
  }

  if (body.action === "call-delete") {
    if (!body.id) return bad("Bad request");
    const { error } = await db.from("submissions").delete().eq("id", body.id).eq("kind", "call");
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  return bad("Unknown action", 400);
}
