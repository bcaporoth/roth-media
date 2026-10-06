// Intake forms + orientation-call sheets. Both live in the `submissions`
// table so nothing new has to be created in Supabase:
//   kind "intake_sent" — Brandon tapped "Send intake link" (placeholder; no answers yet)
//   kind "intake"      — the client's answers (fields = [[question, answer]])
//   kind "call"        — Brandon's call sheet (fields = answers, utm = { type, checks, call_date })
// Shared by the public /intake page, Studio → Clients, and the forms API.

import { ADDONS, money } from "./packages";

export const SITE = "https://rothmediaco.com";

// The add-ons to walk through on the call, by name, straight from the menu
// (per-package variants like "add a promo to a Mini" are folded into the main one).
// "A website" → "a website"; brand names keep their capital.
const lowerName = (s) => (/^(Facebook|Instagram|TikTok)\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const addonNames = (cat) => ADDONS[cat].filter((a) => !a.alt).map((a) => lowerName(a.name)).join(", ");
// The same list with prices, for the client's intake form.
const addonMenu = (cat) =>
  ADDONS[cat].filter((a) => !a.alt).map((a) => `${lowerName(a.name)} (${a.price === 0 ? "free" : money(a.price)}${a.monthly ? `, then ${money(a.monthly)}/mo` : ""})`).join(", ");

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
    { q: "Must-have shots", hint: "The moments and people you absolutely need. A short list is perfect.", long: true },
    { q: "Family groupings I should know about", hint: "Split families, who's who, anyone to keep apart.", long: true, opt: true },
    { q: "The vibe", hint: "Candid and documentary, classic and posed, or a mix?" },
    { q: "Shots you're interested in", hint: "Ideas you've seen and like. Instagram or Pinterest links welcome. Not required, things to try if the day allows.", long: true, opt: true },
    { q: "Add-ons you're interested in", hint: `Any of these, or 'not sure' and we'll talk it through: ${addonMenu("wedding")}.`, long: true, opt: true },
    { q: "Budget range you're working with", opt: true },
    { q: "How did you hear about me?", opt: true },
    { q: "Anything else", hint: "Surprises planned, accessibility, things to avoid.", long: true, opt: true },
  ],
  engagement: [
    { q: "Both of your names", hint: "And how you'd like to be introduced." },
    { q: "Wedding date", hint: "So the session lands in time for save-the-dates or invitations.", opt: true },
    { q: "Dates that work for the session", hint: "And the time of day. The hour before sunset is my favorite." },
    { q: "Confirmed location(s)", hint: "Where we're shooting, if it's set. Say if anything's still an idea, or 'suggest some' and I will.", long: true },
    { q: "Must-have shots", hint: "The pictures you absolutely need. The ring, the dog, the spot where it happened.", long: true },
    { q: "Shots you're interested in", hint: "Ideas you've seen and like. Instagram or Pinterest links welcome. Not required, things to try if the light allows.", long: true, opt: true },
    { q: "Outfits", hint: "One look or two? Dressy, casual, both.", opt: true },
    { q: "What are the photos for?", hint: "Save-the-dates, the wedding website, prints, a guestbook.", opt: true },
    { q: "Your story, in a few lines", hint: "How you met, how the proposal went. It shapes what I shoot.", long: true, opt: true },
    { q: "The vibe", hint: "Candid and playful, romantic and quiet, editorial." },
    { q: "Anything that helps you relax on camera", hint: "Pets, props, a playlist, a drink after.", long: true, opt: true },
    { q: "How did you hear about me?", opt: true },
    { q: "Anything else", long: true, opt: true },
  ],
  family: [
    { q: "Who's in the photos", hint: "Names, and the kids' ages if any." },
    { q: "What's the occasion?" },
    { q: "Dates that work", hint: "And the time of day you'd prefer." },
    { q: "Confirmed location, or ideas", hint: "If it's set, where. If not, say 'suggest some' and I will." },
    { q: "Must-have shots", hint: "Groupings or specific pictures you need to walk away with.", long: true, opt: true },
    { q: "Shots you're interested in", hint: "Ideas you've seen and like. Not required, things to try if the kids allow.", long: true, opt: true },
    { q: "Style you're drawn to", hint: "Bright and airy, warm and moody, candid." },
    { q: "Anything that helps the kids or grandparents have a good time", long: true, opt: true },
    { q: "How did you hear about me?", opt: true },
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
    { q: "Must-have shots", hint: "Products, spaces, people or moments that have to be in the final cut.", long: true },
    { q: "Brand assets you have", hint: "Logo, colors, fonts — a link, or 'I'll send'.", opt: true },
    { q: "Shots you're interested in", hint: "Styles or ideas you've seen and like. Links welcome.", long: true, opt: true },
    { q: "Add-ons you're interested in", hint: `More from the same day, or help after: ${addonMenu("business")}. Or 'not sure' and we'll talk it through.`, long: true, opt: true },
    { q: "Budget range", opt: true },
    { q: "How did you hear about me?", opt: true },
    { q: "Anything else", long: true, opt: true },
  ],
};

// What Brandon fills in on the orientation call, in three parts: are we
// aligned with what they first asked for, the event in detail (the same
// questions as /intake — anything they already answered is prefilled), and
// the deal. checks: tap-to-tick.
const ALIGN = {
  wedding: ["What they asked for in the inquiry — still right? (date, photo/video, rough budget)", "What a win looks like to them, in their words"],
  engagement: ["What they asked for in the inquiry — still right? (date, location, part of the wedding collection or on its own)", "What the photos are for and what a win looks like to them"],
  family: ["What they asked for in the inquiry — still right? (occasion, date, budget)", "What they want on the wall or in the album"],
  business: ["What they asked for in the inquiry — still right? (goal, formats, budget)", "What success looks like in 90 days (calls, bookings, followers, sales)"],
};
const DEAL = {
  wedding: [`Package discussed and add-ons (${addonNames("wedding")})`, "Price quoted", "Travel / lodging", "Hesitations or questions they raised", "Next step, by when, who sends what"],
  engagement: ["Package discussed and price quoted (included with the wedding, or on its own)", "Locations and timing agreed", "Hesitations or questions they raised", "Next step, by when"],
  family: ["Package discussed and price quoted", "Hesitations or questions they raised", "Next step, by when"],
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
    { title: "The event, in detail", prompts: INTAKE[id].map((q) => q.q) },
    { title: "The deal", prompts: DEAL[id] },
  ];
  return [id, { sections, prompts: sections.flatMap((x) => x.prompts), checks: CHECKS[id] }];
}));

// Kinds that count as "they reached out" (the initial inquiry).
export const INQUIRY_KINDS = ["quote", "contact", "card", "promo", "booking"];

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
