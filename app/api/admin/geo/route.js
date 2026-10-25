import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { suggest } from "../../../../lib/geo";

// Address lookup as you type (the AddressInput). Photon (komoot) is built
// for typeahead — free, no key, biased to the Twin Tiers; Nominatim fills in
// if it's down. Admin-only so nobody else burns the quota.
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const q = String(new URL(request.url).searchParams.get("q") || "").trim().slice(0, 120);
  if (q.length < 3) return NextResponse.json({ hits: [] });
  try { return NextResponse.json({ hits: await suggest(q) }); }
  catch { return NextResponse.json({ hits: [] }); }
}
