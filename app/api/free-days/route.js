import { NextResponse } from "next/server";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { loadFree, saveFree, freeView, isYmd, todayET, cleanWindow, cleanBusy } from "../../../lib/free-days";

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
    return NextResponse.json(me.admin ? { ok: true, ...v } : { ok: true, open: v.open, times: v.openTimes, busyOn: v.openBusy });
  } catch (err) { return bad(err.message || "Couldn't load", 500); }
}

export async function POST(request) {
  const me = await who();
  if (!me) return bad("Sign in first", 401);
  if (!me.admin) return bad("Not authorized", 403);
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();
  // { clear: "all" } or { clear: "2026-11" } — unmark every free day, or one month's.
  if (body.clear !== undefined) {
    const which = String(body.clear || "");
    if (which !== "all" && !/^\d{4}-\d{2}$/.test(which)) return bad("Bad request");
    try {
      const cur = await loadFree(db);
      await saveFree(db, cur, which === "all" ? [] : cur.days.filter((d) => !d.startsWith(`${which}-`)));
      return NextResponse.json({ ok: true, ...(await freeView(db)) });
    } catch (err) { return bad(err.message || "Couldn't save", 500); }
  }
  // { busy: [...] } — replaces the whole list of weekly busy blocks.
  if (body.busy !== undefined) {
    try {
      const cur = await loadFree(db);
      await saveFree(db, cur, cur.days, cur.times, cleanBusy(body.busy));
      return NextResponse.json({ ok: true, ...(await freeView(db)) });
    } catch (err) { return bad(err.message || "Couldn't save", 500); }
  }
  // { allTimes: { from, to } } — the same hours on every marked day ({} = all day).
  if (body.allTimes !== undefined) {
    try {
      const cur = await loadFree(db);
      const w = cleanWindow(body.allTimes);
      if (!w && (body.allTimes?.from || body.allTimes?.to)) return bad("The end time needs to be after the start time");
      await saveFree(db, cur, cur.days, w ? Object.fromEntries(cur.days.map((d) => [d, w])) : {});
      return NextResponse.json({ ok: true, ...(await freeView(db)) });
    } catch (err) { return bad(err.message || "Couldn't save", 500); }
  }
  const date = String(body.date || "");
  if (!isYmd(date)) return bad("Bad date");
  if (body.on && date < todayET()) return bad("That day has passed");
  try {
    const cur = await loadFree(db);
    const next = body.on ? [...cur.days, date] : cur.days.filter((d) => d !== date);
    const times = { ...cur.times };
    const w = body.on ? cleanWindow(body) : null;
    if (w) times[date] = w; else delete times[date];
    await saveFree(db, cur, next, times);
    return NextResponse.json({ ok: true, ...(await freeView(db)) });
  } catch (err) { return bad(err.message || "Couldn't save", 500); }
}
