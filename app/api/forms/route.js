import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../lib/resend";
import { LEAD_ALERT_TO, LEAD_SMS_TO, leadAlertEmail, leadSmsText } from "../../../lib/studio-emails";
import { parseEventDates } from "../../../lib/event-dates";
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
    // A friend code rides on the pay link too — /pay/cart looks it up and takes the $100 off.
    const code = cq.deal?.code || (/^(FRIEND|THANKS)-/i.test(String(body.cart.code || "")) ? String(body.cart.code).toUpperCase() : "");
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

  // Intake → their calendar: the "anything on the calendar we should shoot
  // around?" answer becomes dated events on the client's calendar, so the
  // calendar isn't empty on day one. Needs an email; makes the client row if
  // it's their first time through.
  if (adminConfigured && sub.email) {
    try {
      const answer = (fields.find(([k]) => /calendar/i.test(k)) || [])[1] || "";
      const { events: found } = answer ? parseEventDates(answer) : { events: [] };
      if (found.length) {
        const db = supabaseAdmin();
        let { data: c } = await db.from("clients").select("id").eq("email", sub.email).maybeSingle();
        if (!c) ({ data: c } = await db.from("clients").insert({ email: sub.email, name: sub.name, phone: sub.phone }).select("id").single());
        if (c) {
          const { data: have } = await db.from("client_events").select("date, title").eq("client_id", c.id);
          const seen = new Set((have || []).map((e) => `${e.date}|${e.title.toLowerCase()}`));
          const rows = found.filter((e) => !seen.has(`${e.date}|${e.title.toLowerCase()}`)).map((e) => ({ client_id: c.id, date: e.date, title: e.title, note: "From their intake", created_by: "studio", source: "intake" }));
          if (rows.length) { await db.from("client_events").insert(rows); fields.push(["on their calendar now", rows.map((r) => `${r.title} (${r.date})`).join(" · ")]); }
        }
      }
    } catch {}
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
        const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const friendAmt = friendOff ? money(Math.max(0, cq.total - 100)) : "";
        const btn = (href, label, dark) => `<a href="${esc(href)}" style="display:inline-block;padding:14px 22px;border-radius:3px;font-weight:700;font-size:15px;text-decoration:none;${dark ? "background:#221f1a;color:#fff;" : "background:#fff;color:#221f1a;border:1px solid #221f1a;"}">${label}</a>`;
        const html = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f3efe8;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#221f1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:6px;overflow:hidden;">
<tr><td style="padding:28px 28px 8px;">
  <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#b06a4f;font-weight:700;">Your quote</p>
  <h1 style="margin:0 0 4px;font-size:26px;line-height:1.15;">${esc(cq.pkg.name)}</h1>
  <p style="margin:0;font-size:14px;color:#6b665e;">${esc(cq.pkg.scope || "")}</p>
</td></tr>
<tr><td style="padding:8px 28px 0;">
  <p style="margin:0;font-size:34px;font-weight:700;line-height:1;">${friendAmt ? `${esc(friendAmt)} <span style="font-size:16px;color:#8a8378;text-decoration:line-through;font-weight:400;">${esc(money(cq.total))}</span>` : `${esc(money(cq.total))}${esc(cq.pkg.per || "")}`}</p>
  <p style="margin:6px 0 0;font-size:13px;color:#6b665e;">${friendAmt ? "Your friend&rsquo;s $100 is built in. " : ""}${cq.mode === "retainer" ? `${esc(money(cq.dueToday))} holds the date; balance due 14 days before.` : "One payment, in full, when we lock the date. Nothing else later."}</p>
</td></tr>
<tr><td style="padding:20px 28px 0;">
  <p style="margin:0 0 8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#b06a4f;font-weight:700;">You get</p>
  <ul style="margin:0;padding:0 0 0 18px;font-size:15px;line-height:1.5;">${get.map((g) => `<li style="margin:0 0 6px;">${esc(g)}</li>`).join("")}</ul>
</td></tr>
<tr><td style="padding:24px 28px 0;">
  <p style="margin:0 0 12px;font-size:15px;line-height:1.5;"><strong>Next: a 15-minute call.</strong> ${cq.cat.id === "business" ? "We pick what&rsquo;s worth pushing, who&rsquo;s on camera, and lock a shoot date." : "We plan it out and lock the date."}</p>
  <p style="margin:0 0 10px;">${btn(CALENDLY, "Book the call", true)}</p>
  <p style="margin:0;">${btn(clientPayLink, "Your pay link", false)}</p>
  <p style="margin:8px 0 0;font-size:12px;color:#8a8378;">Keep this email &mdash; the pay link is yours for good. We use it once the date&rsquo;s locked.</p>
</td></tr>
${cq.cat.id === "business" ? `<tr><td style="padding:20px 28px 0;"><p style="margin:0;padding:12px 14px;border-left:3px solid #b06a4f;background:#f8f5ef;font-size:13px;line-height:1.5;"><strong>Give $100, get $100.</strong> Once you&rsquo;re booked you get a link for the business next door &mdash; $100 off their first shoot, $100 back to you.</p></td></tr>` : ""}
<tr><td style="padding:24px 28px 28px;font-size:14px;line-height:1.5;color:#6b665e;">
  Or just text me back &mdash; this came straight to my phone too.<br><br>
  <strong style="color:#221f1a;">Brandon</strong><br>Roth Media &middot; <a href="https://rothmediaco.com" style="color:#b06a4f;">rothmediaco.com</a> &middot; 845-549-4425
</td></tr>
</table></td></tr></table></body></html>`;
        await sendEmail({
          to: sub.email,
          subject: `Your quote: ${cq.pkg.name} — ${money(friendAmt ? cq.total - 100 : cq.total)}${cq.pkg.per || ""}`,
          html,
          text: `Hi ${fn},\n\n${cq.pkg.name} — ${friendAmt || money(cq.total)}${cq.pkg.per || ""}\n\nYou get:\n${get.map((g) => `• ${g}`).join("\n")}\n\n${dueLine}${friendOff}\n\nNext: a 15-minute call. Book it: ${CALENDLY}\n\nYour pay link (keep this email): ${clientPayLink}${giveLine}\n\nOr just text me back.\n\nBrandon · Roth Media · rothmediaco.com`,
        });
      } catch {}
    }
  }

  return NextResponse.json({ ok: stored || emailed, stored, emailed });
}
