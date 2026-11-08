import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { TYPES, TYPE_LABEL, WELCOME, WELCOME_PICK } from "../../../../lib/intake";
import { clip } from "../../../../lib/visitor";
import { resendConfigured, sendEmail } from "../../../../lib/resend";
import { LEAD_ALERT_TO, leadAlertEmail } from "../../../../lib/studio-emails";
import { ensureBrand } from "../../../../lib/brand-server";

export const dynamic = "force-dynamic";

// Step 1 of the portal brief: the welcome form (who they are, what they want,
// what's been hard, which services). One row per client, kind "welcome" — an
// edit updates it. Studio shows it as their Initial inquiry and in the Inbox;
// the first save also emails Brandon the same alert a new lead gets.
export async function POST(request) {
  if (!portalConfigured || !adminConfigured) return NextResponse.json({ error: "Not set up" }, { status: 503 });
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const email = user.email.toLowerCase();

  const body = await request.json().catch(() => ({}));
  const services = TYPES.map((t) => t.id).filter((id) => (Array.isArray(body.services) ? body.services : []).includes(id));
  if (!services.length) return NextResponse.json({ error: "Pick at least one thing you're interested in" }, { status: 422 });
  const name = clip(body.name, 120).trim();
  if (!name) return NextResponse.json({ error: "Add your full name" }, { status: 422 });
  const phone = clip(body.phone, 40).trim();
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const labels = services.map((t) => TYPE_LABEL[t]);
  const fields = [
    [WELCOME_PICK, labels.join(", ")],
    ...WELCOME.map((it) => [it.q, clip(answers[it.q] || "", 4000).trim()]).filter(([, v]) => v),
  ];

  const db = supabaseAdmin();
  const { data: cur } = await db.from("submissions").select("id").eq("kind", "welcome").eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const row = {
    kind: "welcome", email, name, fields, utm: { services },
    ...(phone ? { phone } : {}),
    subject: `New sign-up — ${name}`,
    summary: `Welcome form · ${labels.join(" + ")}`,
    updated_at: new Date().toISOString(),
  };
  const q = cur
    ? db.from("submissions").update(row).eq("id", cur.id)
    : db.from("submissions").insert({ ...row, status: "new", source_path: "/portal/brief" });
  const { data, error } = await q.select("id, updated_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Their client record: fill in the name and phone if Brandon hasn't yet
  // (never overwrite what he typed). Make the record if it's somehow missing.
  const { data: c } = await db.from("clients").select("id, name, phone").eq("email", email).maybeSingle();
  if (!c) await db.from("clients").insert({ email, name, ...(phone ? { phone } : {}) });
  else {
    const patch = {};
    if (!String(c.name || "").trim()) patch.name = name;
    if (phone && !String(c.phone || "").trim()) patch.phone = phone;
    if (Object.keys(patch).length) await db.from("clients").update(patch).eq("id", c.id);
  }

  // Business clients get their brand page (business basics, the Pinned Three)
  // right away — Brandon no longer has to open it for them (2026-11-08).
  if (services.includes("business")) {
    try {
      const { data: me } = await db.from("clients").select("id, name, email").eq("email", email).maybeSingle();
      if (me) await ensureBrand(db, me);
    } catch {}
  }

  if (!cur && resendConfigured) {
    try {
      await sendEmail({ to: LEAD_ALERT_TO, ...leadAlertEmail({ kind: "sign-up", name, email, phone, subject: `New sign-up — ${name} · ${labels.join(" + ")}`, summary: "Filled in the welcome form on the client portal", fields }) });
    } catch {}
  }
  return NextResponse.json({ ok: true, id: data.id, updated_at: data.updated_at });
}
