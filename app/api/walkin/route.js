import { NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../lib/resend";
import { LEAD_ALERT_TO, leadAlertEmail } from "../../../lib/studio-emails";
import { findAuthUser } from "../../../lib/auth-users";
import { sendSetupCode } from "../../../lib/setup-code";
import { ensureBrand } from "../../../lib/brand-server";
import { ensureReferralCode } from "../../../lib/referrals";
import { isNoEmail } from "../../../lib/no-email";
import { clip } from "../../../lib/visitor";
import { WALKIN_GIFT, loadWalkin, walkinKeyOk } from "../../../lib/walkin";

export const dynamic = "force-dynamic";
const bad = (error, status = 422) => NextResponse.json({ error }, { status });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// /walkin → "I walked in" (lib/walkin.js). Makes their client record, their
// business home, an empty gallery for Brandon to upload into, and the walk-in
// row that carries their gift card.
//
//   { go }    a brand-new email: a one-time sign-in link, so they land in
//             their portal with nothing to type
//   { sent }  an email we already know: the usual sign-in code is emailed
//             instead, so typing someone else's email never opens their account
export async function POST(request) {
  if (!adminConfigured) return bad("This isn't switched on yet. Text Brandon at 845-549-4425.", 503);
  const b = await request.json().catch(() => ({}));
  if (b.website) return bad("Bad request", 400);
  if (!walkinKeyOk(b.k)) return bad("This page opens from Brandon's QR code. Ask him to show it again.", 403);

  const name = clip(b.name, 120).trim();
  const business = clip(b.business, 160).trim();
  const phone = clip(b.phone, 40).trim();
  const email = String(b.email || "").trim().toLowerCase();
  if (!name) return bad("Add your name");
  if (!business) return bad("Add your business name");
  if (!EMAIL_RE.test(email) || isNoEmail(email) || email === ADMIN_EMAIL) return bad("Add your email. It is how you sign in.");

  const db = supabaseAdmin();
  try {
    let { data: client } = await db.from("clients").select("id, name, email, phone, referral_code").eq("email", email).maybeSingle();
    const authUser = await findAuthUser(db, email);
    const isNew = !client && !authUser;

    if (!client) {
      const ins = await db.from("clients").insert({ email, name, ...(phone ? { phone } : {}) }).select("id, name, email, phone, referral_code").single();
      if (ins.error) throw new Error(ins.error.message);
      client = ins.data;
    } else {
      // Never overwrite what Brandon typed; only fill blanks.
      const patch = {};
      if (!String(client.name || "").trim()) patch.name = name;
      if (phone && !String(client.phone || "").trim()) patch.phone = phone;
      if (Object.keys(patch).length) { await db.from("clients").update(patch).eq("id", client.id); client = { ...client, ...patch }; }
    }

    // The business home (their brand page) — named for the business.
    await ensureBrand(db, { id: client.id, name: business, email, phone }).catch(() => {});
    await ensureReferralCode(db, client).catch(() => {});

    // First scan only: the walk-in row, the gallery, and a heads-up to Brandon.
    if (!(await loadWalkin(db, email))) {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      const { data: g } = await db.from("galleries").insert({ client_id: client.id, title: business, event_date: today }).select("id").single();
      const fields = [["name", name], ["business", business], ["email", email], ["phone", phone], ["gift card", `$${WALKIN_GIFT}, not used yet`]].filter(([, v]) => v);
      const row = {
        kind: "walkin", status: "new", name, email, ...(phone ? { phone } : {}),
        subject: `Walk-in — ${name} · ${business}`,
        summary: `Scanned your walk-in QR · ${business}`,
        fields, source_path: "/walkin",
        utm: { type: "business", business, galleryId: g?.id || null, gift: { amount: WALKIN_GIFT, usedAt: null } },
      };
      const { error } = await db.from("submissions").insert(row);
      if (error) throw new Error(error.message);
      if (resendConfigured) {
        try { await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail({ kind: "walk-in", name, email, phone, subject: `New walk-in — ${name} · ${business}`, summary: "Scanned your walk-in QR. Their gallery is ready for your upload.", fields }) }); } catch {}
      }
    }

    if (isNew) {
      const made = await db.auth.admin.createUser({ email, email_confirm: true });
      if (made.error) throw made.error;
      const { data: link, error: linkErr } = await db.auth.admin.generateLink({ type: "magiclink", email });
      if (linkErr) throw linkErr;
      const hash = link?.properties?.hashed_token || "";
      if (hash) return NextResponse.json({ ok: true, go: `/auth/confirm?type=magiclink&token_hash=${encodeURIComponent(hash)}` });
    }
    if (!resendConfigured) return NextResponse.json({ ok: true, signin: true });
    const r = await sendSetupCode(db, { email, name: client.name || name, next: "/portal" });
    return NextResponse.json({ ok: true, sent: true, recent: Boolean(r.recent) });
  } catch (err) {
    return bad(err?.message || "That didn't work. Text Brandon at 845-549-4425.", 500);
  }
}
