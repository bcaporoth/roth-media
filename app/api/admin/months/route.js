import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { cleanCounts } from "../../../../lib/content-plan";
import { aiConfigured } from "../../../../lib/content-plan-server";
import { isMonth, ensureMonth, getMonth, listMonths, saveMonth, draftMonth, dayFromMonth, payLinkForMonth, refreshPaid, cleanItems } from "../../../../lib/months-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const bad = (error, status = 422) => NextResponse.json({ error }, { status });

// Studio → client → Months.
//   open      — the month (made if new), with Stripe asked about the pay link
//   save      — items / intro / notes / price / published / paid
//   draft     — Claude writes the month's lineup
//   copy      — copy another month's lineup in (statuses reset)
//   day       — make (or open) the shoot day for this month
//   paylink   — a Stripe Checkout link for the price
//   list      — every month for the client
export async function POST(request) {
  if (!(await isAdminRequest())) return bad("Not authorized", 403);
  const body = await request.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/.test(String(body.clientId || ""))) return bad("Bad client");
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, name, email").eq("id", body.clientId).maybeSingle();
  if (!client) return bad("Client not found", 404);
  try {
    if (body.action === "list") return NextResponse.json({ ok: true, months: await listMonths(db, client.id) });
    if (!isMonth(body.month)) return bad("Bad month");
    if (body.action === "open") {
      let row = await ensureMonth(db, client.id, body.month);
      row = await refreshPaid(db, row);
      return NextResponse.json({ ok: true, month: row });
    }
    const row = await getMonth(db, client.id, body.month);
    if (!row) return bad("Month not found", 404);
    if (body.action === "save") return NextResponse.json({ ok: true, month: await saveMonth(db, row.id, body.patch || {}) });
    if (body.action === "draft") {
      if (!aiConfigured) return bad("Claude isn't set up on this server (ANTHROPIC_API_KEY).", 503);
      const prior = (await listMonths(db, client.id) || []).filter((m) => m.month < row.month).flatMap((m) => m.items).slice(-24);
      const plan = await draftMonth(db, { client, month: row.month, direction: body.direction, counts: cleanCounts(body.counts), previous: prior });
      const items = [...row.items, ...plan.items];
      return NextResponse.json({ ok: true, month: await saveMonth(db, row.id, { items, intro: row.intro || plan.intro }) });
    }
    if (body.action === "copy") {
      if (!isMonth(body.from)) return bad("Bad month");
      const src = await getMonth(db, client.id, body.from);
      if (!src) return bad("Nothing in that month");
      const items = [...row.items, ...cleanItems(src.items).map(({ id, ...it }) => ({ ...it, status: "planned" }))];
      return NextResponse.json({ ok: true, month: await saveMonth(db, row.id, { items, intro: row.intro || src.intro, price_cents: row.price_cents || src.price_cents }) });
    }
    if (body.action === "day") return NextResponse.json({ ok: true, day: await dayFromMonth(db, row, client), month: await getMonth(db, client.id, row.month) });
    if (body.action === "paylink") return NextResponse.json({ ok: true, month: await payLinkForMonth(db, row, client) });
    return bad("Unknown action", 400);
  } catch (err) {
    return bad(err.message || "Something went wrong", 500);
  }
}
