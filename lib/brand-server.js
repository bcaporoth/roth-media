// Brand palette — server side. Loading (tolerant of brand.sql not having
// run yet), first-time creation with the brief prefill, and the actions
// both APIs share: save, upload (sign → done), remove a file.
// app/api/portal/brand passes the signed-in client's id; app/api/admin/brand
// passes whichever client Brandon has open. brandon_notes only ever leaves
// through the admin path.

import { r2Configured, signedUrl, presignPut, brandPrefix, deleteBrandKey } from "./r2";
import { latestBrief } from "./intake";
import { applyChanges, sectionStatus, prefillChanges, brandSlug } from "./brand";

const PALETTE_COLS = "client_id, slug, data, section_status, invited_at, created_at, updated_at, updated_by";
const ASSET_COLS = "id, kind, label, r2_key, filename, mime, bytes, width, height, created_at";

// Missing table → { ready: false } so pages can show the "run brand.sql" hint.
const missing = (err) => err && (err.code === "42P01" || err.code === "PGRST205" || /brand_(palettes|assets)/.test(err.message || ""));

export async function loadBrand(db, clientId, { admin = false } = {}) {
  const cols = admin ? `${PALETTE_COLS}, brandon_notes` : PALETTE_COLS;
  const { data: palette, error } = await db.from("brand_palettes").select(cols).eq("client_id", clientId).maybeSingle();
  if (error) return missing(error) ? { ready: false } : { ready: true, error: error.message, palette: null, assets: [] };
  const assets = palette ? await listAssets(db, clientId) : [];
  return { ready: true, palette, assets };
}

// Has this signed-in email got a brand palette? Drives the portal nav's
// "Your brand" tab. Quietly false before brand.sql has run.
export async function emailHasBrand(db, email) {
  if (!email) return false;
  try {
    const { data: c } = await db.from("clients").select("id").eq("email", email.toLowerCase()).maybeSingle();
    if (!c) return false;
    const { data, error } = await db.from("brand_palettes").select("client_id").eq("client_id", c.id).maybeSingle();
    return !error && Boolean(data);
  } catch {
    return false;
  }
}

export async function listAssets(db, clientId) {
  const { data } = await db.from("brand_assets").select(ASSET_COLS).eq("client_id", clientId).order("created_at", { ascending: true });
  return Promise.all((data || []).map(async (a) => ({
    ...a,
    url: r2Configured ? await signedUrl(a.r2_key).catch(() => "") : "",
    download: r2Configured ? await signedUrl(a.r2_key, { download: a.filename || "file" }).catch(() => "") : "",
  })));
}

// Create the palette the first time (Studio "Send brand palette" / "Copy
// link"), prefilled from the client record and their business brief.
// Safe to call again: an existing row is returned untouched.
export async function ensureBrand(db, client) {
  const { data: cur, error } = await db.from("brand_palettes").select("client_id").eq("client_id", client.id).maybeSingle();
  if (error) throw new Error(missing(error) ? "Run supabase/brand.sql first." : error.message);
  if (cur) return { created: false };
  let brief = null;
  if (client.email) {
    const { data: subs } = await db.from("submissions").select("id, created_at, updated_at, kind, fields, utm").eq("kind", "intake").eq("email", client.email.toLowerCase()).order("created_at", { ascending: false }).limit(3);
    brief = latestBrief(subs || []);
  }
  const { data } = applyChanges({}, prefillChanges({ brief, client }));
  const row = { client_id: client.id, slug: brandSlug(client.name), data, section_status: sectionStatus({}, data, [], [], "brandon"), updated_by: "brandon" };
  const { error: insErr } = await db.from("brand_palettes").insert(row);
  if (insErr && insErr.code !== "23505") throw new Error(insErr.message); // 23505: created by a parallel call
  return { created: true, prefilled: Object.keys(data).length > 0 };
}

const KINDS = ["logo", "moodboard", "reference", "guide"];
const MAX_BYTES = 60 * 1024 * 1024;
const OK_TYPE = /^(image\/|application\/pdf$|application\/postscript$|application\/illustrator$|application\/octet-stream$)/;
const OK_EXT = /\.(svg|png|jpe?g|webp|gif|heic|pdf|ai|eps)$/i;
const safeName = (n) => String(n || "file").normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";

// One entry point for both APIs. by: "client" | "brandon".
export async function brandAction(db, clientId, body, by) {
  const action = body?.action;

  if (action === "save") {
    const { data: row, error } = await db.from("brand_palettes").select("data, section_status").eq("client_id", clientId).maybeSingle();
    if (error) return { status: missing(error) ? 503 : 500, error: missing(error) ? "Run supabase/brand.sql first." : error.message };
    if (!row) return { status: 404, error: "No brand palette yet" };
    const { data, touched } = applyChanges(row.data, body.changes);
    const { data: kinds } = await db.from("brand_assets").select("kind").eq("client_id", clientId);
    const status = sectionStatus(row.section_status, data, kinds || [], touched, by);
    const { data: saved, error: upErr } = await db.from("brand_palettes")
      .update({ data, section_status: status, updated_at: new Date().toISOString(), updated_by: by })
      .eq("client_id", clientId).select("updated_at").single();
    if (upErr) return { status: 500, error: upErr.message };
    return { ok: true, updated_at: saved.updated_at, section_status: status };
  }

  if (action === "sign") {
    if (!r2Configured) return { status: 503, error: "File storage isn't set up on this server." };
    const kind = KINDS.includes(body.kind) ? body.kind : "";
    const filename = safeName(body.filename);
    const contentType = String(body.contentType || "application/octet-stream").slice(0, 100);
    const bytes = Number(body.bytes || 0);
    if (!kind) return { status: 422, error: "Unknown file type" };
    if (!(bytes > 0) || bytes > MAX_BYTES) return { status: 422, error: `${filename} is over 60 MB` };
    if (!OK_TYPE.test(contentType) && !OK_EXT.test(filename)) return { status: 422, error: `${filename} isn't an image or PDF` };
    const { count } = await db.from("brand_assets").select("id", { count: "exact", head: true }).eq("client_id", clientId);
    if ((count || 0) >= 80) return { status: 422, error: "That's the limit for one brand (80 files). Remove a few first." };
    const id = crypto.randomUUID();
    const key = `${brandPrefix(clientId)}${id}-${filename}`;
    return { ok: true, id, key, contentType, url: await presignPut(key, contentType) };
  }

  if (action === "done") {
    const { id, key } = body;
    const kind = KINDS.includes(body.kind) ? body.kind : "";
    if (!/^[0-9a-f-]{36}$/.test(String(id)) || !kind || !String(key).startsWith(`${brandPrefix(clientId)}${id}-`) || String(key).includes("..")) return { status: 422, error: "Bad upload" };
    const int = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Math.round(Number(n)) : null);
    const row = {
      id, client_id: clientId, kind, r2_key: key,
      label: String(body.label || "").slice(0, 60),
      filename: String(body.filename || "").slice(0, 120),
      mime: String(body.contentType || "").slice(0, 100),
      bytes: int(body.bytes), width: int(body.width), height: int(body.height),
    };
    const { error } = await db.from("brand_assets").insert(row);
    if (error) return { status: 500, error: error.message };
    await touch(db, clientId, by, kind);
    const asset = { ...row, created_at: new Date().toISOString(), url: await signedUrl(key).catch(() => ""), download: await signedUrl(key, { download: row.filename || "file" }).catch(() => "") };
    return { ok: true, asset };
  }

  if (action === "label") {
    const { error } = await db.from("brand_assets").update({ label: String(body.label || "").slice(0, 60) }).eq("id", body.id).eq("client_id", clientId);
    return error ? { status: 500, error: error.message } : { ok: true };
  }

  if (action === "remove") {
    const { data: a } = await db.from("brand_assets").select("id, kind, r2_key").eq("id", body.id).eq("client_id", clientId).maybeSingle();
    if (!a) return { status: 404, error: "File not found" };
    await deleteBrandKey(clientId, a.r2_key);
    await db.from("brand_assets").delete().eq("id", a.id);
    await touch(db, clientId, by, a.kind);
    return { ok: true };
  }

  return { status: 400, error: "Unknown action" };
}

// A file came or went: refresh completeness (the logo is an Essential).
async function touch(db, clientId, by, kind) {
  const [{ data: row }, { data: kinds }] = await Promise.all([
    db.from("brand_palettes").select("data, section_status").eq("client_id", clientId).maybeSingle(),
    db.from("brand_assets").select("kind").eq("client_id", clientId),
  ]);
  if (!row) return;
  const status = sectionStatus(row.section_status, row.data, kinds || [], [kind === "moodboard" ? "vibe" : "visual"], by);
  await db.from("brand_palettes").update({ section_status: status, updated_at: new Date().toISOString(), updated_by: by }).eq("client_id", clientId);
}
