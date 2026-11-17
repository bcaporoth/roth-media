// Follow-up emails (2026-11-17): three sets of three emails, on about day 2,
// 6 and 13. Brandon controls all of it from Command Center → Inbox →
// Follow-ups: he adds each person, he writes the words, he can move any date,
// and nothing goes out until he taps Send. Nothing here sends by itself.
// Pure — safe to import in the browser. Storage: lib/nurture-server.js.

export const NURTURE_SETS = [
  { key: "lead", label: "Owners who haven't booked", short: "Not booked" },
  { key: "biz", label: "Business clients", short: "Business client" },
  { key: "couple", label: "Couples and photo clients", short: "Couple / photo" },
];
export const NURTURE_DAYS = [2, 6, 13];
export const setLabel = (key) => NURTURE_SETS.find((s) => s.key === key)?.label || key;

// What each email is for: the prompt Brandon sees above the empty box.
export const NURTURE_PROMPTS = {
  lead: [
    "What is the one thing you want them to know about why video helps a local business?",
    "What is a mistake you see local businesses make with their content?",
    "What do you want to say to someone who has gone quiet?",
  ],
  biz: [
    "What should they do before the shoot day to get ready?",
    "What is your best tip for posting the videos so they bring in customers?",
    "What should they do after the videos are out?",
  ],
  couple: [
    "What do you want them to know right after they book?",
    "What is your best tip for feeling relaxed on camera?",
    "What do you want them thinking about as the day gets close?",
  ],
};

export const blankWords = () => Object.fromEntries(NURTURE_SETS.map((s) => [s.key, NURTURE_DAYS.map(() => ({ subject: "", body: "" }))]));

export function cleanWords(input) {
  const out = blankWords();
  for (const s of NURTURE_SETS) {
    const list = Array.isArray(input?.[s.key]) ? input[s.key] : [];
    out[s.key] = NURTURE_DAYS.map((_, i) => ({
      subject: String(list[i]?.subject || "").slice(0, 200).trim(),
      body: String(list[i]?.body || "").slice(0, 6000).trim(),
    }));
  }
  return out;
}

const TZ = "America/New_York";
export const todayKey = (now = Date.now()) => new Date(now).toLocaleDateString("en-CA", { timeZone: TZ });
export const isDay = (k) => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ""));
export function addDays(key, n) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);
export const niceDay = (k) => (isDay(k) ? new Date(`${k}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : "");

// One step's state for the screen: sent · skipped · past due · due today · coming up.
export function stepState(step, today = todayKey()) {
  if (step.sentAt) return { key: "sent", label: `Sent ${niceDay(String(step.sentAt).slice(0, 10))}` };
  if (step.skipped) return { key: "skipped", label: "Skipped" };
  const late = daysBetween(step.due, today);
  if (late > 0) return { key: "late", label: `Past due · ${late} day${late === 1 ? "" : "s"}` };
  if (late === 0) return { key: "due", label: "Due today" };
  return { key: "soon", label: `Coming up · ${niceDay(step.due)}` };
}

// Site-events rows (oldest first) → one record per person per set.
export function buildPeople(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const d = r.data || {};
    const email = String(d.email || "").toLowerCase();
    if (!email || !NURTURE_DAYS.length || !NURTURE_SETS.some((s) => s.key === d.set)) continue;
    const id = `${d.set}|${email}`;
    if (d.a === "start") {
      const start = isDay(d.start) ? d.start : String(r.created_at || "").slice(0, 10);
      map.set(id, { id, set: d.set, email, name: String(d.name || ""), start, stopped: false, steps: NURTURE_DAYS.map((n) => ({ due: addDays(start, n), sentAt: "", skipped: false })) });
      continue;
    }
    const p = map.get(id);
    if (!p) continue;
    const st = p.steps[Number(d.step)];
    if (d.a === "stop") p.stopped = true;
    else if (d.a === "remove") map.delete(id);
    else if (!st) continue;
    else if (d.a === "sent") st.sentAt = r.created_at;
    else if (d.a === "skip") st.skipped = true;
    else if (d.a === "unskip") st.skipped = false;
    else if (d.a === "move" && isDay(d.due)) st.due = d.due;
  }
  return [...map.values()];
}

// {name} → their first name.
export function fillWords(text, person) {
  const first = String(person?.name || "").trim().split(/\s+/)[0] || "there";
  return String(text || "").replace(/\{name\}/gi, first);
}
