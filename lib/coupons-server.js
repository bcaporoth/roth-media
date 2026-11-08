// Coupons Brandon makes in Studio (Money → Coupons), 2026-11-08.
// Stored as rows in `submissions` (kind "coupon", the settings in utm) so no
// new table is needed; the Inbox and client profiles skip that kind.
//   utm = { code, label, type: "pct" | "amount", value, only: { category: [packageIds] } | null,
//           starts, ends, email (only this client), maxUses, off (paused), deleted }
// findCoupon turns one into a deal for lib/deals.js (bestDeal `extra`), so
// the quote page, the pay page and checkout price it like any other code.

import { PACKAGES, CATEGORIES } from "./packages";
import { DEALS, FREEBIES } from "./deals";
import { isFriendCode } from "./referral-rules";

export const CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,23}$/;
const RESERVED = new Set([...DEALS.map((d) => d.code), ...FREEBIES.map((f) => f.code)].filter(Boolean));

const endOfDay = (d) => (d ? `${d}T23:59:59-05:00` : "");
const startOfDay = (d) => (d ? `${d}T00:00:00-05:00` : "");
const nice = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "");

// Clean what Studio sends. Returns { coupon } or { error }.
export function cleanCoupon(b = {}) {
  const code = String(b.code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!CODE_RE.test(code)) return { error: "Codes are 3–24 letters or numbers (dashes OK), like WINTER20." };
  if (RESERVED.has(code) || isFriendCode(code)) return { error: "That code is already used by the site. Pick another." };
  const type = b.type === "amount" ? "amount" : "pct";
  const value = Math.round(Number(b.value));
  if (!(value > 0)) return { error: type === "pct" ? "Enter how many percent off (1–100)." : "Enter how many dollars off." };
  if (type === "pct" && value > 100) return { error: "Percent off can't be more than 100." };
  const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
  const starts = date(b.starts), ends = date(b.ends);
  if (starts && ends && ends < starts) return { error: "The end date is before the start date." };
  // only: { wedding: ["photo"], business: ["day", "mini"] } — empty / missing = everything.
  let only = null;
  if (b.only && typeof b.only === "object") {
    const o = {};
    for (const c of CATEGORIES) {
      const ids = (Array.isArray(b.only[c.id]) ? b.only[c.id] : []).filter((id) => (PACKAGES[c.id] || []).some((p) => p.id === id));
      if (ids.length) o[c.id] = ids;
    }
    if (Object.keys(o).length) only = o;
  }
  const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That client email doesn't look right." };
  const maxUses = Math.max(0, Math.round(Number(b.maxUses) || 0));
  const label = String(b.label || "").trim().slice(0, 60) || code;
  return { coupon: { code, label, type, value, only, starts, ends, email, maxUses, off: Boolean(b.off), deleted: false } };
}

// The deal shape lib/deals.js understands.
export function couponDeal(row) {
  const u = row.utm || {};
  return {
    id: `coupon-${row.id}`, coupon: true, code: u.code, label: u.label || u.code,
    ...(u.type === "amount" ? { amount: u.value } : { pct: u.value }),
    only: u.only || null,
    starts: startOfDay(u.starts), ends: endOfDay(u.ends), endsLabel: nice(u.ends),
  };
}

export async function listCoupons(db) {
  const { data, error } = await db.from("submissions").select("id, created_at, updated_at, utm").eq("kind", "coupon").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data || []).filter((r) => !r.utm?.deleted);
  const uses = await usesFor(db, rows.map((r) => r.utm?.code).filter(Boolean));
  return rows.map((r) => ({ id: r.id, created_at: r.created_at, ...r.utm, uses: uses[r.utm?.code] || 0 }));
}

// Paid bookings that used each code (checkout writes the code into promo_code).
async function usesFor(db, codes) {
  const out = {};
  if (!codes.length) return out;
  const { data } = await db.from("bookings").select("promo_code").not("promo_code", "is", null).then((r) => r, () => ({ data: [] }));
  for (const b of data || []) {
    const p = String(b.promo_code || "").toUpperCase();
    for (const c of codes) if (p.includes(c)) out[c] = (out[c] || 0) + 1;
  }
  return out;
}

async function rowFor(db, code) {
  const c = String(code || "").trim().toUpperCase();
  if (!c || !CODE_RE.test(c)) return null;
  const { data } = await db.from("submissions").select("id, utm").eq("kind", "coupon").eq("utm->>code", c).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data || null;
}

// A coupon that applies right now, or null. email: who is buying (a locked
// coupon only works for that client). forBooking: re-pricing a session that
// was already paid — keep honoring it even if paused or used up since.
export async function findCoupon(db, code, { email = "", forBooking = false } = {}) {
  try {
    const row = await rowFor(db, code);
    if (!row) return null;
    const u = row.utm || {};
    if (!forBooking && (u.deleted || u.off)) return null;
    if (u.email && u.email !== String(email || "").trim().toLowerCase()) return null;
    if (!forBooking && u.maxUses) {
      const uses = await usesFor(db, [u.code]);
      if ((uses[u.code] || 0) >= u.maxUses) return null;
    }
    return couponDeal(row);
  } catch {
    return null;
  }
}

export async function saveCoupon(db, id, coupon) {
  if (id) {
    const { error } = await db.from("submissions").update({ utm: coupon, summary: `Coupon ${coupon.code}`, updated_at: new Date().toISOString() }).eq("id", id).eq("kind", "coupon");
    if (error) throw new Error(error.message);
    return id;
  }
  const clash = await rowFor(db, coupon.code);
  if (clash && !clash.utm?.deleted) throw new Error(`${coupon.code} already exists.`);
  const row = { kind: "coupon", status: "archived", subject: `Coupon ${coupon.code}`, summary: `Coupon ${coupon.code}`, utm: coupon, fields: [], source_path: "/portal/admin/coupons" };
  let r = await db.from("submissions").insert({ ...row, email: null }).select("id").single();
  if (r.error) r = await db.from("submissions").insert({ ...row, email: "" }).select("id").single();
  if (r.error) throw new Error(r.error.message);
  return r.data.id;
}

export async function patchCoupon(db, id, patch) {
  const { data } = await db.from("submissions").select("utm").eq("id", id).eq("kind", "coupon").maybeSingle();
  if (!data) throw new Error("Coupon not found");
  const { error } = await db.from("submissions").update({ utm: { ...data.utm, ...patch }, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}
