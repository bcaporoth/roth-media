import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { LEAD_ALERT_TO, LEAD_SMS_TO, leadAlertEmail } from "../../../../lib/studio-emails";
import { PARTNERS } from "../../../../lib/partners";
import { clip, visitorId } from "../../../../lib/visitor";

export const dynamic = "force-dynamic";

// A lead for a partner (from /go/<slug>): counted for their report, and
// Brandon gets the alert with a ready-to-send text. Nothing goes to the lead.
export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  if (b.website) return NextResponse.json({ ok: true });
  const p = PARTNERS[String(b.slug || "")];
  if (!p?.lead) return NextResponse.json({ error: "Unknown page" }, { status: 404 });
  const name = clip(b.name, 80), phone = clip(b.phone, 40), email = clip(b.email, 160).toLowerCase();
  if (!name || phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Add your name and a 10-digit mobile number." }, { status: 422 });
  const utm = Object.fromEntries(Object.entries(b.utm && typeof b.utm === "object" ? b.utm : {}).slice(0, 6).map(([k, v]) => [clip(k, 30), clip(v, 120)]));
  const row = {
    kind: "partner_lead", name, phone, email,
    subject: `${p.lead.brand} lead — ${name}`,
    summary: `${p.lead.brand} · ${utm.utm_content || utm.utm_campaign || "ad"}`,
    fields: [["for", p.lead.brand], ["name", name], ["phone", phone], ["email", email], ["came from", [utm.utm_source, utm.utm_campaign, utm.utm_content].filter(Boolean).join(" · ") || "direct"]].filter(([, v]) => v),
    source_path: `/go/${b.slug}`, visitor: visitorId(request), status: "new",
    utm: { ...utm, partner: b.slug },
  };
  if (!adminConfigured) return NextResponse.json({ error: "Try again in a minute." }, { status: 503 });
  const { error } = await supabaseAdmin().from("submissions").insert(row);
  if (error) return NextResponse.json({ error: "That didn't save — try again." }, { status: 500 });
  if (resendConfigured) {
    const fn = name.split(/\s+/)[0];
    try { await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail({ ...row, kind: "partner_lead", partnerText: p.lead.textScript(fn), subject: `🔥 ${p.first}'s lead — ${name} (text within 5 min)` }) }); } catch {}
    if (LEAD_SMS_TO) { try { await sendEmail({ to: LEAD_SMS_TO, subject: `${p.first} lead`, text: `${name} ${phone} wants ${p.lead.brand} info` }); } catch {} }
  }
  return NextResponse.json({ ok: true });
}
