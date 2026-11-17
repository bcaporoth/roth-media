// Walk-ins (2026-11-17). Brandon walks into a local business, shoots a short
// video, and shows a QR from Studio → More → Walk-in. The owner scans it,
// taps "Claim my free gallery" on /walkin, and lands signed in on their portal home
// with a gallery waiting and two gift cards: one for them, one to pass on.
//
// No table change. One `submissions` row per walk-in:
//   kind "walkin", utm = { type: "business", business, galleryId,
//                          gift: { amount, usedAt, quote } }
// The friend's card is the client's ordinary FRIEND code (lib/referrals.js).
// Money comes off a custom quote as `quote.credit` (lib/quotes.js); Brandon
// switches it on in Studio → Money → Quotes. Server only.

import crypto from "node:crypto";
import { REFERRAL_AMOUNT, isReferralCode } from "./referral-rules";

export const WALKIN_GIFT = REFERRAL_AMOUNT; // dollars — "$100, like referrals" (Brandon, 2026-11-17)
export const WALKIN_PATH = "/walkin";
export const FRIEND_FIELD = "friend code"; // the label BusinessAsk files a ?ref= code under

const lower = (s) => String(s || "").trim().toLowerCase();
const first = (name) => String(name || "").trim().split(/\s+/)[0] || "";
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const rand = (n) => Array.from({ length: n }, () => ALPHA[crypto.randomInt(ALPHA.length)]).join("");

// The key in the QR link. Not a login — it only keeps the sign-up page from
// being used by anyone who hasn't been handed the QR by Brandon.
export function walkinKey() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update("walkin-v1").digest("base64url").slice(0, 10);
}
export const walkinKeyOk = (k) => {
  const want = walkinKey();
  return Boolean(want) && String(k || "") === want;
};
export const walkinUrl = (site = "https://rothmediaco.com") => `${site}${WALKIN_PATH}?k=${walkinKey()}`;

export const giftLink = (code, site = "https://rothmediaco.com") => `${site}/gift/${encodeURIComponent(String(code || "").trim().toUpperCase())}`;

// Who is behind a gift link (/gift/<their FRIEND code>), or null.
export async function giftGiver(db, code) {
  const c = String(code || "").trim().toUpperCase();
  if (!isReferralCode(c)) return null;
  try {
    const { data } = await db.from("clients").select("id, name, email").eq("referral_code", c).maybeSingle();
    if (!data) return null;
    const w = await loadWalkin(db, data.email);
    let business = w?.utm?.business || "";
    if (!business) {
      const { data: p } = await db.from("brand_palettes").select("data").eq("client_id", data.id).maybeSingle();
      business = p?.data?.business?.name || "";
    }
    return { code: c, email: lower(data.email), name: data.name || "", first: first(data.name) || "A friend", business: business === data.name ? "" : business };
  } catch {
    return null;
  }
}

export async function loadWalkin(db, email) {
  try {
    const { data } = await db.from("submissions").select("id, created_at, name, utm").eq("kind", "walkin").eq("email", lower(email)).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

// Money this person can take off a quote right now. One per quote.
//   gift      their walk-in gift card, not spent yet
//   thanks    a THANKS credit they earned by sending a friend
//   referral  they came in through a friend's link (the friend gets $100 too)
export async function creditsFor(db, email) {
  const who = lower(email);
  const out = [];
  if (!who) return out;
  const w = await loadWalkin(db, who);
  // A card that was passed on by a friend is a referral: the friend earns $100 when it's spent.
  const g = w?.utm?.gift;
  if (g?.amount > 0 && !g.usedAt) {
    out.push(g.from
      ? { kind: "referral", amount: Number(g.amount), label: `Gift card from ${g.fromName || "a friend"}`, code: g.from }
      : { kind: "gift", amount: Number(g.amount), label: "Walk-in gift card", code: "" });
  }
  try {
    const { data } = await db.from("referrals").select("reward_code, amount_cents").eq("referrer_email", who).not("reward_code", "is", null).is("used_at", null);
    for (const r of data || []) out.push({ kind: "thanks", amount: Math.round(Number(r.amount_cents || 0) / 100) || REFERRAL_AMOUNT, label: "Thank-you credit", code: r.reward_code });
  } catch {}
  try {
    const { data: subs } = await db.from("submissions").select("fields").eq("email", who).eq("kind", "quote").order("created_at", { ascending: false }).limit(10);
    const code = (subs || []).flatMap((s) => (Array.isArray(s.fields) ? s.fields : [])).filter(([k]) => String(k).toLowerCase() === FRIEND_FIELD).map(([, v]) => String(v || "").trim().toUpperCase()).find(isReferralCode);
    if (code) {
      const { data: ref } = await db.from("clients").select("name, email").eq("referral_code", code).maybeSingle();
      if (ref && lower(ref.email) !== who) {
        const { data: dup } = await db.from("referrals").select("id").eq("referrer_email", lower(ref.email)).eq("referred_email", who).maybeSingle();
        if (!dup && !out.some((c) => c.code === code)) out.push({ kind: "referral", amount: REFERRAL_AMOUNT, label: `Sent by ${first(ref.name) || "a friend"}`, code });
      }
    }
  } catch {}
  return out;
}

// A quote with a credit on it just got paid: spend the credit, and thank the
// referrer when there is one. Returns lines for Brandon's alert.
export async function settleQuoteCredit(db, q) {
  const c = q?.credit;
  if (!c || !(c.amount > 0)) return [];
  const now = new Date().toISOString();
  const lines = [["taken off", `$${c.amount} · ${c.label}`]];
  try {
    if (c.kind === "gift") {
      const w = await loadWalkin(db, q.email);
      if (w) await db.from("submissions").update({ utm: { ...w.utm, gift: { ...(w.utm.gift || {}), usedAt: now, quote: q.id } }, updated_at: now }).eq("id", w.id);
    } else if (c.kind === "thanks" && c.code) {
      await db.from("referrals").update({ used_at: now }).eq("reward_code", c.code).is("used_at", null);
    } else if (c.kind === "referral" && c.code) {
      // The card a friend passed on is spent now too.
      const w = await loadWalkin(db, q.email);
      if (w?.utm?.gift?.from === c.code && !w.utm.gift.usedAt) await db.from("submissions").update({ utm: { ...w.utm, gift: { ...w.utm.gift, usedAt: now, quote: q.id } }, updated_at: now }).eq("id", w.id);
      const { data: ref } = await db.from("clients").select("name, email").eq("referral_code", c.code).maybeSingle();
      if (ref && lower(ref.email) !== lower(q.email)) {
        const { data: dup } = await db.from("referrals").select("id").eq("referrer_email", lower(ref.email)).eq("referred_email", lower(q.email)).maybeSingle();
        if (!dup) {
          const rewardCode = `THANKS-${rand(5)}`;
          const { error } = await db.from("referrals").insert({
            code: c.code, referrer_email: lower(ref.email), referrer_name: ref.name || "",
            referred_email: lower(q.email), referred_name: q.name || "",
            amount_cents: REFERRAL_AMOUNT * 100, reward: "credit", reward_code: rewardCode,
          });
          if (!error) lines.push(["referrer to thank", `${ref.name || ref.email} earned a $${REFERRAL_AMOUNT} credit (${rewardCode}). It shows on their next quote in Studio.`]);
        }
      }
    }
  } catch {}
  return lines;
}
