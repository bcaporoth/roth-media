import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../lib/resend";
import { LEAD_ALERT_TO, LEAD_SMS_TO, leadAlertEmail, leadSmsText } from "../../../lib/studio-emails";
import { clip, visitorId } from "../../../lib/visitor";
import { priceQuote } from "../../../lib/booking";
import { cartUrl } from "../../../lib/cart";
import { TYPE_LABEL } from "../../../lib/intake";
import { CALENDLY } from "../../../lib/site";
import { firstName } from "../../../lib/client-email";
import { money } from "../../../lib/packages";

export const dynamic = "force-dynamic";

const KINDS = new Set(["quote", "promo", "card", "contact", "intake", "home"]);

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

  // A quote's cart (package + add-ons) is saved as pay links Brandon can send.
  const cq = body.cart && priceQuote({ category: body.cart.category, packageId: body.cart.packageId, addons: body.cart.addons, code: body.cart.code });
  let clientPayLink = "";
  if (cq) {
    const code = cq.deal?.code || "";
    const base = { category: cq.cat.id, packageId: cq.pkg.id, addons: cq.chosen.map((a) => a.id), name: clip(body.name, 120), email: clip(body.email, 160).toLowerCase(), phone: clip(body.phone, 40), code };
    clientPayLink = cartUrl(base);
    fields.push([cq.mode === "retainer" ? "pay link — retainer (their exact cart)" : "pay link (their exact cart)", clientPayLink]);
    if (cq.mode === "retainer") fields.push(["pay link — balance (send 14 days before)", cartUrl({ ...base, pay: "balance", code: "" })]);
    if (cq.deal) fields.push(["deal", `${cq.deal.label} — ${cq.deal.pct}% off, ends ${cq.deal.endsLabel}${cq.deal.auto ? "" : ` (code ${cq.deal.code})`}`]);
    if (cq.free) fields.push(["included", `${cq.chosen.find((a) => a.id === cq.free.addon)?.name || "add-on"} — ${cq.free.label}${cq.free.code ? ` (code ${cq.free.code})` : ""}`]);
    if (/^(FRIEND|THANKS)-/i.test(String(body.cart.code || ""))) fields.push(["friend code", `${String(body.cart.code).toUpperCase()} — $100 off if it checks out`]);
  }

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
  // Intakes remember what they're for (wedding/family/business) → Studio → Clients.
  if (sub.kind === "intake" && TYPE_LABEL[body.type]) sub.utm = { ...sub.utm, type: body.type };
  if (!sub.name && !sub.email && !sub.phone)
    return NextResponse.json({ error: "Add a name, email, or phone." }, { status: 422 });

  let stored = false;
  if (adminConfigured) {
    const db = supabaseAdmin();
    // An intake fills in the "link sent" placeholder Brandon created, if there is one.
    let placeholder = null;
    if (sub.kind === "intake" && sub.email) {
      const { data } = await db.from("submissions").select("id").eq("kind", "intake_sent").eq("email", sub.email).order("created_at", { ascending: false }).limit(1).maybeSingle();
      placeholder = data;
    }
    const { error } = placeholder
      ? await db.from("submissions").update({ ...sub, status: "new", read_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", placeholder.id)
      : await db.from("submissions").insert(sub);
    stored = !error;
  }

  let emailed = false;
  if (resendConfigured) {
    try {
      const category = ["wedding", "business", "family"].includes(body.category) ? body.category : "";
      await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail({ ...sub, category }) });
      emailed = true;
    } catch {}
    if (LEAD_SMS_TO) {
      try {
        await sendEmail({ to: LEAD_SMS_TO, subject: "New lead", text: leadSmsText(sub) });
      } catch {}
    }
    // The inquirer gets their quote back right away: what it is, what it costs, a link to pay
    // when they're ready (their exact cart), and a link to grab a call so we plan the shoot.
    if (sub.kind === "quote" && cq && sub.email) {
      try {
        const fn = firstName(sub.name, sub.email);
        const get = [...(cq.pkg.get || []), ...cq.chosen.map((a) => a.get)].filter(Boolean);
        const dueLine = cq.mode === "retainer" ? `${money(cq.dueToday)} holds the date; the balance is due 14 days before.` : `${money(cq.total)}${cq.pkg.per || ""} — one payment, paid in full through your link when we lock the date. Nothing else later.`;
        const friendOff = /^FRIEND-/i.test(String(body.cart.code || "")) && cq.pkg.price >= 450 ? `\n\nYour friend's $100 is built into your pay link — ${money(Math.max(0, cq.total - 100))} at checkout.` : "";
        const giveLine = cq.cat.id === "business" ? `\n\nOnce you're booked you'll get your own link to hand to another owner: $100 off their first shoot, $100 back to you.` : "";
        const next = cq.cat.id === "business"
          ? "Next step: grab 20 minutes with me. We'll go through what's worth pushing, who's on camera, and lock a shoot date. You'll leave the call with a date and a plan."
          : "Next step: grab 20 minutes with me and we'll plan it out, then lock the date.";
        await sendEmail({
          to: sub.email,
          subject: `Your quote: ${cq.pkg.name} — ${money(cq.total)}${cq.pkg.per || ""}`,
          text: `Hi ${fn},\n\nHere's your quote for ${cq.pkg.name}${cq.chosen.length ? ` with ${cq.chosen.map((a) => a.name.toLowerCase()).join(", ")}` : ""}.\n\nYou get:\n${get.map((g) => `• ${g}`).join("\n")}\n\n${dueLine}${friendOff}\n\n${next}${giveLine}\n\nBook the call: ${CALENDLY}\n\nYour pay link — hang onto this email, it's yours for good. We'll use it when we lock the date on the call or right before the shoot:\n${clientPayLink}\n\nOr just text me back — this came straight to my phone too.\n\nBrandon\nRoth Media · rothmediaco.com`,
        });
      } catch {}
    }
  }

  return NextResponse.json({ ok: stored || emailed, stored, emailed });
}
