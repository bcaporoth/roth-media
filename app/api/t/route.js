import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { clip, geo, isBot, parseUA, visitorId } from "../../../lib/visitor";

export const dynamic = "force-dynamic";

// First-party stats beacon. The browser sends { type, name, path,
// referrer, utm, data } via sendBeacon; everything identifying is derived
// here from headers and never stored raw.
export async function POST(request) {
  if (!adminConfigured || isBot(request)) return new NextResponse(null, { status: 204 });

  let body = {};
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const path = clip(body.path, 300);
  if (!path.startsWith("/") || /^\/(portal|auth|api)(\/|$)/.test(path))
    return new NextResponse(null, { status: 204 });

  let referrer = "";
  try {
    const host = new URL(String(body.referrer || "")).hostname.replace(/^www\./, "");
    if (host && host !== "rothmediaco.com" && host !== "localhost") referrer = host;
  } catch {}

  const utm = body.utm || {};
  const row = {
    type: body.type === "event" ? "event" : "pageview",
    name: clip(body.name, 80),
    path,
    referrer: clip(referrer, 120),
    utm_source: clip(utm.source, 80),
    utm_medium: clip(utm.medium, 80),
    utm_campaign: clip(utm.campaign, 80),
    visitor: visitorId(request),
    ...parseUA(request.headers.get("user-agent") || ""),
    ...geo(request),
    data: body.data && typeof body.data === "object" ? body.data : {},
  };

  await supabaseAdmin().from("site_events").insert(row);
  return new NextResponse(null, { status: 204 });
}
