import { NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, ADMIN_EMAIL } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { wrapHtml, firstName } from "../../../../lib/client-email";
import { findAuthUser } from "../../../../lib/auth-users";
import { isNoEmail } from "../../../../lib/no-email";

export const dynamic = "force-dynamic";

// "First time here / forgot password?" — the one-time code + link that lands
// on the choose-a-password page. Sent from here through Resend instead of
// Supabase's built-in mailer, which only allows a few emails an hour for the
// whole site and refuses a second one within 60 seconds (the "Couldn't send
// the email" a first-time client hit after the "it's ready" link had already
// sent one).
//
//   { known: false }   not on the roster — no account gets made for a typo
//   { recent: true }   one went out under a minute ago; nothing new is sent,
//                      so the code they already have keeps working
//   { ok: true }       sent
//   { fallback: true } Resend / service key not configured → the login
//                      screen uses Supabase's own email as before

const SITE = "https://rothmediaco.com";
const WAIT_MS = 60_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeNext = (v) => (/^\/portal(\/[\w-]+)*\/?$/.test(String(v || "")) ? String(v) : "");

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || isNoEmail(email)) return NextResponse.json({ known: false });
  if (!adminConfigured || !resendConfigured) return NextResponse.json({ fallback: true });

  const db = supabaseAdmin();
  try {
    let name = "";
    if (email !== ADMIN_EMAIL) {
      const { data: c } = await db.from("clients").select("name").eq("email", email).maybeSingle();
      if (!c) return NextResponse.json({ known: false });
      name = c.name || "";
    }

    let user = await findAuthUser(db, email);
    if (user) {
      const last = Date.parse(user.app_metadata?.setup_sent_at || "") || 0;
      if (Date.now() - last < WAIT_MS) return NextResponse.json({ recent: true });
    } else {
      // On the roster but never had a login: make it now, already confirmed.
      const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
      if (error) throw error;
      user = data.user;
    }

    // Admin generateLink sends nothing itself — it hands back the code and
    // token for us to email. A new one replaces any earlier code.
    const { data: link, error: linkErr } = await db.auth.admin.generateLink({ type: "magiclink", email });
    if (linkErr) throw linkErr;
    const code = link?.properties?.email_otp || "";
    const hash = link?.properties?.hashed_token || "";
    if (!code && !hash) throw new Error("No code came back from Supabase");

    const next = safeNext(body.next);
    const href = `${SITE}/portal?th=${encodeURIComponent(hash)}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
    const hi = `Hi ${firstName(name, email)},`;
    const how = "Type this code on the sign-in page, or tap the button — either one works. Then you choose a password, and from then on it's just your email and password.";
    const text = `${hi}\n\nYour sign-in code: ${code}\n\n${how}\n${href}\n\nDidn't ask for this? You can ignore it.\n\n— Brandon`;
    await sendEmail({
      to: email,
      subject: code ? `${code} is your Roth Media sign-in code` : "Your Roth Media sign-in link",
      text,
      html: wrapHtml({
        body: `${hi}\n\nYour sign-in code:\n\n${code}`,
        cta: { lead: how, label: "Sign in & choose a password", href },
        signoff: "Didn't ask for this? You can ignore it.\n\n— Brandon",
      }),
    });

    await db.auth.admin
      .updateUserById(user.id, { app_metadata: { ...(user.app_metadata || {}), setup_sent_at: new Date().toISOString() } })
      .catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Couldn't send the email" }, { status: 502 });
  }
}
