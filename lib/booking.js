// Book-it-now: price a quote from lib/packages.js, then record a paid Stripe
// Checkout session as a booking (idempotent — the webhook and the /booked
// page can both call it).

import { CATEGORIES, PACKAGES, ADDONS, money } from "./packages";
import { bestDeal, dealTotal } from "./deals";
import { RETAINER_RATE } from "./payments";
import { adminConfigured, supabaseAdmin } from "./supabase-admin";
import { resendConfigured, sendEmail } from "./resend";
import { LEAD_ALERT_TO, LEAD_SMS_TO, leadAlertEmail } from "./studio-emails";
import { wrapHtml, firstName } from "./client-email";

// Weddings: 30% holds the date (terms). Everything else is small enough to pay in full.
export const RETAINER_CATEGORIES = new Set(["wedding"]);

// list = full price; total = after the best deal (lib/deals.js). now = when
// the deal is judged (a paid session uses the moment it was created).
export function priceQuote({ category, packageId, addons = [], code = "", now = Date.now() }) {
  const cat = CATEGORIES.find((c) => c.id === category);
  const pkg = cat && (PACKAGES[category] || []).find((p) => p.id === packageId);
  if (!cat || !pkg) return null;
  const wanted = new Set(Array.isArray(addons) ? addons.map(String) : []);
  const chosen = (ADDONS[category] || []).filter((a) => wanted.has(a.id) && !pkg.includes.includes(a.id) && !a.from);
  const list = pkg.price + chosen.reduce((s, a) => s + a.price, 0);
  const deal = bestDeal({ category, packageId, code, now });
  const total = dealTotal([pkg, ...chosen], deal);
  // What the deal was taken off (travel, web, and ads are never discounted).
  const dealBase = [pkg, ...chosen].filter((i) => !i.noDeal).reduce((s, i) => s + i.price, 0);
  const mode = RETAINER_CATEGORIES.has(category) ? "retainer" : "full";
  const dueToday = mode === "retainer" ? Math.round(total * RETAINER_RATE) : total;
  return { cat, pkg, chosen, list, dealBase, deal: total < list ? deal : null, discount: list - total, total, mode, dueToday };
}

// The newest unsettled retainer for this email — the balance is whatever's
// left on it, so a deal taken on the retainer carries through.
export async function openRetainer(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!adminConfigured || !e) return null;
  const { data } = await supabaseAdmin().from("bookings").select("id, total_cents, paid_cents, package_name, promo_code").eq("email", e).eq("mode", "retainer").neq("status", "complete").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data && data.total_cents > data.paid_cents ? data : null;
}

export function bookingLabel(q) {
  return `${q.pkg.name}${q.chosen.length ? " + " + q.chosen.map((a) => a.name).join(", ") : ""}`;
}

// session: a Stripe Checkout Session (payment_status = paid).
export async function recordBooking(session) {
  if (!adminConfigured || !session || session.payment_status !== "paid") return { ok: false, reason: "unpaid" };
  const db = supabaseAdmin();
  if (session.metadata?.mode === "balance") return recordBalance(db, session);
  const { data: existing } = await db.from("bookings").select("id").eq("stripe_session_id", session.id).maybeSingle();
  if (existing) return { ok: true, id: existing.id, duplicate: true };

  const m = session.metadata || {};
  const q = priceQuote({ category: m.category, packageId: m.package, addons: (m.addons || "").split(",").filter(Boolean), code: m.code, now: Number(session.created || 0) * 1000 || Date.now() });
  const email = String(session.customer_details?.email || session.customer_email || "").toLowerCase();
  const name = String(m.name || session.customer_details?.name || "").trim();
  const phone = String(m.phone || session.customer_details?.phone || "").trim();
  const paidCents = Number(session.amount_total || 0);
  // The deal is baked into the price at checkout; total = what they owe in all.
  const totalCents = Number(m.total) > 0 ? Math.round(Number(m.total) * 100) : q ? q.total * 100 : paidCents;
  const discountCents = (Number(m.discount) || q?.discount || 0) * 100 + Number(session.total_details?.amount_discount || 0);
  const promo = String(m.deal || m.promo || "");

  const row = {
    stripe_session_id: session.id,
    payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "",
    category: m.category || "",
    package_id: m.package || "",
    package_name: q?.pkg.name || m.package || "",
    addons: q ? q.chosen.map((a) => ({ id: a.id, name: a.name, price: a.price })) : [],
    total_cents: totalCents,
    paid_cents: paidCents,
    discount_cents: discountCents,
    mode: m.mode || q?.mode || "full",
    name, email, phone,
    event_date: String(m.date || ""),
    where_text: String(m.where || ""),
    notes: [m.notes, m.intake].filter(Boolean).join("\n"),
    promo_code: promo,
    status: "paid",
  };
  const { data: booking, error } = await db.from("bookings").insert(row).select("id").single();
  if (error) return { ok: false, reason: error.message };

  // Roster: they're a client now (portal login can be set from Studio → Clients).
  if (email) {
    try {
      const { data: c } = await db.from("clients").select("id, name, phone").eq("email", email).maybeSingle();
      if (!c) await db.from("clients").insert({ email, name, phone });
      else if ((!c.name && name) || (!c.phone && phone)) await db.from("clients").update({ name: c.name || name, phone: c.phone || phone }).eq("id", c.id);
    } catch {}
  }

  const label = q ? bookingLabel(q) : row.package_name;
  const fields = [
    ["what it's for", q?.cat.title || row.category],
    ["package", label],
    ["paid today", money(paidCents / 100)],
    ["full price", `${money(row.total_cents / 100)}${discountCents ? ` (${money(discountCents / 100)} off${promo ? ` · ${promo}` : ""})` : ""}`],
    row.mode === "retainer" ? ["balance due", `${money(Math.max(0, row.total_cents / 100 - paidCents / 100))} — 14 days before the date`] : null,
    ["name", name], ["email", email], ["phone", phone],
    ["date", row.event_date], ["where", row.where_text], ["shoot details", String(m.intake || "")], ["anything else", String(m.notes || "")],
  ].filter((r) => r && String(r[1] || "").trim());

  // Studio inbox: lands as a booked lead.
  try {
    await db.from("submissions").insert({
      kind: "booking", name, email, phone,
      subject: `Booked — ${name || email} · ${label} · ${money(paidCents / 100)} paid`,
      summary: `${q?.cat.title || row.category} · ${label} · ${money(paidCents / 100)} paid`,
      fields, status: "booked", source_path: "/booked",
    });
  } catch {}

  if (resendConfigured) {
    try { await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail({ kind: "booking", name, email, phone, subject: `💸 Booked — ${name || email} · ${label} · ${money(paidCents / 100)}`, summary: `${label} · ${money(paidCents / 100)} paid`, fields }) }); } catch {}
    if (LEAD_SMS_TO) { try { await sendEmail({ to: LEAD_SMS_TO, subject: "Booked", text: `${name || email} booked ${label} — ${money(paidCents / 100)} paid${row.event_date ? ` · ${row.event_date}` : ""}` }); } catch {} }
    if (email) {
      const fn = firstName(name, email);
      const next = row.mode === "retainer"
        ? `Your ${money(paidCents / 100)} retainer holds the date. The balance — ${money(Math.max(0, row.total_cents / 100 - paidCents / 100))} — is due 14 days before, and I'll send a link for it.`
        : `You're paid in full — ${money(paidCents / 100)}. Nothing else to do.`;
      const body = `Hi ${fn},\n\nYou're booked: ${label}.${row.event_date ? ` ${row.event_date}.` : ""}\n\n${next}\n\nI'll reach out within 24 hours (usually a lot faster) to nail down the plan. Stripe emailed you a receipt separately.\n\nThe short version of the fine print is at rothmediaco.com/terms — retainers are non-refundable, one free reschedule with 30 days' notice.\n\nTalk soon,\nBrandon`;
      try { await sendEmail({ to: email, subject: `You're booked — ${label}`, text: body, html: wrapHtml({ body, cta: { label: "Read the terms", href: "https://rothmediaco.com/terms" } }) }); } catch {}
    }
  }
  return { ok: true, id: booking.id };
}

// A balance payment settles the retainer booking it belongs to. No new
// booking row; the inbox row (tagged with the Stripe session) keeps it
// from being recorded twice. Brandon is told; he tells the client himself.
async function recordBalance(db, session) {
  const { data: seen } = await db.from("submissions").select("id").eq("utm->>stripe_session", session.id).maybeSingle();
  if (seen) return { ok: true, duplicate: true };
  const m = session.metadata || {};
  const email = String(session.customer_details?.email || session.customer_email || "").toLowerCase();
  const name = String(m.name || session.customer_details?.name || "").trim();
  const paid = Number(session.amount_total || 0) / 100;
  const q = priceQuote({ category: m.category, packageId: m.package, addons: (m.addons || "").split(",").filter(Boolean) });
  const label = q ? bookingLabel(q) : m.package || "booking";

  let matched = false;
  const b = m.booking ? (await db.from("bookings").select("id, total_cents, paid_cents").eq("id", m.booking).maybeSingle()).data : await openRetainer(email);
  if (b) {
    await db.from("bookings").update({ paid_cents: b.paid_cents + Number(session.amount_total || 0), status: "complete" }).eq("id", b.id);
    matched = true;
  }
  const fields = [
    ["package", label], ["balance paid", money(paid)], ["name", name], ["email", email],
    ["matched to a retainer booking", matched ? "yes — marked paid in full" : "no — retainer wasn't paid through the site, check Stripe"],
  ];
  const subject = `Balance paid — ${name || email} · ${label} · ${money(paid)}`;
  try {
    await db.from("submissions").insert({ kind: "booking", name, email, phone: String(m.phone || ""), subject, summary: `${label} · balance ${money(paid)} paid`, fields, status: "booked", source_path: "/booked", utm: { stripe_session: session.id } });
  } catch {}
  if (resendConfigured) {
    try { await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail({ kind: "booking", name, email, phone: String(m.phone || ""), subject: `💸 ${subject}`, summary: `${label} · balance ${money(paid)} paid`, fields }) }); } catch {}
  }
  return { ok: true, balance: true, matched };
}
