// Quote-first business work (2026-11-15, Brandon's decision).
// Business + event clients answer four questions (components/BusinessAsk.js),
// Brandon builds three options in Studio → Money → Quotes from building
// blocks, and the client picks one, signs and pays at /q/<token>.
//
// Price = time × the hourly rate (shooting AND editing) + flat-fee extras.
// Shared by the browser and the server — no database code in here.

export const DEFAULT_RATE = 125; // dollars an hour, shooting and editing (Brandon, 2026-11-15)
export const QUOTE_DAYS = 10; // a quote is good for 10 days, same as agreements

// Building blocks. Time blocks carry their usual minutes per one (shoot =
// on site, edit = at the desk); Brandon changes them in Studio and every
// new quote uses his numbers. Flat blocks are a set dollar amount each.
// These starting minutes were Claude's guesses — Brandon adjusts them.
export const DEFAULT_BLOCKS = [
  { id: "coverage", name: "Time on site", unit: "hour", shoot: 60, edit: 0, flat: 0, note: "B-roll, the space, the work, the people" },
  { id: "interview", name: "Interview", unit: "interview", shoot: 45, edit: 90, flat: 0, note: "One person, sit-down, with a mic" },
  { id: "reel", name: "Reel", unit: "reel", shoot: 0, edit: 60, flat: 0, note: "One short vertical video" },
  { id: "photos", name: "Edited photos", unit: "set of 10", shoot: 0, edit: 30, flat: 0, note: "" },
  { id: "headshots", name: "Team headshots", unit: "person", shoot: 15, edit: 15, flat: 0, note: "" },
  { id: "highlight", name: "Highlight video", unit: "video", shoot: 0, edit: 180, flat: 0, note: "1–2 minutes" },
  { id: "lighting", name: "Extra lighting", unit: "setup", shoot: 0, edit: 0, flat: 0, note: "Set your price" },
  { id: "mics", name: "Extra mics", unit: "setup", shoot: 0, edit: 0, flat: 0, note: "Set your price" },
  { id: "second", name: "Second shooter", unit: "day", shoot: 0, edit: 0, flat: 0, note: "Set your price" },
  { id: "rush", name: "Rush delivery", unit: "job", shoot: 0, edit: 0, flat: 250, note: "In one week" },
  { id: "raw", name: "All the raw footage", unit: "job", shoot: 0, edit: 0, flat: 200, note: "" },
  { id: "ads", name: "Facebook ads + lead generation", unit: "job", shoot: 0, edit: 0, flat: 500, note: "" },
  { id: "website", name: "A website built from your content", unit: "site", shoot: 0, edit: 0, flat: 2000, note: "Then $50 a month" },
];

// The four questions on the public form. `key` is what's stored.
export const ASK = {
  goals: [
    "Get more customers in the door",
    "Fill a job opening",
    "Launch something new",
    "Look legit online",
    "Cover an event",
    "Something else",
  ],
  where: ["Instagram & Facebook", "TikTok", "My website", "Paid ads", "Not sure yet"],
  often: ["A one-time shoot", "Come back every month", "Not sure yet"],
  budget: ["Under $500", "$500 – $1,000", "$1,000 – $2,500", "$2,500 and up", "Not sure yet"],
};

const num = (v, max = 100000) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

// One line on an option: a block, how many, and its minutes / flat price
// (copied from the block so a later block change never moves a sent quote).
export function cleanLine(l = {}) {
  return {
    block: String(l.block || "").slice(0, 40),
    name: String(l.name || "").trim().slice(0, 80) || "Item",
    unit: String(l.unit || "").slice(0, 30),
    qty: Math.round(num(l.qty, 500) * 100) / 100,
    shoot: Math.round(num(l.shoot, 6000)),
    edit: Math.round(num(l.edit, 6000)),
    flat: Math.round(num(l.flat, 50000)),
  };
}

export function cleanOption(o = {}, i = 0) {
  return {
    label: String(o.label || "").trim().slice(0, 40) || ["Simple", "Recommended", "Everything"][i] || `Option ${i + 1}`,
    lines: (Array.isArray(o.lines) ? o.lines : []).slice(0, 30).map(cleanLine).filter((l) => l.qty > 0),
  };
}

// Round to the nearest $5 so quotes read like prices, not math.
const round5 = (n) => Math.round(n / 5) * 5;

export function optionTotals(option, rate = DEFAULT_RATE) {
  let shoot = 0, edit = 0, flat = 0;
  for (const l of option?.lines || []) {
    shoot += l.qty * l.shoot;
    edit += l.qty * l.edit;
    flat += l.qty * l.flat;
  }
  const time = ((shoot + edit) / 60) * rate;
  return { shootMin: Math.round(shoot), editMin: Math.round(edit), flat, total: round5(time + flat) };
}

// "about 2½ hours" / "about 45 minutes"
export function aboutTime(min) {
  if (!min) return "";
  if (min < 60) return `about ${Math.round(min / 5) * 5} minutes`;
  const half = Math.round(min / 30) / 2;
  const whole = Math.floor(half);
  const frac = half - whole ? "½" : "";
  return `about ${whole}${frac} hour${half > 1 ? "s" : ""}`;
}

// What the client reads for one line: "3 interviews", "2 sets of 10 edited photos".
export function lineLabel(l) {
  const q = l.qty;
  const n = Number.isInteger(q) ? String(q) : String(q).replace(/\.5$/, "½").replace(/^0½$/, "½");
  if (l.block === "coverage") return `${n} hour${q === 1 ? "" : "s"} of filming on site`;
  if (l.block === "photos") return `${Math.round(q * 10)} edited photos`;
  if (l.block === "headshots") return `Team headshots for ${n} ${q === 1 ? "person" : "people"}`;
  if (q === 1 && (l.unit === "job" || l.unit === "site" || l.unit === "setup" || l.unit === "day")) return l.name;
  const plural = (s) => (q === 1 ? s : /s$/.test(s) ? s : `${s}s`);
  return `${n} ${plural(l.name.charAt(0).toLowerCase() + l.name.slice(1))}`;
}

export const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

export const quoteExpiry = (q) => (q?.sentAt ? new Date(new Date(q.sentAt).getTime() + QUOTE_DAYS * 86400000) : null);
export const quoteExpired = (q, now = Date.now()) => {
  if (!q || q.status === "paid" || q.status === "signed") return false;
  const d = quoteExpiry(q);
  return !!d && d.getTime() < now;
};

// The words for the text / email Brandon sends with the link. Plain and
// functional; he edits them in his own Messages or Mail before sending.
export function quoteSendCopy(q, url) {
  const first = String(q.name || "").trim().split(/\s+/)[0] || "there";
  const n = (q.options || []).length;
  const pick = n > 1 ? `${n} options to pick from` : "your quote";
  return {
    subject: `Your quote from Roth Media${q.business ? ` — ${q.business}` : ""}`,
    body: `Hi ${first},\n\nHere's your quote${q.business ? ` for ${q.business}` : ""}: ${pick}. Pick the one that fits, sign, and pay on one page:\n\n${url}\n\nIt's good for ${QUOTE_DAYS} days. Questions? Text me at 845-549-4425.\n\nBrandon`,
    sms: `Hey ${first}, it's Brandon. Here's your quote, ${pick}. Pick one, sign and pay on one page: ${url}`,
  };
}
