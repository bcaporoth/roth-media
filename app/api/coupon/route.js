import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { findCoupon } from "../../../lib/coupons-server";

export const dynamic = "force-dynamic";

// Is this a live Studio coupon? Used by the quote page to show the price
// with the code. Checkout checks it again on the server.
export async function GET(request) {
  const u = new URL(request.url);
  const code = String(u.searchParams.get("code") || "").slice(0, 30);
  const email = String(u.searchParams.get("e") || "").slice(0, 200);
  if (!adminConfigured || !code) return NextResponse.json({ deal: null });
  const deal = await findCoupon(supabaseAdmin(), code, { email });
  return NextResponse.json({ deal });
}
