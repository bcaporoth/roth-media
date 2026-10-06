// Book-it-now: price a quote from lib/packages.js, then record a paid Stripe
// Checkout session as a booking (idempotent — the webhook and the /booked
// page can both call it).

import { CATEGORIES, PACKAGES, addonsFor, money } from "./packages";
import { bestDeal, dealTotal, freebie } from "./deals";
import { RETAINER_RATE } from "./payments";
import { resolveCode, rewardReferral, referralCodeFor } from "./referrals";
import { referralLink } from "./referral-rules";
import { adminConfigured, supabaseAdmin } from "./supabase-admin";
import { stripe } from "./stripe";
import { resendConfigured, sendEmail } from "./resend";
import { LEAD_ALERT_TO, LEAD_SMS_TO, leadAlertEmail } from "./studio-emails";
import { firstName } from "./client-email";

// Weddings: 50% holds the date (terms). Everything else is small enough to pay in full.
export const RETAINER_CATEGORIES = new Set(["wedding"]);

// list = full price; total = after the best deal (lib/deals.js). now = when
// the deal is judged (a paid session uses the moment it was created).
// payFull: a wedding paid in full at booking (no retainer) — earns the paid-in-full bonus.
// credit: a resolved friend code (lib/referrals.js resolveCode) — $100 off, taken last.
export function priceQuote({ category, packageId, addons = [], code = "", payFull = false, credit = null, now = Date.now() }) {
  const cat = CATEGORIES.find((c) => c.id === category);
  const pkg = cat && (PACKAGES[category] || []).find((p) => p.id === packageId);
  if (!cat || !pkg) return null;
  const wanted = new Set(Array.isArray(addons) ? addons.map(String) : []);
  const chosen = addonsFor(category, pkg).filter((a) => wanted.has(a.id) && !a.from);
  const deal = bestDeal({ category, packageId, code, now });
  // An included add-on (lib/deals.js FREEBIES) rides along whether or not they ticked it.
  const inRetainer = RETAINER_CATEGORIES.has(category);
  const free = freebie({ code, category, packageId, payFull: payFull && inRetainer, now });
  if (free && !chosen.some((a) => a.id === free.addon)) {
    const add = addonsFor(category, pkg).find((a) => a.id === free.addon && !a.from);
    if (add) chosen.push(add);
  }
  const list = pkg.price + chosen.reduce((s, a) => s + a.price, 0);
  const freeValue = free ? chosen.find((a) => a.id === free.addon)?.price || 0 : 0;
  const beforeCredit = dealTotal([pkg, ...chosen], deal, free);
  const creditAmount = credit && credit.amount > 0 ? Math.min(credit.amount, beforeCredit) : 0;
  const total = beforeCredit - creditAmount;
  // What the deal was taken off (travel, web, and ads are never discounted; nor is the free add-on).
  const dealBase = [pkg, ...chosen].filter((i) => !i.noDeal && !(free && i.id === free.addon)).reduce((s, i) => s + i.price, 0);
  const mode = inRetainer && !payFull ? "retainer" : "full";
  const dueToday = mode === "retainer" ? Math.round(total * RETAINER_RATE) : total;
  const discount = list - total;
  return {
    cat, pkg, chosen, list, dealBase,
    deal: discount - creditAmount > freeValue ? deal : null,
    free, freeValue,
    credit: creditAmount ? { ...credit, amount: creditAmount } : null,
    dealDiscount: discount - freeValue - creditAmount,
    discount, total, mode, dueToday, payFull: Boolean(payFull && inRetainer),
  };
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
  if (session.metadata?.kind === "partner") return recordPartner(db, session);
  if (session.metadata?.mode === "balance") return recordBalance(db, session);
  const { data: existing } = await db.from("bookings").select("id").eq("stripe_session_id", session.id).maybeSingle();
  if (existing) return { ok: true, id: existing.id, duplicate: true };

  const m = session.metadata || {};
  const email = String(session.customer_details?.email || session.customer_email || "").toLowerCase();
  // A friend code on this booking (checkout already priced it in).
  const pkgFor = (PACKAGES[m.category] || []).find((p) => p.id === m.package) || null;
  const resolved = m.ref_code ? await resolveCode(db, m.ref_code, { email, pkg: pkgFor }) : null;
  const q = priceQuote({ category: m.category, packageId: m.package, addons: (m.addons || "").split(",").filter(Boolean), code: m.code, payFull: m.pay_full === "1", credit: resolved, now: Number(session.created || 0) * 1000 || Date.now() });
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

  // Give $100, get $100: thank the referrer, and hand this client their own code.
  const reward = resolved ? await rewardReferral(db, { resolved, booking, referredEmail: email, referredName: name }) : null;
  const myCode = email ? await referralCodeFor(db, email) : null;
  const rewardLine = !reward ? "" :
    reward.kind === "balance" ? `${reward.referrerName || reward.referrerEmail} — $100 taken off their balance (now ${money(reward.balanceLeft)} on ${reward.package || "their booking"}). Text them a thank-you.` :
    reward.kind === "credit" ? `${reward.referrerName || reward.referrerEmail} — $100 credit for their next shoot, code ${reward.rewardCode}. Text it to them.` :
    reward.kind === "credit-used" ? `used their own $100 credit ${reward.code}` :
    reward.kind === "duplicate" ? "already rewarded for this person" : `could not record (${reward.error || "?"})`;

  // Website plan: checkout saved their card; the monthly plan starts itself.
  const monthly = Number(m.monthly || 0);
  let planNote = "";
  if (monthly > 0) {
    try { planNote = `${money(monthly)}/month, first charge in 30 days (${await startMonthlyPlan(session, monthly)})`; }
    catch (e) { planNote = `NOT started (${e.message}) — set it up in Stripe`; }
  }
  const fields = [
    ["what it's for", q?.cat.title || row.category],
    ["package", label],
    ["paid today", money(paidCents / 100)],
    ["full price", `${money(row.total_cents / 100)}${discountCents ? ` (${money(discountCents / 100)} off${promo ? ` · ${promo}` : ""})` : ""}`],
    row.mode === "retainer" ? ["balance due", `${money(Math.max(0, row.total_cents / 100 - paidCents / 100))} — 14 days before the date`] : null,
    ["name", name], ["email", email], ["phone", phone],
    ["website plan", planNote],
    resolved ? ["referred by", `${resolved.label} · code ${resolved.code} · $100 off`] : null,
    rewardLine ? ["referrer to thank", rewardLine] : null,
    myCode ? ["their friend code", `${myCode} · ${referralLink(myCode)}`] : null,
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

  // Nothing automated messages the client: Brandon's alert carries the
  // confirmation, written out, one tap to open in his own Messages / Mail.
  const fn = firstName(name, email) || "there";
  const owes = Math.max(0, row.total_cents / 100 - paidCents / 100);
  const next = row.mode === "retainer"
    ? `Your ${money(paidCents / 100)} retainer holds the date. The balance, ${money(owes)}, is due 14 days before, and I'll send you the link.`
    : `You're paid in full, ${money(paidCents / 100)}. Nothing else to do.`;
  const plan = monthly ? ` Your ${money(monthly)}/month website plan starts in 30 days; manage or cancel it anytime at rothmediaco.com/billing.` : "";
  const give = !myCode ? "" : row.category === "wedding"
    ? ` One more thing — know another bride? Send her your code ${myCode} (${referralLink(myCode, "wedding")}): she gets $100 off, and you get $100 back.`
    : row.category === "business"
    ? ` One more thing — know another owner who needs content? Send them your code ${myCode} (${referralLink(myCode, "business")}): they get $100 off, and you get $100 back.`
    : ` One more thing — give $100, get $100: anyone who books a wedding or a Content Day with your code ${myCode} (${referralLink(myCode)}) gets $100 off, and you get $100 back.`;
  const confirm = {
    subject: `You're booked: ${label}`,
    body: `Hi ${fn},\n\nYou're booked: ${label}.${row.event_date ? ` ${row.event_date}.` : ""}\n\n${next}${plan}${give}\n\nI'll call you within 24 hours to nail down the plan. Stripe emailed your receipt separately.\n\nThe short version of the fine print is at rothmediaco.com/terms. Retainers are non-refundable; one free reschedule with 30 days' notice.\n\nTalk soon,\nBrandon`,
    text: `Hey ${fn}, it's Brandon. You're officially booked: ${label}. ${next}${plan} I'll call within 24 hours to plan it out!${give}`,
  };

  if (resendConfigured) {
    try { await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail({ kind: "booking", name, email, phone, confirm, subject: `💸 Booked — ${name || email} · ${label} · ${money(paidCents / 100)}`, summary: `${label} · ${money(paidCents / 100)} paid`, fields }) }); } catch {}
    if (LEAD_SMS_TO) { try { await sendEmail({ to: LEAD_SMS_TO, subject: "Booked", text: `${name || email} booked ${label} — ${money(paidCents / 100)} paid${row.event_date ? ` · ${row.event_date}` : ""}` }); } catch {} }
  }
  return { ok: true, id: booking.id };
}

// The card from checkout pays a monthly plan (the website add-on) starting in
// 30 days. Clients manage or cancel it themselves at /billing.
async function startMonthlyPlan(session, dollars) {
  const id = (x) => (typeof x === "string" ? x : x?.id || "");
  const customer = id(session.customer);
  if (!customer) throw new Error("no Stripe customer on the payment");
  const pi = await stripe("GET", `/payment_intents/${id(session.payment_intent)}`);
  const pm = id(pi.payment_method);
  if (!pm) throw new Error("no saved card");
  const key = `website-monthly-${dollars}`;
  const found = await stripe("GET", `/prices?lookup_keys[]=${key}&active=true&limit=1`);
  const price = found.data?.[0] || (await stripe("POST", "/prices", { currency: "usd", unit_amount: dollars * 100, recurring: { interval: "month" }, lookup_key: key, product_data: { name: "Website plan" } }));
  const sub = await stripe("POST", "/subscriptions", { customer, items: [{ price: price.id }], default_payment_method: pm, trial_period_days: 30, metadata: { booking_session: session.id } });
  return sub.id;
}

// A partner paid their first month (/partner/<slug>). Their signed agreement
// is already in the inbox; this marks it active, makes the saved card the
// one later charges use (closing fees, events), and tells Brandon.
async function recordPartner(db, session) {
  const m = session.metadata || {};
  const { data: row } = await db.from("submissions").select("id, fields, utm, name, email, phone").eq("id", m.submission).maybeSingle();
  if (!row) return { ok: false, reason: "agreement not found" };
  if (row.utm?.stripe_session === session.id) return { ok: true, id: row.id, duplicate: true };
  const id = (x) => (typeof x === "string" ? x : x?.id || "");
  const customer = id(session.customer), subscription = id(session.subscription);
  try {
    const subObj = await stripe("GET", `/subscriptions/${subscription}`);
    const pm = id(subObj.default_payment_method);
    if (pm) await stripe("POST", `/customers/${customer}`, { invoice_settings: { default_payment_method: pm } });
  } catch {}
  const paid = Number(session.amount_total || 0) / 100;
  const fields = (row.fields || []).map(([k, v]) => (k === "status" ? [k, `active — paid ${money(paid)} on ${new Date().toLocaleDateString("en-US")}`] : [k, v]));
  await db.from("submissions").update({ status: "booked", fields, utm: { ...(row.utm || {}), stripe_session: session.id, stripe_customer: customer, stripe_subscription: subscription } }).eq("id", row.id);
  if (row.email) {
    try {
      const { data: c } = await db.from("clients").select("id").eq("email", row.email).maybeSingle();
      if (!c) await db.from("clients").insert({ email: row.email, name: row.name, phone: row.phone });
    } catch {}
  }
  const fn = firstName(row.name, row.email) || "there";
  const confirm = {
    subject: `You're all set, ${fn}`,
    body: `Hi ${fn},\n\nYou're officially a Roth Media partner. Thank you!\n\nWhat days work for your first shoot? Send me two or three and I'll lock one in.\n\nIf you picked ads, I'll send a partner request for your Facebook ad account. Just approve it.\n\nBrandon`,
    text: `Hey ${fn}! You're officially a Roth Media partner, thank you! What days work for your first shoot? Send me 2–3 and I'll lock one in.`,
  };
  const subject = `🤝 Partner active — ${m.business || row.name} · ${money(Number(m.monthly || 0))}/mo`;
  if (resendConfigured) {
    try { await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail({ kind: "booking", name: row.name, email: row.email, phone: row.phone, confirm, subject, summary: `Partner plan · ${money(paid)} paid today`, fields }) }); } catch {}
  }
  return { ok: true, id: row.id, partner: true };
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
