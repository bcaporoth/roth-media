import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { clip } from "../../../lib/visitor";
import { resendConfigured, sendEmail } from "../../../lib/resend";
import { LEAD_ALERT_TO, LEAD_SMS_TO } from "../../../lib/studio-emails";

export const dynamic = "force-dynamic";
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const SELECT = "id, client_id, date, time, title, note, idea, source, created_by, followup_at, followup_note, created_at";

// Client calendars. A signed-in client works on their own calendar; Brandon
// (admin) passes client_id and works on anyone's. A client adding a date pings
// Brandon (email + the SMS gateway) so he can plan content around it.
async function who(request, body) {
  if (!portalConfigured || !adminConfigured) return { error: bad("Not set up", 503) };
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: bad("Sign in first", 401) };
  const email = user.email.toLowerCase();
  const db = supabaseAdmin();
  const admin = email === ADMIN_EMAIL;
  const wanted = String(body?.client_id || new URL(request.url).searchParams.get("client_id") || "");
  if (admin && wanted) return { db, admin, clientId: wanted };
  const { data: c } = await db.from("clients").select("id, name").eq("email", email).maybeSingle();
  if (!c) return { error: bad("No client record for this account yet", 404) };
  return { db, admin, clientId: c.id, clientName: c.name || email };
}

export async function GET(request) {
  const w = await who(request); if (w.error) return w.error;
  const { data, error } = await w.db.from("client_events").select(SELECT).eq("client_id", w.clientId).order("date").order("time");
  if (error) return bad(/relation .*client_events/i.test(error.message) ? "Run supabase/client-events.sql once in Supabase first." : error.message, 500);
  return NextResponse.json({ events: data || [], admin: w.admin });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const w = await who(request, body); if (w.error) return w.error;
  const { db, admin, clientId } = w;
  const op = String(body.op || "add");

  if (op === "delete") {
    const q = db.from("client_events").delete().eq("id", String(body.id || "")).eq("client_id", clientId);
    const { error } = await (admin ? q : q.eq("created_by", "client"));
    return error ? bad(error.message, 500) : NextResponse.json({ ok: true });
  }
  if (op === "idea") {
    if (!admin) return bad("Not authorized", 401);
    const { data, error } = await db.from("client_events").update({ idea: clip(body.idea, 2000), updated_at: new Date().toISOString() }).eq("id", String(body.id || "")).eq("client_id", clientId).select(SELECT).single();
    return error ? bad(error.message, 500) : NextResponse.json({ ok: true, event: data });
  }
  if (op === "followup") {
    if (!admin) return bad("Not authorized", 401);
    const { data, error } = await db.from("client_events").update({ followup_at: new Date().toISOString(), followup_note: clip(body.note, 300), updated_at: new Date().toISOString() }).eq("id", String(body.id || "")).eq("client_id", clientId).select(SELECT).single();
    return error ? bad(error.message, 500) : NextResponse.json({ ok: true, event: data });
  }
  // add
  const date = String(body.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("Pick a date");
  const title = clip(body.title, 120);
  if (!title) return bad("Give it a name");
  const time = /^\d{2}:\d{2}$/.test(String(body.time || "")) ? body.time : "";
  const row = { client_id: clientId, date, time, title, note: clip(body.note, 600), created_by: admin ? "studio" : "client" };
  const { data, error } = await db.from("client_events").insert(row).select(SELECT).single();
  if (error) return bad(/relation .*client_events/i.test(error.message) ? "Run supabase/client-events.sql once in Supabase first." : error.message, 500);
  // Their date → Brandon's phone, so content gets planned ahead of it.
  if (!admin && resendConfigured) {
    const whenTxt = `${new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}${time ? ` · ${time}` : ""}`;
    const profile = `https://rothmediaco.com/portal/admin/clients/${clientId}#calendar`;
    const line = `${w.clientName} added "${title}" — ${whenTxt}${row.note ? ` · ${row.note}` : ""}`;
    try {
      await sendEmail({ to: LEAD_ALERT_TO, subject: `Calendar: ${w.clientName} — ${title} (${whenTxt})`, text: `${line}\n\nPlan content around it: ${profile}` });
      if (LEAD_SMS_TO) await sendEmail({ to: LEAD_SMS_TO, subject: "Client calendar", text: `${line}\n${profile}` });
    } catch {}
  }
  return NextResponse.json({ ok: true, event: data });
}
