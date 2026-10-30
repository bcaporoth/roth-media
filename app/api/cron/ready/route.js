import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { sendDueReady } from "../../../../lib/ready-send";

export const dynamic = "force-dynamic";

// Every 5 minutes (vercel.json): any album Brandon set to "Send it later"
// whose time has come gets its "It's ready" email now — his words, his
// timing, the system just presses Send. Nothing due = nothing happens.
// ?dry=1 lists what would go out without sending.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  if (!adminConfigured) return NextResponse.json({ ok: false, reason: "not configured" });
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const r = await sendDueReady(supabaseAdmin(), { dry });
  if (!r.ok) return NextResponse.json(r, { status: r.needsSql ? 200 : 500 });
  return NextResponse.json(r);
}
