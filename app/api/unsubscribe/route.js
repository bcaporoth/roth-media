import { NextResponse } from "next/server";
import { optOut } from "../../../lib/unsubscribe";

export const dynamic = "force-dynamic";

// Mail clients' native "Unsubscribe" button (List-Unsubscribe-Post) hits this.
export async function POST(request) {
  const ok = await optOut(new URL(request.url).searchParams.get("t"));
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
