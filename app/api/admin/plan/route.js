import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { ensureBrand } from "../../../../lib/brand-server";
import { cleanPlan, cleanCounts, publicPlan, STATUS_LABEL } from "../../../../lib/content-plan";
import { draftPlan, loadPlanState, savePlanState } from "../../../../lib/content-plan-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // a Claude draft can take a minute or two

const bad = (error, status = 422) => NextResponse.json({ error }, { status });

// Studio → Clients → profile → Content plan.
//   draft     — Claude writes a new draft from the brand palette, brief and direction
//   save      — keep Brandon's edits (draft, direction, counts, free)
//   publish   — the draft becomes what the client sees on their portal home
//   unpublish — take it off their portal
//   status    — move one item along (planned → filmed → editing → delivered),
//               in the draft and the published copy at once
export async function POST(request) {
  if (!(await isAdminRequest())) return bad("Not authorized", 403);
  const body = await request.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/.test(String(body.clientId || ""))) return bad("Bad client");
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, name, email").eq("id", body.clientId).maybeSingle();
  if (!client) return bad("Client not found", 404);

  try {
    await ensureBrand(db, client); // the plan lives on the brand palette row
    const now = new Date().toISOString();
    const settings = {
      direction: String(body.direction ?? "").slice(0, 4000),
      counts: cleanCounts(body.counts),
      free: Boolean(body.free),
    };

    if (body.action === "draft") {
      const { data: palette } = await db.from("brand_palettes").select("data, brandon_notes").eq("client_id", client.id).maybeSingle();
      const { plan, model } = await draftPlan(db, { client, palette, ...settings });
      const state = await savePlanState(db, client.id, { ...settings, draft: plan, generated_at: now, model, saved_at: now });
      return NextResponse.json({ ok: true, state });
    }

    if (body.action === "save") {
      const state = await savePlanState(db, client.id, { ...settings, draft: cleanPlan(body.draft), saved_at: now });
      return NextResponse.json({ ok: true, state });
    }

    if (body.action === "publish") {
      const draft = cleanPlan(body.draft);
      if (!draft.items.length) return bad("Add at least one item before publishing.");
      const state = await savePlanState(db, client.id, { ...settings, draft, published: publicPlan(draft), published_at: now, saved_at: now });
      return NextResponse.json({ ok: true, state });
    }

    if (body.action === "unpublish") {
      const state = await savePlanState(db, client.id, { published: null, published_at: null });
      return NextResponse.json({ ok: true, state });
    }

    if (body.action === "status") {
      if (!STATUS_LABEL[body.status]) return bad("Unknown status");
      const cur = (await loadPlanState(db, client.id)) || {};
      const move = (p) => (p ? { ...p, items: (p.items || []).map((it) => (it.id === body.itemId ? { ...it, status: body.status } : it)) } : p);
      const state = await savePlanState(db, client.id, { draft: move(cur.draft), published: move(cur.published) });
      return NextResponse.json({ ok: true, state });
    }

    return bad("Unknown action", 400);
  } catch (err) {
    return bad(err.message || "Something went wrong", 500);
  }
}
