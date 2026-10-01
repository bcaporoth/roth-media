// Studio emails: the instant new-lead alert to Brandon and the one-tap
// review request to a client. Plain inline-styled HTML (email clients).

import { CALENDLY, EMAIL, REVIEW_URL } from "./site";
import { firstName, wrapHtml } from "./client-email";

// Where lead alerts go. LEAD_SMS_TO (optional) is a carrier email-to-text
// address, e.g. 8455494425@vtext.com (Verizon) or @txt.att.net (AT&T) —
// set it in Vercel to get a text on your phone for every new lead.
export const LEAD_ALERT_TO = process.env.LEAD_ALERT_TO || EMAIL;
export const LEAD_SMS_TO = process.env.LEAD_SMS_TO || "";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function leadAlertEmail(sub) {
  const rows = (sub.fields || [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#8a8378;font-size:13px;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:6px 0;font-size:14px;color:#221f1a;">${esc(v).replace(/\n/g, "<br/>")}</td></tr>`
    )
    .join("");
  const actions = [
    sub.phone && `<a href="tel:${esc(sub.phone)}" style="color:#b06a4f;">Call</a>`,
    sub.phone && `<a href="sms:${esc(sub.phone)}" style="color:#b06a4f;">Text</a>`,
    sub.email && `<a href="mailto:${esc(sub.email)}" style="color:#b06a4f;">Email</a>`,
    `<a href="https://rothmediaco.com/portal/admin/inbox" style="color:#b06a4f;">Open inbox</a>`,
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");
  return {
    subject: sub.subject || `New ${sub.kind} — ${sub.name || sub.email}`,
    html: `<!doctype html><html><body style="margin:0;background:#f4efe6;">
<div style="max-width:560px;margin:0 auto;padding:28px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="background:#faf6ee;border:1px solid #ddd2bf;border-radius:14px;padding:24px;">
    <div style="font-size:11px;letter-spacing:3px;color:#b06a4f;margin-bottom:8px;">NEW ${esc(sub.kind).toUpperCase()}</div>
    <div style="font-size:20px;font-weight:bold;color:#221f1a;margin-bottom:4px;">${esc(sub.name || sub.email || "Someone")}</div>
    ${sub.summary ? `<div style="font-size:14px;color:#6b6358;margin-bottom:16px;">${esc(sub.summary)}</div>` : ""}
    <div style="font-size:14px;margin-bottom:18px;">${actions}</div>
    <table style="border-collapse:collapse;width:100%;">${rows}</table>
  </div>
</div></body></html>`,
  };
}

// Short plain line for the email-to-text gateway (SMS caps ~160 chars).
export function leadSmsText(sub) {
  return [`New ${sub.kind}: ${sub.name || sub.email}`, sub.summary, sub.phone]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 150);
}

export function reviewRequestEmail({ firstName, galleryTitle }) {
  return {
    subject: "Would you leave Roth Media a quick review?",
    html: `<!doctype html><html><body style="margin:0;background:#f4efe6;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="background:#221f1a;border-radius:16px;padding:36px 30px;color:#faf6ee;">
    <div style="font-size:12px;letter-spacing:4px;color:#d9c7a7;margin-bottom:22px;">ROTH&nbsp;MEDIA</div>
    <p style="font-size:17px;line-height:1.6;margin:0 0 14px;">Hi${firstName ? ` ${esc(firstName)}` : ""},</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 14px;color:#e9e1d3;">
      I hope you're loving ${galleryTitle ? `<strong>${esc(galleryTitle)}</strong>` : "your photos"}. I'm a small local business, and a Google review is the single biggest thing that helps other people find me.
    </p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#e9e1d3;">
      If you have one minute, I'd be really grateful — a sentence or two is perfect.
    </p>
    <a href="${REVIEW_URL}" style="display:inline-block;background:#b06a4f;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:bold;font-size:15px;">★ Leave a review</a>
    <p style="font-size:15px;line-height:1.7;margin:26px 0 0;color:#e9e1d3;">Thank you — Brandon</p>
  </div>
  <p style="color:#8a8378;font-size:12px;text-align:center;margin-top:14px;">Roth Media · Waverly, NY · <a href="https://rothmediaco.com" style="color:#8a8378;">rothmediaco.com</a></p>
</div></body></html>`,
  };
}

// The instant reply a lead gets the second their form lands: what happens
// next, a one-tap call picker (pre-filled), and the pay-online link.
export function leadAutoReply(sub, { category = "", canPay = false } = {}) {
  const fn = firstName(sub.name, sub.email);
  const q = new URLSearchParams();
  if (sub.name) q.set("name", sub.name);
  if (sub.email) q.set("email", sub.email);
  const call = `${CALENDLY}?${q.toString()}`;
  const pay = `https://rothmediaco.com/quote${category ? `?for=${category}` : ""}`;
  const body = [
    `Hi ${fn},`,
    `Got your note${sub.summary && sub.kind === "quote" ? ` (${sub.summary})` : ""} — thanks for reaching out. Here's exactly what happens next:`,
    `1. We hop on a 15-minute call. I ask about ${category === "business" ? "your business" : "your day"} and what a win looks like.\n2. Same day, you get a written plan and a firm price.\n3. ${category === "wedding" ? "A 30% retainer locks your date." : "Booking locks your date."}`,
    `Pick a call time with the button below — the next day or two is best. Or just reply here, or text me at 845-549-4425.`,
    canPay ? `Already know what you want? You can book and pay online right now: ${pay}` : "",
    `Talk soon,\nBrandon`,
  ].filter(Boolean).join("\n\n");
  return {
    subject: `Got it, ${fn} — here's what happens next`,
    text: `${body}\n\nPick a call time: ${call}`,
    html: wrapHtml({ body, cta: { label: "Pick a call time", href: call } }),
  };
}
