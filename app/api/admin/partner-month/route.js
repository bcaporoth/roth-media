import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { PARTNERS } from "../../../../lib/partners";

export const dynamic = "force-dynamic";

// Studio → Partners: the month's ad spend (from Meta Ads Manager) and, for
// hourly follow-up, the hours. One row per partner per month.
export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!PARTNERS[b.slug] || !/^\d{4}-\d{2}$/.test(String(b.month))) return NextResponse.json({ error: "Bad partner or month" }, { status: 422 });
  const spend = Math.max(0, Math.round(Number(b.spend) * 100) / 100);
  const hours = Math.max(0, Math.round(Number(b.hours || 0) * 4) / 4);
  if (!Number.isFinite(spend)) return NextResponse.json({ error: "Enter the ad spend in dollars" }, { status: 422 });
  const db = supabaseAdmin();
  const utm = { partner: b.slug, month: b.month, spend, hours, updated_at: new Date().toISOString() };
  const { data: existing } = await db.from("submissions").select("id").eq("kind", "partner_month").eq("utm->>partner", b.slug).eq("utm->>month", b.month).maybeSingle();
  const res = existing
    ? await db.from("submissions").update({ utm }).eq("id", existing.id)
    : await db.from("submissions").insert({ kind: "partner_month", name: PARTNERS[b.slug].first, subject: `${b.slug} ${b.month} ad spend`, summary: `$${spend} spend`, fields: [], status: "archived", source_path: "/portal/admin/partners", utm });
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
