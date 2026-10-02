import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { validToken } from "../../../../lib/partner-stats";
import { clip } from "../../../../lib/visitor";

export const dynamic = "force-dynamic";

// The partner's team marks a lead Joined (or undoes it) from their report
// page. The private report link (?k=) is the key — no login.
export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  if (!validToken(String(b.slug || ""), b.k)) return NextResponse.json({ error: "This link doesn't work anymore — ask Brandon for a new one." }, { status: 401 });
  const db = supabaseAdmin();
  const { data: row } = await db.from("submissions").select("id, utm").eq("id", b.id).eq("kind", "partner_lead").eq("utm->>partner", b.slug).maybeSingle();
  if (!row) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const utm = { ...(row.utm || {}) };
  if (b.joined) Object.assign(utm, { closed_at: new Date().toISOString(), close_what: clip(b.what, 80), close_value: Math.max(0, Math.round(Number(b.value) || 0)), marked_by: "partner" });
  else { delete utm.closed_at; delete utm.close_what; delete utm.close_value; }
  const { error } = await db.from("submissions").update({ status: b.joined ? "booked" : "contacted", utm }).eq("id", row.id);
  if (error) return NextResponse.json({ error: "Didn't save — try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
