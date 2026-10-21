// Shoot days + scripts — the shared model (no server-only imports here).
// Used by the Studio page, the client's portal page and the API.
//
// A shoot day: one business client, one date, a running order of scripts.
// A script is detailed enough to film from without talking: what it's for,
// the hook, who's on camera, where, what to have ready, then numbered steps
// — each with what to SAY, what to DO, what the camera SHOWS and roughly how
// long — plus B-roll, the call to action and the caption.
//
// body = {
//   goal, hook, on_camera, where, length, needs[],
//   steps: [{ say, do, shot, secs }],
//   broll[], cta, caption, notes
// }

export const KINDS = [
  { id: "reel", label: "Reel", hint: "15–60s, hook in the first 2 seconds" },
  { id: "howto", label: "How-to", hint: "Teach one thing, start to finish" },
  { id: "recipe", label: "Recipe", hint: "Ingredients, amounts, steps, the reveal" },
  { id: "manual", label: "Walk-through", hint: "A product, a process or a set of instructions, in order" },
  { id: "promo", label: "Promo video", hint: "The business, the offer, why here" },
  { id: "photos", label: "Photo set", hint: "A list of shots, not a script" },
  { id: "other", label: "Other", hint: "" },
];
export const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label]));

export const STATUSES = [
  { id: "draft", label: "Draft" },
  { id: "ready", label: "Ready to film" },
  { id: "filmed", label: "Filmed" },
  { id: "delivered", label: "Delivered" },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));

export const DAY_STATUSES = [
  { id: "planning", label: "Planning" },
  { id: "locked", label: "Locked in" },
  { id: "filmed", label: "Filmed" },
  { id: "delivered", label: "Delivered" },
];
export const DAY_STATUS_LABEL = Object.fromEntries(DAY_STATUSES.map((s) => [s.id, s.label]));

// What each kind's "needs" list is called.
export const NEEDS_LABEL = { recipe: "Ingredients & tools", howto: "What to have ready", manual: "What to have ready", photos: "Props & people", reel: "Props & people", promo: "People, places, props", other: "What to have ready" };

export const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));

const clip = (v, n) => String(v ?? "").replace(/\s+$/g, "").slice(0, n);
const list = (v, n, each) => (Array.isArray(v) ? v : String(v || "").split("\n")).map((x) => clip(x, each).trim()).filter(Boolean).slice(0, n);
const int = (v, d, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };

export function cleanStep(st = {}) {
  return { say: clip(st.say, 1200), do: clip(st.do, 800), shot: clip(st.shot, 400), secs: int(st.secs, 0, 0, 3600), done: Boolean(st.done) };
}

export const stepsDone = (body) => (body?.steps || []).filter((s) => s.done).length;

// A content-plan item (lib/content-plan.js) as a starting script: its idea,
// hook and shots become the goal, the hook and the first steps' camera notes.
export function scriptFromPlanItem(it = {}) {
  const kind = it.kind === "promo" ? "promo" : it.kind === "photos" ? "photos" : it.kind === "reel" ? "reel" : "other";
  return {
    kind,
    title: it.title || "",
    minutes: kind === "promo" ? 45 : kind === "photos" ? 30 : 20,
    body: cleanBody({
      goal: it.idea || "",
      hook: it.hook || "",
      on_camera: it.on_camera || "",
      length: it.length || "",
      steps: (it.shots || []).map((shot) => ({ say: "", do: "", shot, secs: 0 })),
      notes: it.when ? `Planned for: ${it.when}` : "",
    }),
  };
}

export function cleanBody(b = {}) {
  return {
    goal: clip(b.goal, 600),
    hook: clip(b.hook, 600),
    on_camera: clip(b.on_camera, 300),
    where: clip(b.where, 300),
    length: clip(b.length, 60).trim(),
    needs: list(b.needs, 40, 200),
    steps: (Array.isArray(b.steps) ? b.steps : []).slice(0, 60).map(cleanStep).filter((s) => s.say || s.do || s.shot),
    broll: list(b.broll, 30, 200),
    cta: clip(b.cta, 300),
    caption: clip(b.caption, 1200),
    notes: clip(b.notes, 2000),
  };
}

export const blankBody = () => cleanBody({});
export const blankStep = () => cleanStep({});

export function cleanScriptPatch(p = {}) {
  const out = {};
  if (p.title !== undefined) out.title = clip(p.title, 140).trim();
  if (p.kind !== undefined && KIND_LABEL[p.kind]) out.kind = p.kind;
  if (p.status !== undefined && STATUS_LABEL[p.status]) out.status = p.status;
  if (p.minutes !== undefined) out.minutes = int(p.minutes, 20, 0, 720);
  if (p.body !== undefined) out.body = cleanBody(p.body);
  return out;
}

export function cleanDayPatch(p = {}) {
  const out = {};
  if (p.title !== undefined) out.title = clip(p.title, 140).trim() || "Shoot day";
  if (p.date !== undefined) out.date = /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || "")) ? p.date : null;
  if (p.start_time !== undefined) out.start_time = /^\d{2}:\d{2}$/.test(String(p.start_time || "")) ? p.start_time : "";
  if (p.end_time !== undefined) out.end_time = /^\d{2}:\d{2}$/.test(String(p.end_time || "")) ? p.end_time : "";
  if (p.location !== undefined) out.location = clip(p.location, 300).trim();
  if (p.notes !== undefined) out.notes = clip(p.notes, 4000);
  if (p.status !== undefined && DAY_STATUS_LABEL[p.status]) out.status = p.status;
  return out;
}

// Running order: each script's clock time from the day's start + the minutes before it.
export function runningOrder(day, scripts) {
  let mins = /^\d{2}:\d{2}$/.test(String(day?.start_time || "")) ? day.start_time.split(":").map(Number).reduce((h, m) => h * 60 + m) : null;
  return (scripts || []).map((s) => {
    const at = mins === null ? "" : `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    if (mins !== null) mins += s.minutes || 0;
    return { ...s, at };
  });
}

export const totalMinutes = (scripts) => (scripts || []).reduce((n, s) => n + (s.minutes || 0), 0);

const toMins = (hhmm) => (/^\d{2}:\d{2}$/.test(String(hhmm || "")) ? hhmm.split(":").map(Number).reduce((h, m) => h * 60 + m) : null);
const toHHMM = (mins) => `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

// The day's window: when filming would wrap given the scripts, how much time the start→end
// window holds, and whether the plan runs over it (positive) or leaves slack (negative).
export function dayWindow(day, scripts) {
  const start = toMins(day?.start_time);
  const end = toMins(day?.end_time);
  const total = totalMinutes(scripts);
  const wraps = start === null ? "" : toHHMM(start + total);
  const available = start !== null && end !== null && end > start ? end - start : null;
  const over = available === null ? null : total - available;
  return { total, wraps, available, over };
}

export const fmt12 = (hhmm) => {
  if (!/^\d{2}:\d{2}$/.test(String(hhmm || ""))) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export const fmtMins = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);

export const stepSecs = (body) => (body?.steps || []).reduce((n, s) => n + (s.secs || 0), 0);
