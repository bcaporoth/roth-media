// Intake forms + orientation-call sheets. Both live in the `submissions`
// table so nothing new has to be created in Supabase:
//   kind "intake_sent" — Brandon tapped "Send intake link" (placeholder; no answers yet)
//   kind "intake"      — the client's answers (fields = [[question, answer]])
//   kind "call"        — Brandon's call sheet (fields = answers, utm = { type, checks, call_date })
// Shared by the public /intake page, Studio → Clients, and the forms API.

export const SITE = "https://rothmediaco.com";

export const TYPES = [
  { id: "wedding", label: "Wedding" },
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
    { q: "Ceremony venue and town" },
    { q: "Reception venue", hint: "If it's somewhere different.", opt: true },
    { q: "Rough guest count", opt: true },
    { q: "Rough timeline", hint: "Ceremony start, reception end — a guess is fine.", long: true },
    { q: "Photo, video, or both?" },
    { q: "How many hours of coverage are you picturing?", opt: true },
    { q: "The three moments you can't miss", long: true },
    { q: "Family groupings I should know about", hint: "Split families, who's who, anyone to keep apart.", long: true, opt: true },
    { q: "The vibe", hint: "Candid and documentary, classic and posed, or a mix?" },
    { q: "Anything you've saved that you love", hint: "Instagram or Pinterest links.", long: true, opt: true },
    { q: "Budget range you're working with", opt: true },
    { q: "How did you hear about me?", opt: true },
    { q: "Anything else", hint: "Surprises planned, accessibility, things to avoid.", long: true, opt: true },
  ],
  family: [
    { q: "Who's in the photos", hint: "Names, and the kids' ages if any." },
    { q: "What's the occasion?" },
    { q: "Dates that work", hint: "And the time of day you'd prefer." },
    { q: "Location ideas", hint: "Or say 'suggest some' and I will.", opt: true },
    { q: "Must-have groupings or a specific shot", long: true, opt: true },
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
    { q: "Shoot location(s)" },
    { q: "Brand assets you have", hint: "Logo, colors, fonts — a link, or 'I'll send'.", opt: true },
    { q: "Examples you like", hint: "Links.", long: true, opt: true },
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
  family: ["What they asked for in the inquiry — still right? (occasion, date, budget)", "What they want on the wall or in the album"],
  business: ["What they asked for in the inquiry — still right? (goal, formats, budget)", "What success looks like in 90 days (calls, bookings, followers, sales)"],
};
const DEAL = {
  wedding: ["Package discussed and add-ons (second shooter, extra hours, drone)", "Price quoted", "Travel / lodging", "Hesitations or questions they raised", "Next step, by when, who sends what"],
  family: ["Package discussed and price quoted", "Hesitations or questions they raised", "Next step, by when"],
  business: ["Deliverables, turnaround, revisions", "Package discussed and price quoted", "Who signs off", "Next step, by when"],
};
const CHECKS = {
  wedding: ["Date held", "Package agreed", "Retainer link sent", "Welcome packet sent", "Calendar invite sent", "Follow-up scheduled"],
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
