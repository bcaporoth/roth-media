// Monthly content (the retainer) — server side. One content_months row per
// business client per month: the lineup (plan items with a status each),
// a price, a Stripe pay link, and the shoot day made from it.

import { cleanItem, cleanPlan, STATUS_LABEL } from "./content-plan";
import { scriptFromPlanItem, cleanScriptPatch } from "./scripts";
import { draftPlan } from "./content-plan-server";
import { stripe, stripeConfigured } from "./stripe";

const SITE = "https://rothmediaco.com";
export const monthKey = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit" }).format(d).slice(0, 7);
export const isMonth = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ""));
export const monthLabel = (m) => (isMonth(m) ? new Date(m + "-15T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "");
export const shiftMonth = (m, by) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo - 1 + by, 15)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
const missing = (e) => /content_months/.test(e?.message || "");

export const cleanItems = (items) => (Array.isArray(items) ? items : []).slice(0, 40).map(cleanItem).map((it) => ({ ...it, status: STATUS_LABEL[it.status] ? it.status : "planned" }));

export async function listMonths(db, clientId) {
  const { data, error } = await db.from("content_months").select("*").eq("client_id", clientId).order("month", { ascending: false });
  if (error) { if (missing(error)) return null; throw new Error(error.message); }
  return (data || []).map(view);
}

export async function getMonth(db, clientId, month) {
  const { data, error } = await db.from("content_months").select("*").eq("client_id", clientId).eq("month", month).maybeSingle();
  if (error) { if (missing(error)) return null; throw new Error(error.message); }
  return data ? view(data) : null;
}

export async function ensureMonth(db, clientId, month) {
  const cur = await getMonth(db, clientId, month);
  if (cur) return cur;
  const { data, error } = await db.from("content_months").insert({ client_id: clientId, month }).select("*").single();
  if (error) throw new Error(missing(error) ? "Run supabase/content-months.sql once in the Supabase SQL editor first." : error.message);
  return view(data);
}

function view(row) {
  const items = cleanItems(row.items);
  const done = items.filter((it) => it.status === "delivered" || it.status === "posted").length;
  return { ...row, items, done, total: items.length, label: monthLabel(row.month) };
}

// What the portal shows: the published month(s), newest first, no notes.
export async function publishedMonths(db, clientId, limit = 3) {
  const { data, error } = await db.from("content_months").select("id, month, items, intro, price_cents, published_at, pay_url, paid_at, paid_cents, day_id").eq("client_id", clientId).not("published_at", "is", null).order("month", { ascending: false }).limit(limit);
  if (error) return [];
  return (data || []).map(view);
}

export async function saveMonth(db, id, patch) {
  const out = { updated_at: new Date().toISOString() };
  if (patch.items !== undefined) out.items = cleanItems(patch.items);
  if (patch.intro !== undefined) out.intro = String(patch.intro || "").slice(0, 800);
  if (patch.notes !== undefined) out.notes = String(patch.notes || "").slice(0, 4000);
  if (patch.price_cents !== undefined) out.price_cents = Math.max(0, Math.min(5000000, Math.round(Number(patch.price_cents) || 0)));
  if (patch.published !== undefined) out.published_at = patch.published ? new Date().toISOString() : null;
  if (patch.paid !== undefined) { out.paid_at = patch.paid ? new Date().toISOString() : null; if (!patch.paid) out.paid_cents = 0; }
  const { data, error } = await db.from("content_months").update(out).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return view(data);
}

// Claude drafts the month's lineup from the client's brand, brief and the direction.
export async function draftMonth(db, { client, month, direction, counts, previous }) {
  const { data: palette } = await db.from("brand_palettes").select("data, brandon_notes").eq("client_id", client.id).maybeSingle();
  const prev = (previous || []).map((it) => `- ${it.kind}: ${it.title}`).join("\n");
  const dir = [`This is the lineup for ${monthLabel(month)} — tie "when" to that month.`, prev ? `Already made in earlier months (don't repeat, build on them):\n${prev}` : "", String(direction || "").trim()].filter(Boolean).join("\n\n");
  const { plan } = await draftPlan(db, { client, palette, direction: dir, counts, free: false });
  return cleanPlan(plan);
}

// A shoot day from this month's lineup: one script per piece, title from
// the month. Reused if one was already made.
export async function dayFromMonth(db, row, client) {
  if (row.day_id) {
    const { data } = await db.from("shoot_days").select("id").eq("id", row.day_id).maybeSingle();
    if (data) return { id: data.id, reused: true };
  }
  const { data: day, error } = await db.from("shoot_days").insert({ client_id: client.id, title: `Content day — ${monthLabel(row.month)}`, start_time: "09:00" }).select("id").single();
  if (error) throw new Error(/shoot_days/.test(error.message) ? "Run supabase/shoot-days.sql once first." : error.message);
  const rows = row.items.filter((it) => it.status === "planned" || it.status === "filmed").map((it, position) => ({ day_id: day.id, client_id: client.id, position, ...cleanScriptPatch(scriptFromPlanItem(it)), created_by: "brandon", updated_by: "brandon" }));
  if (rows.length) { const { error: e2 } = await db.from("scripts").insert(rows); if (e2) throw new Error(e2.message); }
  await db.from("content_months").update({ day_id: day.id, updated_at: new Date().toISOString() }).eq("id", row.id);
  return { id: day.id, reused: false, scripts: rows.length };
}

// A Stripe Checkout link for this month. Brandon sends it himself (or the
// portal shows it); the webhook marks the month paid.
export async function payLinkForMonth(db, row, client) {
  if (!stripeConfigured) throw new Error("Stripe isn't set up on this server.");
  if (!(row.price_cents >= 100)) throw new Error("Set a price first (at least $1).");
  const email = client.email && !/@no-email\.rothmediaco\.invalid$/.test(client.email) ? client.email : undefined;
  const session = await stripe("POST", "/checkout/sessions", {
    mode: "payment",
    ...(email ? { customer_email: email } : {}),
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": row.price_cents,
    "line_items[0][price_data][product_data][name]": `Content — ${monthLabel(row.month)} — ${client.name || ""}`.slice(0, 120),
    "line_items[0][price_data][product_data][description]": (row.items.map((it) => it.title).filter(Boolean).join(" · ") || "Monthly content").slice(0, 300),
    "metadata[kind]": "month",
    "metadata[month_id]": row.id,
    "metadata[client_id]": client.id,
    "metadata[month]": row.month,
    success_url: `${SITE}/portal?paid=1`,
    cancel_url: `${SITE}/portal`,
  });
  const { data, error } = await db.from("content_months").update({ stripe_session_id: session.id, pay_url: session.url || "", updated_at: new Date().toISOString() }).eq("id", row.id).select("*").single();
  if (error) throw new Error(error.message);
  return view(data);
}

// Ask Stripe whether the link got paid (covers a missed webhook).
export async function refreshPaid(db, row) {
  if (!stripeConfigured || !row.stripe_session_id || row.paid_at) return row;
  try {
    const s = await stripe("GET", `/checkout/sessions/${row.stripe_session_id}`);
    if (s.payment_status === "paid") {
      const { data } = await db.from("content_months").update({ paid_at: new Date().toISOString(), paid_cents: Number(s.amount_total || 0), updated_at: new Date().toISOString() }).eq("id", row.id).select("*").single();
      if (data) return view(data);
    }
  } catch {}
  return row;
}
