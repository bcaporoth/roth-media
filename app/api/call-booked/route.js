import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { clip } from "../../../lib/visitor";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(["quote", "home", "card", "contact", "intake", "promo", "walkin"]);
const CALENDLY_API = "https://api.calendly.com/scheduled_events/";

// components/BookCall.js posts here when Calendly says a call was booked.
// The inquiry row remembers it (lib/call.js) so Studio can show "Call booked".
// Nothing is emailed: Calendly already tells Brandon and the client.
export async function POST(request) {
  if (!adminConfigured) return new NextResponse(null, { status: 204 });
  const b = await request.json().catch(() => ({}));
  const id = String(b.i || "");
  if (!UUID.test(id)) return new NextResponse(null, { status: 204 });

  const db = supabaseAdmin();
  const { data: sub } = await db.from("submissions").select("id, kind, utm").eq("id", id).maybeSingle();
  if (!sub || !KINDS.has(sub.kind)) return new NextResponse(null, { status: 204 });

  const event = clip(b.event, 200);
  const invitee = clip(b.invitee, 240);
  // The call's start time, when a Calendly token is set in Vercel. Without
  // one Studio still shows "Call booked", just without the time.
  let at = null;
  const token = process.env.CALENDLY_TOKEN || "";
  if (token && event.startsWith(CALENDLY_API)) {
    try {
      const r = await fetch(event, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (r.ok) at = (await r.json())?.resource?.start_time || null;
    } catch {}
  }

  const utm = sub.utm && typeof sub.utm === "object" ? sub.utm : {};
  const call = { bookedAt: new Date().toISOString(), ...(event.startsWith("https://api.calendly.com/") ? { event } : {}), ...(invitee.startsWith("https://api.calendly.com/") ? { invitee } : {}), ...(at ? { at } : {}) };
  await db.from("submissions").update({ utm: { ...utm, call } }).eq("id", sub.id);
  return NextResponse.json({ ok: true });
}
