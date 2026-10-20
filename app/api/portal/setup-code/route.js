import { NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, ADMIN_EMAIL } from "../../../../lib/supabase-admin";
import { resendConfigured } from "../../../../lib/resend";
import { sendSetupCode } from "../../../../lib/setup-code";
import { isNoEmail } from "../../../../lib/no-email";

export const dynamic = "force-dynamic";

// Login screen → "First time here / forgot password?" (lib/setup-code.js
// does the work; Studio's "Email them a reset code" uses it too).
//
//   { known: false }   not on the roster — no account gets made for a typo
//   { recent: true, waitSeconds, sentAt }
//                      one went out under a minute ago; nothing new is sent,
//                      so the code they already have keeps working
//   { ok: true, waitSeconds }  sent (the screen counts down to "Send a new code")
//   { fallback: true } Resend / service key not configured → the login
//                      screen uses Supabase's own email as before

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    return NextResponse.json(await sendSetupCode(db, { email, name, next: body.next }));
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Couldn't send the email" }, { status: 502 });
  }
}
