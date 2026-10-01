import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../lib/resend";
import { LEAD_ALERT_TO, LEAD_SMS_TO, leadAlertEmail, leadAutoReply, leadSmsText } from "../../../lib/studio-emails";
import { clip, visitorId } from "../../../lib/visitor";
import { stripeConfigured } from "../../../lib/stripe";

export const dynamic = "force-dynamic";

const KINDS = new Set(["quote", "promo", "card", "contact"]);

// Every site form posts here: the submission is saved to the Studio inbox
// and Brandon gets an instant alert. The response says whether the alert
// email went out — if it didn't, the browser falls back to FormSubmit so
// a lead is never only in one place.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (body.website) return NextResponse.json({ ok: true, stored: false, emailed: true }); // honeypot

  const fields = Array.isArray(body.fields)
    ? body.fields
        .filter((r) => Array.isArray(r) && r[1] !== undefined && String(r[1]).trim() !== "")
        .slice(0, 40)
        .map(([k, v]) => [clip(k, 80), clip(v, 4000)])
    : [];

  const sub = {
    kind: KINDS.has(body.kind) ? body.kind : "contact",
    name: clip(body.name, 120),
    email: clip(body.email, 160).toLowerCase(),
    phone: clip(body.phone, 40),
    subject: clip(body.subject, 200),
    summary: clip(body.summary, 240),
    fields,
    source_path: clip(body.path, 200),
    visitor: visitorId(request),
    utm: body.utm && typeof body.utm === "object" ? body.utm : {},
  };
  if (!sub.name && !sub.email && !sub.phone)
    return NextResponse.json({ error: "Add a name, email, or phone." }, { status: 422 });

  let stored = false;
  if (adminConfigured) {
    const { error } = await supabaseAdmin().from("submissions").insert(sub);
    stored = !error;
  }

  let emailed = false;
  if (resendConfigured) {
    try {
      await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail(sub) });
      emailed = true;
    } catch {}
    if (LEAD_SMS_TO) {
      try {
        await sendEmail({ to: LEAD_SMS_TO, subject: "New lead", text: leadSmsText(sub) });
      } catch {}
    }
    // The lead hears back in seconds, not hours. Promo entries get their own emails.
    if (sub.email && sub.kind !== "promo" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sub.email)) {
      const category = ["wedding", "business", "family"].includes(body.category) ? body.category : "";
      try {
        await sendEmail({ to: sub.email, ...leadAutoReply(sub, { category, canPay: stripeConfigured }) });
      } catch {}
    }
  }

  return NextResponse.json({ ok: stored || emailed, stored, emailed });
}
