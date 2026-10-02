// Studio emails: the instant new-lead alert to Brandon and the one-tap
// review request to a client. Plain inline-styled HTML (email clients).

import { CALENDLY, EMAIL, REVIEW_URL } from "./site";
import { firstName } from "./client-email";

// Where lead alerts go. LEAD_SMS_TO (optional) is a carrier email-to-text
// address, e.g. 8455494425@vtext.com (Verizon) or @txt.att.net (AT&T) —
// set it in Vercel to get a text on your phone for every new lead.
export const LEAD_ALERT_TO = process.env.LEAD_ALERT_TO || EMAIL;
export const LEAD_SMS_TO = process.env.LEAD_SMS_TO || "";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Nothing on this site messages a client on its own — Brandon sends every
// word himself. These are his steps for a lead, each with a tap-to-send link
// that opens his own Messages / Mail with the script filled in to edit.
export function leadScripts(sub) {
  const fn = firstName(sub.name, sub.email) || "there";
  const cat = sub.category || "";
  const welcome = `https://rothmediaco.com/welcome${cat ? `?for=${cat}` : ""}`;
  return {
    text: `Hey ${fn}, it's Brandon from Roth Media. Just got your note and I'd love to hear more. Got 15 minutes today or tomorrow for a quick call? Grab any time here: ${CALENDLY}`,
    emailSubject: `Got your note, ${fn} — here's what happens next`,
    emailBody: `Hi ${fn},\n\nThanks for reaching out. Here's exactly how this works:\n\n1. We hop on a 15-minute call. I ask about ${cat === "business" ? "your business" : "your day"} and what a win looks like.\n2. That same day you get a written plan and a firm price.\n3. If it's a fit, booking locks your date.\n\nPick a time that works: ${CALENDLY}\nOr reply with a good time and number and I'll call you.\n\nTalk soon,\nBrandon\nRoth Media · 845-549-4425`,
    welcomeText: `Hey ${fn}, here's what to expect working with me, start to finish: ${welcome}`,
    welcomeSubject: `Welcome to Roth Media, ${fn} — what to expect`,
    welcomeBody: `Hi ${fn},\n\nGlad you're here. This page walks through everything from today to delivery — what happens next, when you'll get your files, and what I need from you:\n\n${welcome}\n\nAny questions, text or call me at 845-549-4425.\n\nBrandon`,
  };
}

function leadSteps(sub) {
  const s = leadScripts(sub);
  const enc = encodeURIComponent;
  const link = (href, label) => `<a href="${esc(href)}" style="color:#b06a4f;font-weight:bold;">${label}</a>`;
  const sms = (body) => sub.phone && link(`sms:${sub.phone}?&body=${enc(body)}`, "Text it");
  const mail = (subject, body) => sub.email && link(`mailto:${sub.email}?subject=${enc(subject)}&body=${enc(body)}`, "Email it");
  const join = (xs) => xs.filter(Boolean).join(" &nbsp;·&nbsp; ") || "no phone or email on file";
  const steps = sub.kind === "partner_lead"
    ? [[`Now: forward it to ${sub.partnerFirst || "the partner"}'s team`, link(`mailto:?subject=${enc(`New orientation lead — ${sub.name}`)}&body=${enc(sub.forwardBody || "")}`, "Email it")],
       ["Tip: add their team's email to lib/partners.js (leadsTo) and leads go to them directly", ""]]
    : sub.kind === "booking"
    ? [...(sub.confirm ? [["Now: confirm the booking", join([sms(sub.confirm.text), mail(sub.confirm.subject, sub.confirm.body)])]] : []),
       ["Today: send the Welcome Packet", join([sms(s.welcomeText), mail(s.welcomeSubject, s.welcomeBody)])],
       ["Within 24 hours: call to lock the plan", sub.phone ? link(`tel:${sub.phone}`, "Call") : ""]]
    : [["Now (15 min): text them", join([sms(s.text)])],
       ["Right after: email what happens next", join([mail(s.emailSubject, s.emailBody)])],
       ["Before 6pm, no answer: call", sub.phone ? link(`tel:${sub.phone}`, "Call") : "no phone on file"],
       ["After they book: send the Welcome Packet", join([sms(s.welcomeText), mail(s.welcomeSubject, s.welcomeBody)])],
       ["Then mark them Contacted", link("https://rothmediaco.com/portal/admin/inbox", "Open inbox")]];
  return `<div style="background:#f4efe6;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
      <div style="font-size:11px;letter-spacing:2px;color:#8a8378;margin-bottom:8px;">YOUR STEPS — EVERY MESSAGE OPENS FOR YOU TO EDIT AND SEND</div>
      ${steps.map(([t, l], i) => `<div style="font-size:14px;color:#221f1a;padding:5px 0;">${i + 1}. ${t}${l ? ` &nbsp;→&nbsp; ${l}` : ""}</div>`).join("")}
    </div>`;
}

export function leadAlertEmail(sub) {
  const rows = (sub.fields || [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#8a8378;font-size:13px;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;font-size:14px;color:#221f1a;word-break:break-word;">${/^https:\/\/\S+$/.test(String(v)) ? `<a href="${esc(v)}" style="color:#b06a4f;font-weight:bold;">Open the link</a> <span style="color:#8a8378;font-size:12px;">(press and hold to copy, then send it yourself)</span>` : esc(v).replace(/\n/g, "<br/>")}</td></tr>`
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
    ${leadSteps(sub)}
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
