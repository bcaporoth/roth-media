import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { clip } from "../../../../lib/visitor";

export const dynamic = "force-dynamic";

// Studio → Partners: mark a partner's lead Contacted / Closed (with what they
// signed up for) / Lost. Closed + value is what the report and fees count.
export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const status = { contacted: "contacted", closed: "booked", lost: "lost", new: "new" }[b.status];
  if (!status) return NextResponse.json({ error: "Unknown status" }, { status: 422 });
  const db = supabaseAdmin();
  const { data: row } = await db.from("submissions").select("id, utm").eq("id", b.id).eq("kind", "partner_lead").maybeSingle();
  if (!row) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const utm = { ...(row.utm || {}) };
  if (status === "booked") {
    const value = Math.max(0, Math.round(Number(b.value) || 0));
    Object.assign(utm, { close_value: value, close_what: clip(b.what, 120), closed_at: new Date().toISOString() });
  } else {
    delete utm.close_value; delete utm.close_what; delete utm.closed_at;
  }
  const { error } = await db.from("submissions").update({ status, utm, read_at: new Date().toISOString() }).eq("id", row.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
