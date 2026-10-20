// The one-time code + link email that lands on the choose-a-password page.
// Used by the login screen ("First time here / forgot password?") and by
// Studio ("Email them a reset code"). Sent through Resend — not Supabase's
// built-in mailer, which only allows a few emails an hour for the whole site
// and refuses a second one within 60 seconds.
//
// Returns { ok: true, waitSeconds } when sent, or
//         { recent: true, waitSeconds, sentAt } when one went out under a
//         minute ago — nothing new is sent, so the code they already have
//         keeps working (a new code would cancel it).
// Throws if the email couldn't be made or sent.

import { sendEmail } from "./resend";
import { wrapHtml, firstName } from "./client-email";
import { findAuthUser } from "./auth-users";

const SITE = "https://rothmediaco.com";
export const SETUP_WAIT_MS = 60_000;
const safeNext = (v) => (/^\/portal(\/[\w-]+)*\/?$/.test(String(v || "")) ? String(v) : "");

export async function sendSetupCode(db, { email, name = "", next = "" }) {
  let user = await findAuthUser(db, email);
  if (user) {
    const last = Date.parse(user.app_metadata?.setup_sent_at || "") || 0;
    const left = SETUP_WAIT_MS - (Date.now() - last);
    if (left > 0) return { recent: true, waitSeconds: Math.ceil(left / 1000), sentAt: new Date(last).toISOString() };
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

  const to = safeNext(next);
  const href = `${SITE}/portal?th=${encodeURIComponent(hash)}${to ? `&next=${encodeURIComponent(to)}` : ""}`;
  const hi = `Hi ${firstName(name, email)},`;
  const how = "Type this code on the sign-in page, or tap the button — either one works. Then you choose a password, and from then on it's just your email and password.";
  const after = "The code works for about an hour. If you asked more than once, use the newest email — each new code cancels the one before it.";
  const text = `${hi}\n\nYour sign-in code: ${code}\n\n${how}\n${href}\n\n${after}\n\nDidn't ask for this? You can ignore it.\n\n— Brandon`;
  await sendEmail({
    to: email,
    subject: code ? `${code} is your Roth Media sign-in code` : "Your Roth Media sign-in link",
    text,
    html: wrapHtml({
      body: `${hi}\n\nYour sign-in code:\n\n${code}`,
      cta: { lead: how, label: "Sign in & choose a password", href },
      signoff: `${after}\n\nDidn't ask for this? You can ignore it.\n\n— Brandon`,
    }),
  });

  await db.auth.admin
    .updateUserById(user.id, { app_metadata: { ...(user.app_metadata || {}), setup_sent_at: new Date().toISOString() } })
    .catch(() => {});
  return { ok: true, waitSeconds: SETUP_WAIT_MS / 1000 };
}
