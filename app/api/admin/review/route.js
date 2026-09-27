import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { reviewRequestEmail } from "../../../../lib/studio-emails";

export const dynamic = "force-dynamic";

// POST { galleryId } → emails the gallery's client the Google review link.
export async function POST(request) {
  if (!(await isAdminRequest()))
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (!resendConfigured)
    return NextResponse.json({ error: "email isn't set up (RESEND_API_KEY)" }, { status: 503 });

  const { galleryId } = await request.json().catch(() => ({}));
  const db = supabaseAdmin();
  const { data: g } = await db
    .from("galleries")
    .select("id, title, clients(name, email)")
    .eq("id", galleryId)
    .maybeSingle();
  const to = g?.clients?.email;
  if (!to) return NextResponse.json({ error: "no client email" }, { status: 404 });

  const firstName = (g.clients.name || "").split(/\s+|&/)[0];
  try {
    await sendEmail({ to, ...reviewRequestEmail({ firstName, galleryTitle: g.title }) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
  const sentAt = new Date().toISOString();
  await db.from("galleries").update({ review_requested_at: sentAt }).eq("id", g.id);
  return NextResponse.json({ ok: true, sentAt });
}
