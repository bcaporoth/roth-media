import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { welcomeEmail, revealEmail } from "../../../../lib/premiere-emails";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Public endpoint: a guest at the premiere drops name + email to unlock the
// gallery. Sends the "you're in" email now and schedules the reveal email
// for the reveal moment (or sends it immediately if already revealed).
export async function POST(request) {
  if (!adminConfigured)
    return NextResponse.json({ error: "Not available" }, { status: 503 });

  const body = await request.json().catch(() => ({}));

  // Honeypot — bots fill every field.
  if (body.website) return NextResponse.json({ ok: true });

  const token = String(body.token || "");
  const name = String(body.name || "").trim().slice(0, 80);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
  if (!/^[0-9a-f-]{36}$/.test(token) || !EMAIL_RE.test(email))
    return NextResponse.json({ error: "Enter a valid email." }, { status: 422 });

  const db = supabaseAdmin();
  const { data: gallery } = await db
    .from("galleries")
    .select("id, title, share_token, premiere_enabled, reveal_at")
    .eq("share_token", token)
    .maybeSingle();
  if (!gallery || !gallery.premiere_enabled)
    return NextResponse.json({ error: "Not available" }, { status: 404 });

  const revealed = !gallery.reveal_at || new Date(gallery.reveal_at) <= new Date();
  const watchUrl = `https://rothmediaco.com/g/${gallery.share_token}`;
  const firstName = name.split(/\s+/)[0] || "";

  // Already signed up? Don't double-email — just let them back in.
  const { data: existing } = await db
    .from("premiere_leads")
    .select("id")
    .eq("gallery_id", gallery.id)
    .eq("email", email)
    .maybeSingle();
  if (existing)
    return NextResponse.json({ ok: true, revealed, revealAt: gallery.reveal_at });

  const lead = {
    gallery_id: gallery.id,
    name,
    email,
    reveal_sent_at: null,
    scheduled_email_id: null,
  };

  // Emails are best-effort — a mail hiccup must never block a guest.
  if (resendConfigured) {
    try {
      if (revealed) {
        await sendEmail({ to: email, ...revealEmail({ firstName, galleryTitle: gallery.title, watchUrl }) });
        lead.reveal_sent_at = new Date().toISOString();
      } else {
        await sendEmail({
          to: email,
          ...welcomeEmail({ firstName, galleryTitle: gallery.title, revealAt: gallery.reveal_at, watchUrl }),
        });
        try {
          const scheduled = await sendEmail({
            to: email,
            ...revealEmail({ firstName, galleryTitle: gallery.title, watchUrl }),
            scheduledAt: new Date(gallery.reveal_at).toISOString(),
          });
          lead.scheduled_email_id = scheduled?.id || null;
          lead.reveal_sent_at = new Date(gallery.reveal_at).toISOString();
        } catch {
          // Scheduling failed — the "Send reveal email" button in Studio
          // Admin covers these leads (reveal_sent_at stays null).
        }
      }
    } catch {
      // welcome email failed; still record the lead.
    }
  }

  const { error } = await db.from("premiere_leads").insert(lead);
  if (error && error.code !== "23505")
    return NextResponse.json({ error: "Something went wrong — try again." }, { status: 500 });

  return NextResponse.json({ ok: true, revealed, revealAt: gallery.reveal_at });
}
