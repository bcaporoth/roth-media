// Give $100, get $100 — the database side. Server only (service role).
// Everything here degrades to "no referral" until supabase/referrals.sql has
// been run: a missing column or table reads as null, never as an error page.
import { REFERRAL_AMOUNT, isReferralCode, isCreditCode, referralEligible } from "./referral-rules";

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L — read it off a phone
const rand = (n) => Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
const lower = (s) => String(s || "").trim().toLowerCase();
const first = (name) => String(name || "").trim().split(/\s+/)[0] || "";

// The client's FRIEND code, made the first time it's asked for.
export async function ensureReferralCode(db, client) {
  if (!client || !client.id) return null;
  if (client.referral_code) return client.referral_code;
  const stem = first(client.name).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "YOU";
  for (let i = 0; i < 5; i++) {
    const code = `FRIEND-${stem}-${rand(4)}`;
    const { error } = await db.from("clients").update({ referral_code: code }).eq("id", client.id).is("referral_code", null);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) continue; // someone else got that 4-char tail
      return null; // column not there yet (supabase/referrals.sql)
    }
    const { data } = await db.from("clients").select("referral_code").eq("id", client.id).maybeSingle();
    return data?.referral_code || code;
  }
  return null;
}

export async function referralCodeFor(db, email) {
  try {
    const { data, error } = await db.from("clients").select("id, name, email, referral_code").eq("email", lower(email)).maybeSingle();
    if (error || !data) return null;
    return await ensureReferralCode(db, data);
  } catch {
    return null;
  }
}

// What a typed code is worth on this package for this person, or null.
//   { kind: "referral" | "credit", code, amount, label, referrerEmail?, referrerName?, referralId? }
export async function resolveCode(db, code, { email = "", pkg = null } = {}) {
  const c = String(code || "").trim().toUpperCase();
  if (!c || !referralEligible(pkg)) return null;
  try {
    if (isReferralCode(c)) {
      const { data, error } = await db.from("clients").select("id, name, email").eq("referral_code", c).maybeSingle();
      if (error || !data) return null;
      if (email && lower(data.email) === lower(email)) return null; // not on your own booking
      return { kind: "referral", code: c, amount: REFERRAL_AMOUNT, referrerEmail: lower(data.email), referrerName: data.name || "", label: `Referred by ${first(data.name) || "a friend"}` };
    }
    if (isCreditCode(c)) {
      const { data, error } = await db.from("referrals").select("id, referrer_email, used_at").eq("reward_code", c).maybeSingle();
      if (error || !data || data.used_at) return null;
      if (email && lower(data.referrer_email) !== lower(email)) return null; // their credit, not yours
      return { kind: "credit", code: c, amount: REFERRAL_AMOUNT, referralId: data.id, referrerEmail: lower(data.referrer_email), label: "Your $100 thank-you credit" };
    }
  } catch {}
  return null;
}

// A referred booking just got paid: thank the referrer. Returns what happened
// so the booking alert can say it in one line.
export async function rewardReferral(db, { resolved, booking, referredEmail, referredName }) {
  if (!resolved || !booking?.id) return null;
  const now = new Date().toISOString();
  try {
    if (resolved.kind === "credit") {
      await db.from("referrals").update({ used_at: now, used_booking_id: booking.id }).eq("id", resolved.referralId).is("used_at", null);
      return { kind: "credit-used", code: resolved.code };
    }
    const referrer = lower(resolved.referrerEmail);
    const { data: dup } = await db.from("referrals").select("id").eq("referrer_email", referrer).eq("referred_email", lower(referredEmail)).maybeSingle();
    if (dup) return { kind: "duplicate" };
    // Still paying off a wedding? $100 comes off what's left.
    const { data: open } = await db
      .from("bookings").select("id, total_cents, paid_cents, discount_cents, package_name")
      .eq("email", referrer).eq("mode", "retainer").neq("status", "complete")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    let reward = "credit";
    let rewardCode = null;
    let balanceLeft = null;
    if (open && open.total_cents - open.paid_cents >= REFERRAL_AMOUNT * 100) {
      const { error } = await db.from("bookings").update({ total_cents: open.total_cents - REFERRAL_AMOUNT * 100, discount_cents: Number(open.discount_cents || 0) + REFERRAL_AMOUNT * 100 }).eq("id", open.id);
      if (!error) { reward = "balance"; balanceLeft = (open.total_cents - REFERRAL_AMOUNT * 100 - open.paid_cents) / 100; }
    }
    if (reward === "credit") rewardCode = `THANKS-${rand(5)}`;
    const { error } = await db.from("referrals").insert({
      code: resolved.code, referrer_email: referrer, referrer_name: resolved.referrerName || "",
      referred_email: lower(referredEmail), referred_name: referredName || "", booking_id: booking.id,
      amount_cents: REFERRAL_AMOUNT * 100, reward, reward_code: rewardCode,
    });
    if (error) return { kind: "error", error: error.message };
    return { kind: reward, rewardCode, balanceLeft, referrerEmail: referrer, referrerName: resolved.referrerName || "", package: open?.package_name || "" };
  } catch (e) {
    return { kind: "error", error: e.message };
  }
}

// For Studio: the log, newest first (optionally one person's, either side).
export async function listReferrals(db, { email = "", limit = 200 } = {}) {
  try {
    let q = db.from("referrals").select("id, created_at, code, referrer_email, referrer_name, referred_email, referred_name, booking_id, amount_cents, reward, reward_code, used_at").order("created_at", { ascending: false }).limit(limit);
    if (email) q = q.or(`referrer_email.eq.${lower(email)},referred_email.eq.${lower(email)}`);
    const { data, error } = await q;
    return error ? { ready: false, rows: [] } : { ready: true, rows: data || [] };
  } catch {
    return { ready: false, rows: [] };
  }
}
