import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { clip, isBot, visitorId } from "../../../lib/visitor";

export const dynamic = "force-dynamic";

const ACTIONS = new Set(["view", "download", "download_all", "save"]);

// Gallery activity beacon: { galleryId, via, actions: [{ action, filename }] }.
// The viewer's email comes from their session, never from the browser.
export async function POST(request) {
  if (!adminConfigured || isBot(request)) return new NextResponse(null, { status: 204 });
  let body = {};
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const galleryId = String(body.galleryId || "");
  if (!/^[0-9a-f-]{36}$/.test(galleryId)) return new NextResponse(null, { status: 204 });

  let viewer = "";
  if (portalConfigured) {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewer = user?.email?.toLowerCase() || "";
  }
  if (viewer === ADMIN_EMAIL) return new NextResponse(null, { status: 204 });

  const via = body.via === "portal" ? "portal" : "share";
  const visitor = visitorId(request);
  const rows = (Array.isArray(body.actions) ? body.actions : [])
    .filter((a) => ACTIONS.has(a?.action))
    .slice(0, 200)
    .map((a) => ({
      gallery_id: galleryId,
      action: a.action,
      via,
      viewer,
      filename: clip(a.filename, 200),
      visitor,
    }));
  if (rows.length) await supabaseAdmin().from("gallery_activity").insert(rows);
  return new NextResponse(null, { status: 204 });
}
