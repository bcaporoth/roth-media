import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { LEAD_ALERT_TO } from "../../../../lib/studio-emails";
import { wrapHtml } from "../../../../lib/client-email";
import { buildLeadBoard } from "../../../../lib/lead-intel";
import { balancesToSend, balanceLine } from "../../../../lib/balances";
import { PARTNERS } from "../../../../lib/partners";
import { partnerAgreement, rateDates } from "../../../../lib/partner-stats";
import { owedList, owedLine } from "../../../../lib/delivery";

export const dynamic = "force-dynamic";

// Every morning (vercel.json): one email to Brandon — wedding balances to
// send first (due within 14 days, with the link ready), then each open lead
// and the next move on it. Nothing to chase = no email.
// Plus "Owed": shoots that are done but not delivered yet, most urgent first
// (needs supabase/studio-2.sql; without it the brief is exactly what it was).
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!adminConfigured) return NextResponse.json({ ok: false, reason: "not configured" });
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 14 * 86400000).toISOString();

  const [subsRes, evRes] = await Promise.all([
    db.from("submissions").select("id, created_at, updated_at, kind, status, name, email, phone, summary, visitor").not("kind", "in", "(partner,partner_lead,partner_month,call,intake_sent)").gte("created_at", since),
    db.from("site_events").select("created_at, type, name, path, utm_source, visitor").eq("type", "event").gte("created_at", since).limit(5000),
  ]);
  if (subsRes.error) return NextResponse.json({ error: subsRes.error.message }, { status: 500 });

  const open = buildLeadBoard(subsRes.data || [], evRes.data || []).filter((l) => l.open);
  const overdue = open.filter((l) => l.overdue);
  let bal = { due: [], unclear: [] };
  try { bal = await balancesToSend(db); } catch {}
  // Sneak peeks and finished work still owed to clients. The explicit column
  // list makes this query fail (and the block stay out) until studio-2.sql
  // has been run — nothing else in the brief depends on it.
  let owed = [];
  try {
    const res = await db.from("shoots").select("id, title, kind, status, date, start_time, time_note, lat, lng, client_name, sneak_due, final_due, sneak_delivered_at, final_delivered_at").neq("status", "cancelled");
    if (!res.error) owed = owedList(res.data || []);
  } catch {}
  const owedOverdue = owed.filter((x) => x.d.overdue);
  const OWED_MAX = 12;
  // Partner-rate reviews coming up (or just missed) — from 14 days before to 30 after.
  const reviews = [];
  for (const [slug, p] of Object.entries(PARTNERS)) {
    try {
      const a = await partnerAgreement(slug);
      const d = a?.active && rateDates(a, p.months || 3);
      if (!d) continue;
      const days = Math.round((d.reviewBy.getTime() - Date.now()) / 86400000);
      if (days <= 14 && days >= -30) reviews.push(`${a.business || p.first}: ${p.months || 3}-month partner review ${days >= 0 ? `due in ${days} day${days === 1 ? "" : "s"}` : `${-days} days overdue`} (by ${d.reviewBy.toLocaleDateString("en-US", { month: "short", day: "numeric" })}). Go over the report together and agree the rate after ${d.lockedUntil.toLocaleDateString("en-US", { month: "short", day: "numeric" })}. A new rate needs 30 days' written notice.\nReport + numbers: https://rothmediaco.com/portal/admin/partners`);
    } catch {}
  }
  // Mondays: the weekly Google Business Profile post (town names help the map ranking).
  const POST_IDEAS = [
    "A reel from your latest shoot + \"Filmed in [town]. Booking [month] dates now.\"",
    "A behind-the-scenes photo + one line on what the client wanted and how it turned out",
    "A wedding sneak-peek still + \"Sneak peeks in 48 hours, full film in 6 weeks. Waverly, Sayre, Athens, Elmira, Corning.\"",
    "A local business you filmed + \"Content Day at [business], [town]: one shoot, a month of posts.\"",
  ];
  const etDay = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long" });
  const weekNo = Math.floor(Date.now() / (7 * 86400000));
  const gbpNudge = etDay === "Monday" ? [`GOOGLE POST THIS WEEK (2 min, helps you rank in the map results):\n${POST_IDEAS[weekNo % POST_IDEAS.length]}\nPost it: search "my business" on Google → Posts → Add post. Add a Book button to rothmediaco.com/quote.`] : [];
  if (!open.length && !bal.due.length && !bal.unclear.length && !reviews.length && !gbpNudge.length && !owed.length) return NextResponse.json({ ok: true, open: 0, balances: 0, sent: false });

  const line = (l) => `${l.overdue ? "OVERDUE · " : ""}${l.name}${l.summary ? ` (${l.summary})` : ""}\n→ ${l.next.text}`;
  const body = [
    ...gbpNudge,
    ...(reviews.length ? [`PARTNER REVIEW (${reviews.length}):`, ...reviews] : []),
    ...(bal.due.length ? [`WEDDING BALANCES TO SEND (${bal.due.length}). Text or email each couple their link:`, ...bal.due.map(balanceLine)] : []),
    ...(bal.unclear.length ? [`Balances with a date I can't read (${bal.unclear.length}). Check the date and send when it's 14 days out:`, ...bal.unclear.map((r) => `${r.name} — $${r.owed.toLocaleString("en-US")} · date on file: "${r.event || "none"}"\nLink: ${r.link}`)] : []),
    ...(owed.length ? [`OWED TO CLIENTS (${owed.length}${owedOverdue.length ? `, ${owedOverdue.length} overdue` : ""}). Most urgent first:`, ...owed.slice(0, OWED_MAX).map(owedLine), ...(owed.length > OWED_MAX ? [`+ ${owed.length - OWED_MAX} more`] : []), "Tick them off: https://rothmediaco.com/portal/admin/shoots"] : []),
    ...(open.length ? [`${open.length} open lead${open.length > 1 ? "s" : ""}${overdue.length ? `, ${overdue.length} overdue` : ""}. Hottest first:`, ...[...overdue, ...open.filter((l) => !l.overdue)].slice(0, 15).map(line)] : []),
  ].join("\n\n");
  const owedTag = owed.length ? `${owedOverdue.length ? `${owedOverdue.length} overdue to deliver` : `${owed.length} to deliver`}` : "";
  const baseSubject = bal.due.length
    ? `${bal.due.length} wedding balance${bal.due.length > 1 ? "s" : ""} to send${open.length ? ` · ${open.length} open lead${open.length > 1 ? "s" : ""}` : ""}`
    : overdue.length ? `${overdue.length} lead${overdue.length > 1 ? "s" : ""} overdue — ${open.length} open` : open.length ? `${open.length} open lead${open.length > 1 ? "s" : ""} today` : reviews.length ? "Partner review coming up" : gbpNudge.length ? "This week's Google post" : (bal.unclear.length || !owed.length) ? "A wedding balance needs a date check" : "";
  const subject = [baseSubject, owedTag].filter(Boolean).join(" · ");

  let sent = false;
  if (!dry && resendConfigured) {
    try {
      await sendEmail({
        to: LEAD_ALERT_TO,
        subject,
        text: body,
        html: wrapHtml({ body, cta: { label: "Open the lead tracker", href: "https://rothmediaco.com/portal/admin/stats?range=30" } }),
      });
      sent = true;
    } catch {}
  }
  return NextResponse.json({ ok: true, dry, open: open.length, overdue: overdue.length, balances: bal.due.length, unclearDates: bal.unclear.length, owed: owed.length, sent, ...(dry ? { body } : {}) });
}
