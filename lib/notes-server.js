// Notes with Brandon — server side. One thread per client (client_notes),
// both sides write, each side's unread count, and the email ping that
// carries a note to the other side. Every note is written by a person;
// nothing here composes a message on its own.

import { supabaseAdmin, ADMIN_EMAIL } from "./supabase-admin";
import { sendEmail, resendConfigured } from "./resend";
import { wrapHtml, firstName } from "./client-email";

const SITE = "https://rothmediaco.com";
const missing = (err) => /client_notes/.test(err?.message || "");

export async function listNotes(db, clientId, limit = 200) {
  const { data, error } = await db.from("client_notes").select("id, who, text, created_at, seen_at").eq("client_id", clientId).order("created_at", { ascending: true }).limit(limit);
  if (error) { if (missing(error)) return null; throw new Error(error.message); }
  return data || [];
}

// Mark everything the other side wrote as seen by `me`.
export async function markSeen(db, clientId, me) {
  const other = me === "brandon" ? "client" : "brandon";
  await db.from("client_notes").update({ seen_at: new Date().toISOString() }).eq("client_id", clientId).eq("who", other).is("seen_at", null);
}

export async function unreadFor(db, clientId, me) {
  const other = me === "brandon" ? "client" : "brandon";
  const { count, error } = await db.from("client_notes").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("who", other).is("seen_at", null);
  return error ? 0 : count || 0;
}

// Studio: every client with notes Brandon hasn't seen, newest first.
export async function unreadForBrandon(db) {
  const { data, error } = await db.from("client_notes").select("client_id, text, created_at, clients!client_id(id, name, email)").eq("who", "client").is("seen_at", null).order("created_at", { ascending: false }).limit(50);
  if (error) return missing(error) ? null : [];
  const by = new Map();
  for (const n of data || []) {
    const c = by.get(n.client_id) || { id: n.client_id, name: n.clients?.name || n.clients?.email || "", email: n.clients?.email || "", count: 0, latest: n.text, at: n.created_at };
    c.count += 1;
    by.set(n.client_id, c);
  }
  return [...by.values()];
}

export async function unreadCountForBrandon(db) {
  const { count, error } = await db.from("client_notes").select("id", { count: "exact", head: true }).eq("who", "client").is("seen_at", null);
  return error ? 0 : count || 0;
}

export async function postNote(db, { client, who, text }) {
  const body = String(text || "").trim().slice(0, 4000);
  if (!body) throw new Error("Write something first");
  const { data, error } = await db.from("client_notes").insert({ client_id: client.id, who, text: body }).select("id, who, text, created_at, seen_at").single();
  if (error) throw new Error(missing(error) ? "Run supabase/client-notes.sql once in the Supabase SQL editor first." : error.message);
  // The ping. Best-effort: a mail failure never loses the note.
  let emailed = false;
  if (resendConfigured) {
    try {
      if (who === "client") {
        const link = `${SITE}/portal/admin/clients/${client.id}#notes`;
        await sendEmail({ to: ADMIN_EMAIL, subject: `Note from ${client.name || client.email}`, text: `${body}\n\nReply: ${link}`, html: wrapHtml({ body: `${client.name || client.email} wrote:\n\n${body}`, cta: [{ lead: "", label: "Open their profile and reply", href: link }] }) });
        emailed = true;
      } else if (client.email && !/@no-email\.rothmediaco\.invalid$/.test(client.email)) {
        const link = `${SITE}/portal#notes`;
        await sendEmail({ to: client.email, cc: [ADMIN_EMAIL], subject: `A note from Brandon`, text: `Hi ${firstName(client.name, client.email)},\n\n${body}\n\nReply in your portal: ${link}\n\n— Brandon`, html: wrapHtml({ body: `Hi ${firstName(client.name, client.email)},\n\n${body}`, cta: [{ lead: "Reply in your portal — I see it the moment you send it.", label: "Open your portal", href: link }], signoff: "— Brandon" }) });
        emailed = true;
      }
    } catch { emailed = false; }
  }
  return { note: data, emailed };
}

// Who is asking, and which client's thread they may touch.
export async function noteAccess(request, { createSupabaseServer, portalConfigured, adminConfigured }, clientIdWanted) {
  if (!portalConfigured || !adminConfigured) return null;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  const db = supabaseAdmin();
  if (email === ADMIN_EMAIL) {
    if (!/^[0-9a-f-]{36}$/.test(String(clientIdWanted || ""))) return null;
    const { data: client } = await db.from("clients").select("id, name, email").eq("id", clientIdWanted).maybeSingle();
    return client ? { me: "brandon", client } : null;
  }
  const { data: client } = await db.from("clients").select("id, name, email").eq("email", email).maybeSingle();
  return client ? { me: "client", client } : null;
}
