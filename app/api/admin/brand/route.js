import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin, ADMIN_EMAIL } from "../../../../lib/supabase-admin";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { isNoEmail } from "../../../../lib/no-email";
import { brandAction, ensureBrand } from "../../../../lib/brand-server";
import { brandInviteEmail, brandLink } from "../../../../lib/brand-email";
import { SECTION_BY_KEY } from "../../../../lib/brand";
import { findAuthUser, canSignIn } from "../../../../lib/auth-users";

export const dynamic = "force-dynamic";

const bad = (error, status = 422) => NextResponse.json({ error }, { status });

// Can they sign in with a password already? (A login with none still gets the setup link.)
async function hasLogin(db, email) {
  return canSignIn(await findAuthUser(db, email).catch(() => null));
}

// Studio → Clients → profile → Brand. Everything the client can do, plus:
//   ensure — open a palette for them (prefilled from their brief)
//   invite — "Send brand palette" email (opens the palette first if needed)
//   notes  — Brandon's own note on a section (never shown to the client)
export async function POST(request) {
  if (!(await isAdminRequest())) return bad("Not authorized", 403);
  const body = await request.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/.test(String(body.clientId || ""))) return bad("Bad client");
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, name, email, phone").eq("id", body.clientId).maybeSingle();
  if (!client) return bad("Client not found", 404);

  try {
    if (body.action === "ensure") {
      const r = await ensureBrand(db, client);
      const email = String(client.email || "").toLowerCase();
      const link = brandLink({ email: isNoEmail(email) ? "" : email, hasLogin: isNoEmail(email) || (await hasLogin(db, email)) });
      return NextResponse.json({ ok: true, ...r, link });
    }

    if (body.action === "invite") {
      const email = String(client.email || "").toLowerCase();
      if (isNoEmail(email)) return bad("This client has no email yet — copy the link and text it instead.");
      if (!resendConfigured) return bad("Email isn't set up on this server (RESEND_API_KEY).", 500);
      await ensureBrand(db, client);
      const note = String(body.note || "").trim().slice(0, 600);
      const mail = brandInviteEmail({ name: client.name, email, hasLogin: await hasLogin(db, email), note });
      await sendEmail({ to: email, cc: [ADMIN_EMAIL], subject: mail.subject, text: mail.text, html: mail.html });
      const invited_at = new Date().toISOString();
      await db.from("brand_palettes").update({ invited_at }).eq("client_id", client.id);
      return NextResponse.json({ ok: true, invited_at });
    }

    if (body.action === "notes") {
      if (!SECTION_BY_KEY[body.section]) return bad("Unknown section");
      const { data: row, error } = await db.from("brand_palettes").select("brandon_notes").eq("client_id", client.id).maybeSingle();
      if (error || !row) return bad("No brand palette yet", 404);
      const notes = { ...(row.brandon_notes || {}), [body.section]: String(body.text || "").slice(0, 4000) };
      const { error: upErr } = await db.from("brand_palettes").update({ brandon_notes: notes }).eq("client_id", client.id);
      if (upErr) return bad(upErr.message, 500);
      return NextResponse.json({ ok: true });
    }

    const r = await brandAction(db, client.id, body, "brandon");
    return NextResponse.json(r, { status: r.status || 200 });
  } catch (err) {
    return bad(err.message || "Something went wrong", 500);
  }
}
