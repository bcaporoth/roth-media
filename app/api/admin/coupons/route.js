import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { cleanCoupon, listCoupons, saveCoupon, patchCoupon } from "../../../../lib/coupons-server";

export const dynamic = "force-dynamic";
const bad = (error, status = 422) => NextResponse.json({ error }, { status });

// Studio → Money → Coupons.
//   list · save {id?, ...fields} · pause {id} · resume {id} · delete {id}
export async function POST(request) {
  if (!(await isAdminRequest())) return bad("Not authorized", 403);
  if (!adminConfigured) return bad("Not set up", 503);
  const db = supabaseAdmin();
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "list") return NextResponse.json({ ok: true, coupons: await listCoupons(db) });
    if (body.action === "save") {
      const { coupon, error } = cleanCoupon(body.coupon || {});
      if (error) return bad(error);
      const id = await saveCoupon(db, body.id || null, coupon);
      return NextResponse.json({ ok: true, id, coupons: await listCoupons(db) });
    }
    if (["pause", "resume", "delete"].includes(body.action)) {
      if (!body.id) return bad("Which coupon?");
      await patchCoupon(db, body.id, body.action === "delete" ? { deleted: true, off: true } : { off: body.action === "pause" });
      return NextResponse.json({ ok: true, coupons: await listCoupons(db) });
    }
    return bad("Unknown action", 400);
  } catch (e) {
    return bad(e.message || "Something went wrong", 500);
  }
}
