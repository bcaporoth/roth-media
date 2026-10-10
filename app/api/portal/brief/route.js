import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../../lib/supabase";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { INTAKE, TYPE_LABEL, typeOf } from "../../../../lib/intake";
import { clip } from "../../../../lib/visitor";

export const dynamic = "force-dynamic";

// The signed-in client edits their brief (the latest intake row under their
// email). One record: an edit updates it in place; the first save creates it.
// Brandon's call-sheet notes live on a separate "call" row, so nothing of his
// is touched here.
export async function POST(request) {
  if (!portalConfigured || !adminConfigured) return NextResponse.json({ error: "Not set up" }, { status: 503 });
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const email = user.email.toLowerCase();

  const body = await request.json().catch(() => ({}));
  const type = typeOf(body.type);
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const fields = [["for", type], ...INTAKE[type].map((it) => [it.q, clip(answers[it.q] || "", 4000).trim()]).filter(([, v]) => v)];
  const name = clip(body.name, 120);
  const phone = clip(body.phone, 40);

  const db = supabaseAdmin();
  const { data: cur } = await db.from("submissions").select("id").eq("kind", "intake").eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const row = {
    kind: "intake", email, fields, utm: { type },
    ...(name ? { name } : {}), ...(phone ? { phone } : {}),
    subject: `Brief — ${name || email}`,
    summary: `${TYPE_LABEL[type]} brief · ${fields.length - 1} answers`,
    updated_at: new Date().toISOString(),
  };
  const q = cur
    ? db.from("submissions").update(row).eq("id", cur.id)
    : db.from("submissions").insert({ ...row, status: "new", source_path: "/portal/brief" });
  const { data, error } = await q.select("id, updated_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // The first brief also closes any "intake link sent" placeholder.
  if (!cur) await db.from("submissions").delete().eq("kind", "intake_sent").eq("email", email);
  return NextResponse.json({ ok: true, id: data.id, updated_at: data.updated_at });
}
