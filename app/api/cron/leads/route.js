import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { LEAD_ALERT_TO } from "../../../../lib/studio-emails";
import { wrapHtml } from "../../../../lib/client-email";
import { buildLeadBoard } from "../../../../lib/lead-intel";

export const dynamic = "force-dynamic";

// Every morning (vercel.json): one email listing each open lead and the
// next move on it, overdue ones first. Nothing to chase = no email.
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
    db.from("submissions").select("id, created_at, updated_at, kind, status, name, email, phone, summary, visitor").gte("created_at", since),
    db.from("site_events").select("created_at, type, name, path, utm_source, visitor").eq("type", "event").gte("created_at", since).limit(5000),
  ]);
  if (subsRes.error) return NextResponse.json({ error: subsRes.error.message }, { status: 500 });

  const open = buildLeadBoard(subsRes.data || [], evRes.data || []).filter((l) => l.open);
  const overdue = open.filter((l) => l.overdue);
  if (!open.length) return NextResponse.json({ ok: true, open: 0, sent: false });

  const line = (l) => `${l.overdue ? "OVERDUE · " : ""}${l.name}${l.summary ? ` (${l.summary})` : ""}\n→ ${l.next.text}`;
  const body = [
    `${open.length} open lead${open.length > 1 ? "s" : ""}${overdue.length ? `, ${overdue.length} overdue` : ""}. Hottest first:`,
    ...[...overdue, ...open.filter((l) => !l.overdue)].slice(0, 15).map(line),
  ].join("\n\n");

  let sent = false;
  if (!dry && resendConfigured) {
    try {
      await sendEmail({
        to: LEAD_ALERT_TO,
        subject: overdue.length ? `${overdue.length} lead${overdue.length > 1 ? "s" : ""} overdue — ${open.length} open` : `${open.length} open lead${open.length > 1 ? "s" : ""} today`,
        text: body,
        html: wrapHtml({ body, cta: { label: "Open the lead tracker", href: "https://rothmediaco.com/portal/admin/stats?range=30" } }),
      });
      sent = true;
    } catch {}
  }
  return NextResponse.json({ ok: true, dry, open: open.length, overdue: overdue.length, sent });
}
