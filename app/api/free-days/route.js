import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { loadFree, saveFree, freeView, isYmd, todayET } from "../../../lib/free-days";

export const dynamic = "force-dynamic";
const bad = (error, status = 422) => NextResponse.json({ error }, { status });

async function who() {
  if (!portalConfigured || !adminConfigured) return null;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return { admin: user.email.toLowerCase() === ADMIN_EMAIL };
}

// Brandon's free days (lib/free-days.js).
//   GET  — any signed-in person: { open: [dates] }. Brandon also gets
//          { marked, taken } so his calendar can show "free" and "taken".
//   POST — Brandon only: { date, on } marks or unmarks one day.
export async function GET() {
  const me = await who();
  if (!me) return bad("Sign in first", 401);
  try {
    const v = await freeView(supabaseAdmin());
    return NextResponse.json(me.admin ? { ok: true, ...v } : { ok: true, open: v.open });
  } catch (err) { return bad(err.message || "Couldn't load", 500); }
}

export async function POST(request) {
  const me = await who();
  if (!me) return bad("Sign in first", 401);
  if (!me.admin) return bad("Not authorized", 403);
  const body = await request.json().catch(() => ({}));
  const date = String(body.date || "");
  if (!isYmd(date)) return bad("Bad date");
  if (body.on && date < todayET()) return bad("That day has passed");
  const db = supabaseAdmin();
  try {
    const cur = await loadFree(db);
    const next = body.on ? [...cur.days, date] : cur.days.filter((d) => d !== date);
    await saveFree(db, cur, next);
    return NextResponse.json({ ok: true, ...(await freeView(db)) });
  } catch (err) { return bad(err.message || "Couldn't save", 500); }
}
