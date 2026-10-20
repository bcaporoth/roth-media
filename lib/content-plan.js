// Content plan — the reels, promos and photo sets Brandon will make for a
// business client, drafted with Claude in Studio, edited by Brandon, then
// published to the client's portal home. Shared by the Studio editor, the
// admin API and the portal (no server-only imports here).
//
// Storage: brand_palettes.brandon_notes._plan (Studio only, never sent to
// the client's browser) = { draft, published, direction, counts, free,
// generated_at, saved_at, published_at }. The portal reads only
// `published`, server side (lib/content-plan-server.js).
//
// plan = {
//   intro:     one or two plain sentences: what this plan is
//   price:     "No charge" or a price line, shown as a tag
//   items:     [{ id, kind, title, idea, hook, shots[], on_camera, length, when, status }]
//   needs:     what Brandon needs from them (access, permission, people)
//   questions: things to ask them — Studio only, never published
// }

export const KINDS = [
  { id: "reel", label: "Reel" },
  { id: "promo", label: "Promo video" },
  { id: "photos", label: "Photo set" },
  { id: "other", label: "Other" },
];
export const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label]));

export const STATUSES = [
  { id: "planned", label: "Planned" },
  { id: "filmed", label: "Filmed" },
  { id: "editing", label: "Editing" },
  { id: "delivered", label: "Delivered" },
  { id: "posted", label: "Posted" },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));

export const DEFAULT_COUNTS = { reel: 4, promo: 1, photos: 0 };

const clip = (v, n) => String(v ?? "").replace(/\s+$/g, "").slice(0, n);
const list = (v, n, each) => (Array.isArray(v) ? v : String(v || "").split("\n")).map((x) => clip(x, each).trim()).filter(Boolean).slice(0, n);
const newId = () => (globalThis.crypto?.randomUUID?.() || `i${Date.now()}${Math.random().toString(16).slice(2)}`).slice(0, 36);

export function cleanItem(it = {}) {
  return {
    id: /^[\w-]{6,40}$/.test(String(it.id || "")) ? String(it.id) : newId(),
    kind: KIND_LABEL[it.kind] ? it.kind : "reel",
    title: clip(it.title, 120).trim(),
    idea: clip(it.idea, 1200),
    hook: clip(it.hook, 400),
    shots: list(it.shots, 20, 200),
    on_camera: clip(it.on_camera, 300),
    length: clip(it.length, 40).trim(),
    when: clip(it.when, 120).trim(),
    status: STATUS_LABEL[it.status] ? it.status : "planned",
  };
}

// Anything that comes in (Claude's draft, the editor, the DB) goes
// through here before it is stored or shown.
export function cleanPlan(p = {}) {
  return {
    intro: clip(p.intro, 800),
    price: clip(p.price, 80).trim(),
    items: (Array.isArray(p.items) ? p.items : []).slice(0, 24).map(cleanItem),
    needs: list(p.needs, 12, 240),
    questions: list(p.questions, 15, 300),
  };
}

export function cleanCounts(c = {}) {
  const n = (v, d) => Math.max(0, Math.min(12, Number.isFinite(Number(v)) ? Math.round(Number(v)) : d));
  return { reel: n(c.reel, DEFAULT_COUNTS.reel), promo: n(c.promo, DEFAULT_COUNTS.promo), photos: n(c.photos, DEFAULT_COUNTS.photos) };
}

// What the client sees: no questions list.
export function publicPlan(p) {
  if (!p) return null;
  const { questions, ...rest } = cleanPlan(p); // eslint-disable-line no-unused-vars
  return rest;
}

export const blankItem = (kind = "reel") => cleanItem({ kind });
