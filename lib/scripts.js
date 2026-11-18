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
  { id: "tchart", label: "T-chart", hint: "Scenes as a table: what's said | what's seen (talent · place · thing)" },
  { id: "questions", label: "Questions", hint: "Your own prompts for the person on camera" },
  { id: "other", label: "Other", hint: "" },
];
// Card kinds: a T-chart or a Questions card instead of the full script form.
export const isCard = (kind) => kind === "tchart" || kind === "questions";

// What the viewer sees on the right of a T-chart line: who or what is on camera.
export const SEE_TAGS = [
  { id: "talent", label: "Talent" },
  { id: "place", label: "Place" },
  { id: "thing", label: "Thing" },
  { id: "text", label: "Text on screen" },
  { id: "broll", label: "B-roll" },
];

// 2026-11-08 (Brandon: "I'll be using only T-charts from here on out"): every
// new script is a T-chart. What used to be a separate kind is now the T-chart's
// STYLE — it sets the prompts (a recipe's "have ready" is ingredients) and tells
// Claude what to write. Old scripts of other kinds still open; "Turn into a
// T-chart" converts them (toTchart).
export const STYLES = [
  { id: "reel", label: "Reel" },
  { id: "howto", label: "How-to" },
  { id: "recipe", label: "Recipe" },
  { id: "manual", label: "Walk-through" },
  { id: "promo", label: "Promo video" },
  { id: "photos", label: "Photo set" },
  { id: "questions", label: "Interview" },
  { id: "other", label: "Other" },
];
export const STYLE_LABEL = Object.fromEntries(STYLES.map((s) => [s.id, s.label]));
export const SEE_LABEL = Object.fromEntries(SEE_TAGS.map((t) => [t.id, t.label]));
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
export const NEEDS_LABEL = { questions: "What to have ready", recipe: "Ingredients & tools (with amounts)", howto: "What to have ready", manual: "What to have ready", photos: "Props & people", reel: "Props & people", promo: "People, places, props", other: "What to have ready" };

export const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));

const clip = (v, n) => String(v ?? "").replace(/\s+$/g, "").slice(0, n);
const list = (v, n, each) => (Array.isArray(v) ? v : String(v || "").split("\n")).map((x) => clip(x, each).trim()).filter(Boolean).slice(0, n);
const int = (v, d, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };

export function cleanStep(st = {}) {
  return { say: clip(st.say, 1200), do: clip(st.do, 800), shot: clip(st.shot, 400), secs: int(st.secs, 0, 0, 3600), done: Boolean(st.done) };
}

export const stepsDone = (body) => (body?.steps || []).filter((s) => s.done).length;

export function cleanLine(l = {}) {
  return { say: clip(l.say, 1200), see: clip(l.see, 800), tag: SEE_LABEL[l.tag] ? l.tag : "talent", secs: int(l.secs, 0, 0, 3600), done: Boolean(l.done) };
}
export function cleanScene(sc = {}) {
  return { label: clip(sc.label, 120).trim(), lines: (Array.isArray(sc.lines) ? sc.lines : []).slice(0, 60).map(cleanLine) };
}
export function cleanQuestion(q = {}) {
  return { q: clip(q.q, 600), a: clip(q.a, 2000), done: Boolean(q.done) };
}
export const blankLine = () => cleanLine({});
export const blankScene = () => ({ label: "", lines: [blankLine()] });
export const blankQuestion = () => cleanQuestion({});
export const sceneLines = (body) => (body?.scenes || []).flatMap((sc) => sc.lines || []);
// Do two bits of script say the same thing? Word for word, or one sitting
// inside the other (a hook with camera notes around the spoken words), or
// nearly the same words. Used so
// the opener and the closing line are read once and the card can say so.
const sameNorm = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const saysSame = (x, y) => {
  const a = sameNorm(x), b = sameNorm(y);
  if (a.length < 8 || b.length < 8) return false;
  if (a.includes(b) || b.includes(a)) return true;
  // Nearly the same: three quarters of the shorter one's words are in the other.
  const wa = a.split(" "), wb = b.split(" ");
  const [short, long] = wa.length <= wb.length ? [wa, new Set(wb)] : [wb, new Set(wa)];
  return short.length >= 4 && short.filter((w) => long.has(w)).length / short.length >= 0.75;
};

// The whole day as one shot list (2026-11-18, Brandon: "summed up and organized
// as talent, b-roll etc… so I know what I'm shooting and can check things off").
// Every T-chart line goes under its tag; each card's "B-roll to grab" list goes
// under B-roll. `at` says how to tick it: { scene, line } or { broll }.
export function shotList(scripts = []) {
  const groups = SEE_TAGS.map((t) => ({ id: t.id, label: t.label, items: [] }));
  const by = Object.fromEntries(groups.map((g) => [g.id, g]));
  for (const s of scripts) {
    const b = s.body || {};
    (b.scenes || []).forEach((sc, si) => (sc.lines || []).forEach((l, li) => {
      if (!(l.see || "").trim() && !(l.say || "").trim()) return;
      (by[l.tag] || by.talent).items.push({ key: `${s.id}:${si}:${li}`, scriptId: s.id, card: s.title || "Untitled", scene: sc.label || "", see: l.see || "", say: l.say || "", done: Boolean(l.done), at: { scene: si, line: li } });
    }));
    const got = new Set(b.broll_done || []);
    (b.broll || []).forEach((x, i) => by.broll.items.push({ key: `${s.id}:b:${i}`, scriptId: s.id, card: s.title || "Untitled", scene: "", see: x, say: "", done: got.has(x), at: { broll: i } }));
  }
  const all = groups.flatMap((g) => g.items);
  return { groups: groups.filter((g) => g.items.length), total: all.length, done: all.filter((x) => x.done).length };
}

// Progress for any kind: steps on a script, lines on a T-chart, questions on a Questions card.
export function progressOf(kind, body) {
  const items = kind === "tchart" ? [...sceneLines(body), ...(body?.questions || [])] : kind === "questions" ? body?.questions || [] : body?.steps || [];
  const noun = kind === "tchart" ? "line" : kind === "questions" ? "question" : "step";
  return { done: items.filter((x) => x.done).length, total: items.length, noun };
}

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

// A Playbook shot list (Command Center → More → Playbook → Shot lists) as a card
// on a shoot day: A-roll shots become Talent lines, B-roll shots become B-roll
// lines, nothing to say. The day's shot list then shows them like any other
// card's shots, tickable. Items with no roll set count as A-roll.
export const rollOf = (it) => (it?.roll === "b" ? "b" : "a");
export function scriptFromTemplate(list = {}) {
  const items = (Array.isArray(list.items) ? list.items : []).filter((it) => String(it?.text || "").trim());
  const lines = (roll, tag) => items.filter((it) => rollOf(it) === roll).map((it) => ({ say: "", see: it.text, tag, secs: 0, done: false }));
  const a = lines("a", "talent"), b = lines("b", "broll");
  return {
    kind: "tchart",
    title: `Shot list: ${list.title || "Template"}`.slice(0, 140),
    minutes: 0,
    body: cleanBody({ scenes: [...(a.length ? [{ label: "A-roll", lines: a }] : []), ...(b.length ? [{ label: "B-roll", lines: b }] : [])], notes: list.notes || "" }),
  };
}

export function cleanBody(b = {}) {
  return {
    style: STYLE_LABEL[b.style] ? b.style : "",
    goal: clip(b.goal, 600),
    hook: clip(b.hook, 600),
    on_camera: clip(b.on_camera, 300),
    where: clip(b.where, 300),
    length: clip(b.length, 60).trim(),
    needs: list(b.needs, 40, 200),
    steps: (Array.isArray(b.steps) ? b.steps : []).slice(0, 60).map(cleanStep).filter((s) => s.say || s.do || s.shot),
    broll: list(b.broll, 30, 200),
    // Which of the B-roll shots are in the can (ticked on the day's shot list).
    broll_done: (() => { const have = new Set(list(b.broll, 30, 200)); return [...new Set(list(b.broll_done, 30, 200))].filter((x) => have.has(x)); })(),
    cta: clip(b.cta, 300),
    caption: clip(b.caption, 1200),
    notes: clip(b.notes, 2000),
    // Card kinds (kept on every body so switching kind loses nothing).
    scenes: (Array.isArray(b.scenes) ? b.scenes : []).slice(0, 40).map(cleanScene).filter((sc) => sc.label || sc.lines.some((l) => l.say || l.see)),
    questions: (Array.isArray(b.questions) ? b.questions : []).slice(0, 80).map(cleanQuestion).filter((q) => q.q || q.a),
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


// Any script body as a T-chart (2026-11-08). Steps become one scene of lines:
// what's said on the left; the action + camera on the right, tagged talent.
// Everything else (goal, hook, needs, CTA, caption, B-roll, questions) carries
// over as is. kind = what it was ("reel", "questions"…) → becomes its style.
export function toTchart(kind, body = {}) {
  const b = cleanBody(body);
  const style = b.style || (STYLE_LABEL[kind] ? kind : kind === "tchart" ? "" : "other");
  if (kind === "tchart") return { ...b, style };
  const lines = b.steps.map((st) => cleanLine({ say: st.say, see: [st.do, st.shot].filter(Boolean).join(" · "), tag: kind === "photos" && !st.say ? "thing" : "talent", secs: st.secs, done: st.done }));
  const scenes = lines.length ? [...b.scenes, { label: "", lines }] : b.scenes;
  return cleanBody({ ...b, style, steps: [], scenes });
}

// Total seconds on screen in a T-chart (lines that have a time).
export const tchartSecs = (body) => sceneLines(body).reduce((n, l) => n + (l.secs || 0), 0);
