// Server side of quote-first business work (lib/quotes.js has the math).
// Stored as rows in `submissions`, like coupons — no table change:
//   kind "quote_settings": one row, utm = { rate, blocks }
//   kind "quote_offer":    one per quote, utm = the quote (token, options…)
// Both kinds are kept out of the Inbox lists.

import crypto from "node:crypto";
import { DEFAULT_BLOCKS, DEFAULT_RATE, cleanLine, cleanOption, optionTotals, quoteTotals, money } from "./quotes";

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

export async function getQuoteSettings(db) {
  const { data } = await db.from("submissions").select("id, utm").eq("kind", "quote_settings").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const saved = data?.utm || {};
  const rate = Number(saved.rate) > 0 ? Number(saved.rate) : DEFAULT_RATE;
  // Saved blocks win; any new default block Brandon hasn't seen yet is added on.
  const mine = Array.isArray(saved.blocks) ? saved.blocks : [];
  const ids = new Set(mine.map((b) => b.id));
  const blocks = [...mine, ...DEFAULT_BLOCKS.filter((b) => !ids.has(b.id) && !(saved.removed || []).includes(b.id))];
  return { id: data?.id || null, rate, blocks };
}

export function cleanBlock(b = {}) {
  const l = cleanLine({ ...b, qty: 1 });
  const id = clip(b.id, 40).replace(/[^a-z0-9-]/gi, "") || `b${crypto.randomBytes(3).toString("hex")}`;
  return { id, name: l.name, unit: clip(b.unit, 30) || "each", shoot: l.shoot, edit: l.edit, flat: l.flat, note: clip(b.note, 120) };
}

export async function saveQuoteSettings(db, { rate, blocks, removed }) {
  const r = Number(rate);
  if (!(r >= 25 && r <= 1000)) throw new Error("Hourly rate should be between $25 and $1,000");
  const utm = { rate: Math.round(r), blocks: (Array.isArray(blocks) ? blocks : []).slice(0, 60).map(cleanBlock), removed: (Array.isArray(removed) ? removed : []).map((x) => clip(x, 40)).slice(0, 60) };
  const cur = await getQuoteSettings(db);
  if (cur.id) {
    const { error } = await db.from("submissions").update({ utm, updated_at: new Date().toISOString() }).eq("id", cur.id).eq("kind", "quote_settings");
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("submissions").insert({ kind: "quote_settings", status: "archived", subject: "Quote settings", summary: "Quote settings", utm, fields: [], source_path: "/portal/admin/quotes" });
    if (error) throw new Error(error.message);
  }
  return getQuoteSettings(db);
}

// A quote as Brandon builds it → what gets stored. Totals are recomputed
// from the lines every time they're shown or paid; never trusted from the browser.
export function cleanQuote(q = {}) {
  const options = (Array.isArray(q.options) ? q.options : []).slice(0, 3).map(cleanOption).filter((o) => o.lines.length);
  const rate = Number(q.rate) >= 25 && Number(q.rate) <= 1000 ? Math.round(Number(q.rate)) : DEFAULT_RATE;
  const pick = Math.min(Math.max(0, Number(q.recommended) || 0), Math.max(0, options.length - 1));
  return {
    name: clip(q.name, 120),
    email: clip(q.email, 160).toLowerCase(),
    phone: clip(q.phone, 40),
    business: clip(q.business, 160),
    when: clip(q.when, 120),
    note: clip(q.note, 1200),
    rate,
    recommended: options.length > 1 ? pick : 0,
    options,
    from: /^[0-9a-f-]{36}$/.test(String(q.from || "")) ? q.from : "",
  };
}

export function quoteProblem(q) {
  if (!q.name) return "Add the client's name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email)) return "Add the client's email (the receipt goes there)";
  if (!q.options.length) return "Add at least one thing to an option";
  for (const o of q.options) {
    const t = optionTotals(o, q.rate).total;
    if (t < 1) return `"${o.label}" comes to $0 — give it hours or a price`;
    if (t > 20000) return `"${o.label}" is over $20,000 — check the numbers`;
    if (q.credit && t - q.credit.amount < 5) return `"${o.label}" is ${money(t)}, too small to take ${money(q.credit.amount)} off — add to it or leave the credit off`;
  }
  return "";
}

const fromRow = (row) => ({ id: row.id, createdAt: row.created_at, ...(row.utm || {}) });

export async function listQuotes(db) {
  const { data, error } = await db.from("submissions").select("id, created_at, utm").eq("kind", "quote_offer").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data || []).map(fromRow).filter((q) => q.status !== "deleted");
}

export async function getQuoteByToken(db, token) {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(String(token || ""))) return null;
  const { data } = await db.from("submissions").select("id, created_at, utm").eq("kind", "quote_offer").eq("utm->>token", token).maybeSingle();
  return data ? fromRow(data) : null;
}

export async function getQuote(db, id) {
  const { data } = await db.from("submissions").select("id, created_at, utm").eq("kind", "quote_offer").eq("id", id).maybeSingle();
  return data ? fromRow(data) : null;
}

export async function createQuote(db, quote) {
  const utm = { ...quote, token: crypto.randomBytes(9).toString("base64url"), status: "sent", sentAt: new Date().toISOString() };
  const top = quote.options[quote.recommended] || quote.options[0];
  const { data, error } = await db.from("submissions").insert({
    kind: "quote_offer", status: "archived",
    name: quote.name, email: quote.email, phone: quote.phone,
    subject: `Quote — ${quote.business || quote.name}`,
    summary: `${quote.options.length} option${quote.options.length === 1 ? "" : "s"} · ${quote.options.map((o) => money(quoteTotals(o, quote).total)).join(" / ")} · ${top.label}${quote.credit ? ` · ${money(quote.credit.amount)} off (${quote.credit.label})` : ""}`,
    utm, fields: [], source_path: "/portal/admin/quotes",
  }).select("id, created_at, utm").single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

// Merge a patch into a stored quote (status changes, viewed, accepted…).
export async function patchQuote(db, id, patch) {
  const cur = await getQuote(db, id);
  if (!cur) throw new Error("That quote is gone");
  const { id: _i, createdAt: _c, ...utm } = cur;
  const next = { ...utm, ...patch };
  const { error } = await db.from("submissions").update({ utm: next, updated_at: new Date().toISOString() }).eq("id", id).eq("kind", "quote_offer");
  if (error) throw new Error(error.message);
  return { id, createdAt: cur.createdAt, ...next };
}
