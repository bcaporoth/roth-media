import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { loadDay, confirmEmail } from "../../../../lib/scripts-server";
import { isNoEmail } from "../../../../lib/no-email";

export const dynamic = "force-dynamic";

// Every morning (vercel.json): the day-before confirmation to the CLIENT for
// tomorrow's shoot days: when, where, the flow of the day, their scripts.
// Only days Brandon marked "Locked in" are sent, so a half-planned day never
// goes out by itself. Brandon is copied on each one. Sent once per day and
// date: the stamp is a site_events row (no table change).
//   ?dry=1  lists who would get it and sends nothing.
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const CONFIRM_EVENT = "day_confirm_sent"; // app/api/cron/tomorrow reads the same name

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (!adminConfigured) return NextResponse.json({ ok: false, reason: "not configured" });
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const db = supabaseAdmin();
  const tomorrow = dayKey(new Date(Date.now() + 86400000));
  const { data: rows, error } = await db.from("shoot_days").select("id, status").eq("date", tomorrow);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = [];
  for (const row of rows || []) {
    const path = `/portal/days/${row.id}`;
    const note = (why, extra = {}) => out.push({ day: row.id, ...extra, ...(why ? { skipped: why } : {}) });
    if (row.status !== "locked") { note("not locked in"); continue; }
    const day = await loadDay(db, row.id).catch(() => null);
    const c = day?.client;
    if (!c?.email || isNoEmail(c.email)) { note("no email on file", { title: day?.title }); continue; }
    const { data: opt } = await db.from("clients").select("email_opt_out").eq("id", c.id).maybeSingle().then((r) => r, () => ({ data: null }));
    if (opt?.email_opt_out) { note("they turned emails off", { title: day.title }); continue; }
    const { data: sent } = await db.from("site_events").select("id").eq("name", CONFIRM_EVENT).eq("path", path).eq("data->>date", tomorrow).limit(1);
    if (sent?.length) { note("already sent", { title: day.title }); continue; }
    const mail = confirmEmail(day);
    if (dry) { note("", { title: day.title, to: c.email, subject: mail.subject, text: mail.text, wouldSend: true }); continue; }
    if (!resendConfigured) { note("email isn't set up on this server", { title: day.title }); continue; }
    try {
      await sendEmail({ to: c.email, cc: [ADMIN_EMAIL], ...mail });
      await db.from("site_events").insert({ type: "event", name: CONFIRM_EVENT, path, data: { date: tomorrow } });
      note("", { title: day.title, sent: true });
    } catch (e) {
      note(`send failed: ${e?.message || "error"}`, { title: day.title });
    }
  }
  return NextResponse.json({ ok: true, tomorrow, days: (rows || []).length, sent: out.filter((o) => o.sent).length, results: out });
}
