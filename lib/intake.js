// Intake forms + orientation-call sheets. Both live in the `submissions`
// table so nothing new has to be created in Supabase:
//   kind "intake_sent" — Brandon tapped "Send intake link" (placeholder; no answers yet)
//   kind "intake"      — the client's answers (fields = [[question, answer]])
//   kind "call"        — Brandon's call sheet (fields = answers, utm = { type, checks, call_date })
// Shared by the public /intake page, Studio → Clients, and the forms API.

import { addonNames, addonMenu } from "./packages";

export const SITE = "https://rothmediaco.com";

// Add-on lists (names for the call sheet, names + prices for the intake hint)
// come from lib/packages.js so the menu is the one source of truth.

export const TYPES = [
  { id: "wedding", label: "Wedding" },
  { id: "engagement", label: "Engagement" },
  { id: "family", label: "Family / portraits" },
  { id: "business", label: "Business" },
];
export const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.id, t.label]));
export const typeOf = (t) => (TYPE_LABEL[t] ? t : "wedding");

// What the client fills in. Each: { q, hint?, long? (textarea), opt? (optional) }.
export const INTAKE = {
  wedding: [
    { q: "Both of your names", hint: "And how you'd like to be introduced." },
    { q: "Wedding date", hint: "Or the window you're looking at if it isn't set." },
    { q: "Engagement session dates", hint: "It's free with your wedding. Dates and a time of day that work — the hour before sunset is my favorite — or 'not yet' and we'll pick one on the call.", opt: true },
    { q: "Ceremony venue and town" },
    { q: "Reception venue", hint: "If it's somewhere different.", opt: true },
    { q: "Other confirmed locations", hint: "Getting ready, first look, portraits. Say if anything's still up in the air.", long: true, opt: true },
    { q: "Rough guest count", opt: true },
    { q: "Rough timeline", hint: "Ceremony start, reception end — a guess is fine.", long: true },
    { q: "Photo, video, or both?" },
    { q: "How many hours of coverage are you picturing?", opt: true },
    { q: "The one shot you'd be gutted to miss", hint: "If I only got one picture right all day, which is it? Describe it — where, who, what's behind you.", long: true },
    { q: "Must-have shots", hint: "The moments and people you absolutely need. A short list is perfect.", long: true },
    { q: "Family groupings I should know about", hint: "Split families, who's who, anyone to keep apart.", long: true, opt: true },
    { q: "The vibe", hint: "Candid and documentary, classic and posed, or a mix?" },
    { q: "Shots you're interested in", hint: "Ideas you've seen and like. Instagram or Pinterest links welcome. Not required, things to try if the day allows.", long: true, opt: true },
    { q: "Add-ons you're interested in", hint: `Any of these, or 'not sure' and we'll talk it through: ${addonMenu("wedding")}.`, long: true, opt: true },
    { q: "Pets, animals, props or anything unusual on site", hint: "A dog in the ceremony, horses at the venue, a vintage car, grandma's quilt. I plan around it (and shoot silent around animals).", long: true, opt: true },
    { q: "Links: inspo board, venue walk-through video, playlist", hint: "Paste anything — Pinterest, Instagram, a Google Drive link.", long: true, opt: true },
    { q: "Budget range you're working with", opt: true },
    { q: "How did you hear about me?", hint: "A friend, family, a vendor, Instagram, Google. If we already know each other, say how.", opt: true },
    { q: "Anything else", hint: "Surprises planned, accessibility, things to avoid.", long: true, opt: true },
  ],
  engagement: [
    { q: "Both of your names", hint: "And how you'd like to be introduced." },
    { q: "Wedding date", hint: "So the session lands in time for save-the-dates or invitations.", opt: true },
    { q: "Dates that work for the session", hint: "And the time of day. The hour before sunset is my favorite." },
    { q: "Confirmed location(s)", hint: "Where we're shooting, if it's set. Say if anything's still an idea, or 'suggest some' and I will.", long: true },
    { q: "The one shot you'd be gutted to miss", hint: "If I only got one picture right, which is it? Describe it — walking together, the big tree, the hills behind you.", long: true },
    { q: "Must-have shots", hint: "The pictures you absolutely need. The ring, the dog, the spot where it happened.", long: true },
    { q: "Shots you're interested in", hint: "Ideas you've seen and like. Instagram or Pinterest links welcome. Not required, things to try if the light allows.", long: true, opt: true },
    { q: "Add-ons you're interested in", hint: `Anything from the menu: ${addonMenu("family")}. Or 'not sure' and we'll talk it through.`, long: true, opt: true },
    { q: "Outfits", hint: "One look or two? Dressy, casual, both.", opt: true },
    { q: "What are the photos for?", hint: "Save-the-dates, the wedding website, prints, a guestbook.", opt: true },
    { q: "Your story, in a few lines", hint: "How you met, how the proposal went. It shapes what I shoot.", long: true, opt: true },
    { q: "The vibe", hint: "Candid and playful, romantic and quiet, editorial." },
    { q: "Anything that helps you relax on camera", hint: "A playlist, a drink after, me talking the whole time.", long: true, opt: true },
    { q: "Pets, animals, props or anything unusual on site", hint: "Your dog, horses or cows at the location, a truck, a quilt to lie on. I plan around it (and shoot silent around animals).", long: true, opt: true },
    { q: "Links: inspo board, location walk-through video", hint: "Paste anything — Pinterest, Instagram, a Google Drive link to a video of the spot.", long: true, opt: true },
    { q: "How did you hear about me?", hint: "A friend, family, a vendor, Instagram, Google. If we already know each other, say how.", opt: true },
    { q: "Anything else", long: true, opt: true },
  ],
  family: [
    { q: "Who's in the photos", hint: "Names, and the kids' ages if any." },
    { q: "What's the occasion?" },
    { q: "Dates that work", hint: "And the time of day you'd prefer." },
    { q: "Confirmed location, or ideas", hint: "If it's set, where. If not, say 'suggest some' and I will." },
    { q: "The one shot you'd be gutted to miss", hint: "If I only got one picture right, which is it?", long: true, opt: true },
    { q: "Must-have shots", hint: "Groupings or specific pictures you need to walk away with.", long: true, opt: true },
    { q: "Shots you're interested in", hint: "Ideas you've seen and like. Not required, things to try if the kids allow.", long: true, opt: true },
    { q: "Add-ons you're interested in", hint: `Anything from the menu: ${addonMenu("family")}. Or 'not sure' and we'll talk it through.`, long: true, opt: true },
    { q: "Style you're drawn to", hint: "Bright and airy, warm and moody, candid." },
    { q: "Anything that helps the kids or grandparents have a good time", long: true, opt: true },
    { q: "Pets, animals, props or anything unusual on site", hint: "The dog, a wagon, a blanket, the tree you all love.", long: true, opt: true },
    { q: "Links: inspo board, location photos", hint: "Paste anything — Pinterest, Instagram, a Google Drive link.", long: true, opt: true },
    { q: "How did you hear about me?", hint: "A friend, family, Instagram, Google. If we already know each other, say how.", opt: true },
    { q: "Anything else", long: true, opt: true },
  ],
  business: [
    { q: "Business name and what you do" },
    { q: "What's this content for?", hint: "Ads, website, socials, a launch." },
    { q: "Where will it live?", hint: "Instagram, Facebook, website, TV, print." },
    { q: "The one thing a viewer should feel or do after watching" },
    { q: "Who's on camera", hint: "Owner, staff, customers — and anyone who'd rather not be." },
    { q: "Dates and times that work", hint: "Anything time-sensitive?" },
    { q: "Confirmed shoot location(s)", hint: "Where we're filming, and whether it's locked in or still an idea." },
    { q: "The one shot you'd be gutted to miss", hint: "If only one clip or picture came out of the day, which is it?", long: true },
    { q: "Must-have shots", hint: "Products, spaces, people or moments that have to be in the final cut.", long: true },
    { q: "Brand assets you have", hint: "Logo, colors, fonts — a link, or 'I'll send'.", opt: true },
    { q: "Shots you're interested in", hint: "Styles or ideas you've seen and like. Links welcome.", long: true, opt: true },
    { q: "Add-ons you're interested in", hint: `More from the same day, or help after: ${addonMenu("business")}. Or 'not sure' and we'll talk it through.`, long: true, opt: true },
    { q: "Anything unusual on site", hint: "Animals, machinery, a space that's tight or loud, customers who can't be filmed.", long: true, opt: true },
    { q: "Links: your socials, competitors you like, inspo", hint: "Paste anything.", long: true, opt: true },
    { q: "Budget range", opt: true },
    { q: "How did you hear about me?", hint: "A friend, another business, Instagram, Google. If we already know each other, say how.", opt: true },
    { q: "Anything else", long: true, opt: true },
  ],
};

// What Brandon fills in on the orientation call, in three parts: are we
// aligned with what they first asked for, the event in detail (the brief —
// the client's own /intake answers shown read-only, with a note box beside
// each for what came up on the call), and the deal. checks: tap-to-tick.
// Nothing is copied: the brief lives on the intake row and the call sheet
// only stores Brandon's notes under the same question keys.
const ALIGN = {
  wedding: ["What they asked for in the inquiry — still right? (date, photo/video, rough budget)", "What a win looks like to them, in their words"],
  engagement: ["What they asked for in the inquiry — still right? (date, location, part of the wedding collection or on its own)", "What the photos are for and what a win looks like to them"],
  family: ["What they asked for in the inquiry — still right? (occasion, date, budget)", "What they want on the wall or in the album"],
  business: ["What they asked for in the inquiry — still right? (goal, formats, budget)", "What success looks like in 90 days (calls, bookings, followers, sales)"],
};
const DEAL = {
  wedding: [`Package discussed and add-ons (${addonNames("wedding")})`, "Price quoted", "Travel / lodging", "Hesitations or questions they raised", "Next step, by when, who sends what"],
  engagement: ["Package discussed and price quoted (included with the wedding, or on its own)", `Add-ons discussed (${addonNames("family")})`, "Locations and timing agreed", "Hesitations or questions they raised", "Next step, by when"],
  family: ["Package discussed and price quoted", `Add-ons discussed (${addonNames("family")})`, "Hesitations or questions they raised", "Next step, by when"],
  business: ["Deliverables, turnaround, revisions", "Package discussed and price quoted", `Add-ons discussed (${addonNames("business")})`, "Who signs off", "Next step, by when"],
};
const CHECKS = {
  wedding: ["Date held", "Package agreed", "Retainer link sent", "Welcome packet sent", "Calendar invite sent", "Follow-up scheduled"],
  engagement: ["Date held", "Location set", "Pay link sent", "Outfit guide sent", "Calendar invite sent"],
  family: ["Date held", "Location set", "Pay link sent", "Welcome packet sent", "Calendar invite sent"],
  business: ["Shoot date held", "Brief approved", "Pay link sent", "Assets received", "Calendar invite sent"],
};
export const CALL = Object.fromEntries(TYPES.map(({ id }) => {
  const sections = [
    { title: "Are we aligned?", prompts: ALIGN[id] },
    { title: "The event, in detail", prompts: INTAKE[id].map((q) => q.q), brief: true },
    { title: "The deal", prompts: DEAL[id] },
  ];
  return [id, { sections, prompts: sections.flatMap((x) => x.prompts), checks: CHECKS[id] }];
}));

// Kinds that count as "they reached out" (the initial inquiry).
export const INQUIRY_KINDS = ["quote", "contact", "card", "home", "promo", "booking"];

export function intakeUrl({ email = "", name = "", type = "" } = {}) {
  const q = new URLSearchParams();
  if (email) q.set("email", email);
  if (name) q.set("name", name);
  if (type) q.set("type", type);
  const s = q.toString();
  return `${SITE}/intake${s ? `?${s}` : ""}`;
}

// Pipeline position, derived from what the site already knows.
export const STAGES = [
  { key: "new", label: "New" },
  { key: "intake_sent", label: "Intake sent" },
  { key: "intake", label: "Intake done" },
  { key: "call", label: "Call done" },
  { key: "booked", label: "Booked" },
  { key: "shot", label: "Shot" },
  { key: "delivered", label: "Delivered" },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));

export function clientStage({ subs = [], shoots = [], galleries = [] }) {
  if (galleries.some((g) => (g.media_count || 0) > 0)) return "delivered";
  if (shoots.some((s) => s.status === "done")) return "shot";
  if (subs.some((s) => s.kind === "booking" || s.status === "booked") || shoots.some((s) => s.status === "confirmed")) return "booked";
  if (subs.some((s) => s.kind === "call")) return "call";
  if (subs.some((s) => s.kind === "intake")) return "intake";
  if (subs.some((s) => s.kind === "intake_sent")) return "intake_sent";
  return "new";
}

// Best guess at what kind of client this is: latest intake/call, then shoots.
export function clientType({ subs = [], shoots = [] }) {
  const typed = subs.filter((s) => s.utm?.type && TYPE_LABEL[s.utm.type]).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (typed[0]) return typed[0].utm.type;
  const s = shoots.find((x) => TYPE_LABEL[x.kind]);
  return s ? s.kind : "";
}

// ── The brief ────────────────────────────────────────────────────────
// One record per client: their latest intake row. Everything else (call
// sheet notes, the shoot's day plan) reads from it instead of copying it.
export function latestBrief(subs = []) {
  const rows = subs.filter((s) => s.kind === "intake").sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  const it = rows[0];
  if (!it) return null;
  const answers = {};
  for (const [q, a] of it.fields || []) if (q !== "for" && a) answers[q] = String(a);
  return { id: it.id, type: typeOf(it.utm?.type), answers, updated_at: it.updated_at || it.created_at };
}

// Questions whose answers are facts the shoot plan needs (by stem, so the
// same pull works across types).
const ONE_SHOT = /gutted to miss/i;
const MUST = /^Must-have shots/i;
const WANT = /^Shots you're interested in/i;
const WHERE = /location|venue/i;
const OUTFIT = /^Outfits/i;
const ONSITE = /unusual on site/i;
const LINKS = /^Links/i;
const VIBE = /^The vibe|^Style you're drawn to/i;

function pick(answers, re) {
  return Object.entries(answers).filter(([q]) => re.test(q)).map(([, a]) => a).filter(Boolean);
}

// What "Plan a shoot" pulls out of the brief: notes for the shoot card,
// an address guess, and the shots that go to the top of the shot list.
export function briefToShoot(brief) {
  if (!brief) return { notes: "", address: "", shots: [] };
  const a = brief.answers;
  const lines = [];
  const where = pick(a, WHERE); if (where.length) lines.push(`Where: ${where.join(" · ")}`);
  const vibe = pick(a, VIBE); if (vibe.length) lines.push(`Vibe: ${vibe.join(" · ")}`);
  const outfit = pick(a, OUTFIT); if (outfit.length) lines.push(`Outfits: ${outfit.join(" · ")}`);
  const onsite = pick(a, ONSITE); if (onsite.length) lines.push(`On site: ${onsite.join(" · ")}`);
  const links = pick(a, LINKS); if (links.length) lines.push(`Links: ${links.join(" · ")}`);
  const shots = [
    ...pick(a, ONE_SHOT).map((t) => `NON-NEGOTIABLE: ${t}`),
    ...pick(a, MUST).map((t) => `Must-have: ${t}`),
    ...pick(a, WANT).map((t) => `If the light allows: ${t}`),
  ].map((t) => t.replace(/\s+/g, " ").slice(0, 240));
  const first = where[0] || "";
  const address = /^[^\n]{3,80}$/.test(first) && !/\n/.test(first) ? first.split(/[.;]/)[0].trim().slice(0, 120) : "";
  return { notes: lines.join("\n"), address, shots };
}
