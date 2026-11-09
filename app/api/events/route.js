import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { clip } from "../../../lib/visitor";
import { resendConfigured, sendEmail } from "../../../lib/resend";
import { LEAD_ALERT_TO, LEAD_SMS_TO } from "../../../lib/studio-emails";
import { expandEvents } from "../../../lib/event-repeat";

export const dynamic = "force-dynamic";
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const SELECT = "id, client_id, date, time, title, note, idea, source, repeat, wants_shoot, created_by, followup_at, followup_note, created_at";

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

// Moved dates of repeating events, per client: one submissions row (kind
// "event_skips", utm = { [eventId]: [dates] }) — no table change needed.
async function loadSkips(db, clientId) {
  const { data } = await db.from("submissions").select("id, utm").eq("kind", "event_skips").eq("email", `client:${clientId}`).limit(1).maybeSingle();
  return { id: data?.id || null, skips: data?.utm && typeof data.utm === "object" ? data.utm : {} };
}
async function saveSkips(db, clientId, cur, skips) {
  const row = { kind: "event_skips", email: `client:${clientId}`, utm: skips, subject: "Calendar: moved dates", summary: "Moved dates of repeating events", updated_at: new Date().toISOString() };
  const q = cur.id ? db.from("submissions").update(row).eq("id", cur.id) : db.from("submissions").insert({ ...row, status: "archived", fields: [], source_path: "/portal/calendar" });
  const { error } = await q;
  if (error) throw new Error(error.message);
}
const addDays = (ymd, n) => { const [y, m, d] = ymd.split("-").map(Number); const t = new Date(y, m - 1, d + n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
const dayDiff = (a, b) => Math.round((Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 86400000);

export async function GET(request) {
  const w = await who(request); if (w.error) return w.error;
  const { data, error } = await w.db.from("client_events").select(SELECT).eq("client_id", w.clientId).order("date").order("time");
  if (error) return bad(/relation .*client_events/i.test(error.message) ? "Run supabase/client-events.sql once in Supabase first." : error.message, 500);
  const { skips } = await loadSkips(w.db, w.clientId);
  return NextResponse.json({ events: expandEvents(data || [], { skips }), admin: w.admin });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const w = await who(request, body); if (w.error) return w.error;
  const { db, admin, clientId } = w;
  const op = String(body.op || "add");

  const rowId = String(body.id || "").split("@")[0];
  if (op === "delete") {
    const q = db.from("client_events").delete().eq("id", rowId).eq("client_id", clientId);
    const { error } = await (admin ? q : q.eq("created_by", "client"));
    return error ? bad(error.message, 500) : NextResponse.json({ ok: true });
  }
  if (op === "idea") {
    if (!admin) return bad("Not authorized", 401);
    const { data, error } = await db.from("client_events").update({ idea: clip(body.idea, 2000), updated_at: new Date().toISOString() }).eq("id", rowId).eq("client_id", clientId).select(SELECT).single();
    return error ? bad(error.message, 500) : NextResponse.json({ ok: true, event: data });
  }
  if (op === "wants") {
    // The client raising a hand: "I'd like content for this." Pings Brandon.
    const want = Boolean(body.wants);
    const { data, error } = await db.from("client_events").update({ wants_shoot: want, updated_at: new Date().toISOString() }).eq("id", rowId).eq("client_id", clientId).select(SELECT).single();
    if (error) return bad(error.message, 500);
    if (want && !admin && resendConfigured) {
      const profile = `https://rothmediaco.com/portal/admin/clients/${clientId}#calendar`;
      const line = `${w.clientName} wants content for "${data.title}" — ${data.date}${data.time ? ` · ${data.time}` : ""}`;
      try {
        await sendEmail({ to: LEAD_ALERT_TO, subject: `🔥 Shoot request: ${w.clientName} — ${data.title}`, text: `${line}\n\nPlan it: ${profile}` });
        if (LEAD_SMS_TO) await sendEmail({ to: LEAD_SMS_TO, subject: "Shoot request", text: `${line}\n${profile}` });
      } catch {}
    }
    return NextResponse.json({ ok: true, event: data });
  }
  // Reschedule (2026-11-08). scope "one" moves just this date of a repeating
  // event (the date is skipped on the series, a one-off copy goes on the new
  // date); "all" shifts the whole series by the same number of days.
  if (op === "move") {
    const to = String(body.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) return bad("Pick the new date");
    const time = /^\d{2}:\d{2}$/.test(String(body.time || "")) ? body.time : body.time === "" ? "" : null;
    const { data: ev } = await db.from("client_events").select(SELECT).eq("id", rowId).eq("client_id", clientId).maybeSingle();
    if (!ev) return bad("That date isn't on the calendar anymore", 404);
    if (!admin && ev.created_by !== "client") return bad("Brandon added this one — send him a note to move it.", 403);
    const from = String(body.id || "").includes("@") ? String(body.id).split("@")[1] : String(body.from || ev.date);
    const now = new Date().toISOString();
    let moved;
    if (ev.repeat && body.scope === "one") {
      const cur = await loadSkips(db, clientId);
      const skips = { ...cur.skips, [ev.id]: [...new Set([...(cur.skips[ev.id] || []), from])] };
      await saveSkips(db, clientId, cur, skips);
      const copy = { client_id: clientId, date: to, time: time ?? ev.time, title: ev.title, note: ev.note, idea: ev.idea, source: ev.source, repeat: "", wants_shoot: ev.wants_shoot, created_by: ev.created_by };
      const { data, error } = await db.from("client_events").insert(copy).select(SELECT).single();
      if (error) return bad(error.message, 500);
      moved = data;
    } else {
      const delta = dayDiff(from, to);
      const patch = { date: ev.repeat ? addDays(ev.date, delta) : to, ...(time !== null ? { time } : {}), updated_at: now };
      const { data, error } = await db.from("client_events").update(patch).eq("id", ev.id).eq("client_id", clientId).select(SELECT).single();
      if (error) return bad(error.message, 500);
      // Dates already moved on their own shift with the series.
      if (ev.repeat && delta) {
        const cur = await loadSkips(db, clientId);
        if ((cur.skips[ev.id] || []).length) await saveSkips(db, clientId, cur, { ...cur.skips, [ev.id]: cur.skips[ev.id].map((d) => addDays(d, delta)) });
      }
      moved = data;
    }
    if (!admin && resendConfigured) {
      const fmtD = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const profile = `https://rothmediaco.com/portal/admin/clients/${clientId}#calendar`;
      const line = `${w.clientName} moved "${ev.title}" from ${fmtD(from)} to ${fmtD(to)}${ev.repeat ? (body.scope === "one" ? " (just that one)" : ` (every ${ev.repeat === "monthly" ? "month" : "week"} from now on)`) : ""}${moved.time ? ` · ${moved.time}` : ""}`;
      try {
        await sendEmail({ to: LEAD_ALERT_TO, subject: `Calendar: ${w.clientName} moved ${ev.title}`, text: `${line}\n\n${profile}` });
        if (LEAD_SMS_TO) await sendEmail({ to: LEAD_SMS_TO, subject: "Client calendar", text: `${line}\n${profile}` });
      } catch {}
    }
    const { data: all } = await db.from("client_events").select(SELECT).eq("client_id", clientId).order("date").order("time");
    const { skips } = await loadSkips(db, clientId);
    return NextResponse.json({ ok: true, events: expandEvents(all || [], { skips }) });
  }
  if (op === "followup") {
    if (!admin) return bad("Not authorized", 401);
    const { data, error } = await db.from("client_events").update({ followup_at: new Date().toISOString(), followup_note: clip(body.note, 300), updated_at: new Date().toISOString() }).eq("id", rowId).eq("client_id", clientId).select(SELECT).single();
    return error ? bad(error.message, 500) : NextResponse.json({ ok: true, event: data });
  }
  // add
  const date = String(body.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("Pick a date");
  const title = clip(body.title, 120);
  if (!title) return bad("Give it a name");
  const time = /^\d{2}:\d{2}$/.test(String(body.time || "")) ? body.time : "";
  const repeat = ["weekly", "monthly"].includes(String(body.repeat || "")) ? body.repeat : "";
  const row = { client_id: clientId, date, time, title, note: clip(body.note, 600), repeat, wants_shoot: Boolean(body.wants), created_by: admin ? "studio" : "client" };
  const { data, error } = await db.from("client_events").insert(row).select(SELECT).single();
  if (error) return bad(/relation .*client_events/i.test(error.message) ? "Run supabase/client-events.sql once in Supabase first." : error.message, 500);
  // Their date → Brandon's phone, so content gets planned ahead of it.
  if (!admin && resendConfigured) {
    const whenTxt = `${new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}${time ? ` · ${time}` : ""}`;
    const profile = `https://rothmediaco.com/portal/admin/clients/${clientId}#calendar`;
    const line = `${w.clientName} added "${title}" — ${whenTxt}${repeat ? ` · repeats ${repeat}` : ""}${row.wants_shoot ? " · WANTS CONTENT FOR THIS" : ""}${row.note ? ` · ${row.note}` : ""}`;
    try {
      await sendEmail({ to: LEAD_ALERT_TO, subject: `${row.wants_shoot ? "🔥 Shoot request" : "Calendar"}: ${w.clientName} — ${title} (${whenTxt})`, text: `${line}\n\nPlan content around it: ${profile}` });
      if (LEAD_SMS_TO) await sendEmail({ to: LEAD_SMS_TO, subject: "Client calendar", text: `${line}\n${profile}` });
    } catch {}
  }
  return NextResponse.json({ ok: true, event: data });
}
