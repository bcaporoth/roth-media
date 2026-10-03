import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { loadPlaybook } from "../../../../lib/playbook";
import { GROUPS, PLAYBOOK_KINDS } from "../../../../lib/shoot-guides";

export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ error: "Not authorized" }, { status: 403 });
const bad = (msg, status = 422) => NextResponse.json({ error: msg }, { status });
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const isId = (v) => /^[0-9a-f-]{36}$/.test(String(v || ""));

function clean(body) {
  const out = {};
  if (body.title !== undefined) { out.title = clip(body.title, 120); if (!out.title) throw new Error("Give the list a name"); }
  if (body.section !== undefined) { if (!GROUPS.includes(body.section)) throw new Error("Bad section"); out.section = body.section; }
  if (body.kind !== undefined) out.kind = PLAYBOOK_KINDS.includes(body.kind) ? body.kind : "any";
  if (body.notes !== undefined) out.notes = clip(body.notes, 4000);
  if (body.auto !== undefined) out.auto = Boolean(body.auto);
  if (body.sort !== undefined) out.sort = Number.isFinite(Number(body.sort)) ? Math.round(Number(body.sort)) : 0;
  if (body.items !== undefined)
    out.items = (Array.isArray(body.items) ? body.items : []).slice(0, 150).map((it) => {
      const time = /^\d{2}:\d{2}$/.test(String(it?.time || "")) ? it.time : "";
      return { text: clip(it?.text, 240), ...(time ? { time } : {}) };
    }).filter((it) => it.text);
  return out;
}

export async function GET() {
  if (!(await isAdminRequest())) return deny();
  const { lists, missing } = await loadPlaybook(supabaseAdmin());
  return NextResponse.json({ lists, missing });
}

export async function POST(request) {
  if (!(await isAdminRequest())) return deny();
  const body = await request.json().catch(() => ({}));
  const db = supabaseAdmin();
  const missing = (error) => bad(/playbook/i.test(error.message) && /does not exist|schema cache/i.test(error.message) ? "Run supabase/playbook.sql first" : error.message, 500);

  try {
    if (body.action === "create") {
      const row = clean(body);
      if (!row.title || !row.section) return bad("A list needs a name and a section");
      const { data: last } = await db.from("playbook").select("sort").order("sort", { ascending: false }).limit(1);
      row.sort = (last?.[0]?.sort ?? 0) + 1;
      const { data, error } = await db.from("playbook").insert(row).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ list: data });
    }
    if (body.action === "update") {
      if (!isId(body.id)) return bad("Bad request");
      const row = { ...clean(body), updated_at: new Date().toISOString() };
      const { data, error } = await db.from("playbook").update(row).eq("id", body.id).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ list: data });
    }
    if (body.action === "duplicate") {
      if (!isId(body.id)) return bad("Bad request");
      const { data: src, error: e1 } = await db.from("playbook").select("*").eq("id", body.id).maybeSingle();
      if (e1) return missing(e1);
      if (!src) return bad("That list is gone", 404);
      const { data, error } = await db.from("playbook").insert({ section: src.section, kind: src.kind, title: `${src.title} (copy)`.slice(0, 120), notes: src.notes, items: src.items, auto: false, sort: (src.sort || 0) + 1 }).select("*").single();
      if (error) return missing(error);
      return NextResponse.json({ list: data });
    }
    if (body.action === "delete") {
      if (!isId(body.id)) return bad("Bad request");
      const { error } = await db.from("playbook").delete().eq("id", body.id);
      if (error) return missing(error);
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    return bad(err.message);
  }
  return bad("Unknown action", 400);
}
