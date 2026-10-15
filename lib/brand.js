// The Brand Palette (docs/BRAND-PALETTE-SPEC.md §3): every section and
// field, the food/bakery preset, completeness, and the server-side
// sanitizer. One definition — the client's /portal/brand form, Studio's
// Brand view and the printable brand sheet all render from it.
//
// Storage (brand_palettes.data):
//   data[section][field]   the answer (shape depends on the field's kind)
//   data._talk["sec.fld"]  true = "Not sure, let's talk" (counts as handled)
//   data._suggest[section] a draft Brandon seeded (e.g. colors from a
//                          voucher) — shown as "are these yours?", never
//                          treated as their answer until they tap Use these
// Logos, the mood board, reference pictures and a brand guide are files in
// brand_assets; the field only says which asset kind it shows.

import { normHex } from "./brand-color";

export const BUSINESS_TYPES = [
  { id: "food", label: "Bakery, café or restaurant" },
  { id: "fitness", label: "Gym or fitness" },
  { id: "retail", label: "Shop or retail" },
  { id: "service", label: "Service business" },
  { id: "other", label: "Something else" },
];

export const COLOR_ROLES = [
  { id: "primary", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "accent", label: "Accent" },
  { id: "background", label: "Background" },
  { id: "text", label: "Text" },
  { id: "highlight", label: "Highlight" },
];

export const VIBE_SLIDERS = [
  ["Playful", "Serious"],
  ["Polished", "Raw"],
  ["Calm", "High-energy"],
  ["Classic", "Trendy"],
  ["Neighborly", "Premium"],
  ["Funny", "Heartfelt"],
];

const GOALS = [
  "More leads or inquiries", "More bookings or members", "More walk-ins", "Grow followers",
  "More Google reviews", "Fill an event", "Launch a product", "Hire", "Raise prices", "Look as good as we are",
];

// Field kinds:
//   text · long · choice (options) · chips (options, custom, max) ·
//   sliders (pairs, need) · colors · fonts · assets (asset) · checklist (options)
// star: one of the Essentials (about ten minutes, unlocks the first shoot).
export const SECTIONS = [
  {
    key: "business", letter: "A", title: "The business",
    blurb: "The basics every post, caption and ad points back to.",
    fields: [
      { id: "name", label: "Business name", star: true, hint: "The name customers see. If the legal name is different, add it after a dash." },
      { id: "type", label: "What kind of business is it?", kind: "choice", options: BUSINESS_TYPES.map((t) => t.id), optionLabels: Object.fromEntries(BUSINESS_TYPES.map((t) => [t.id, t.label])), star: true, hint: "Adds a few questions that fit your kind of business." },
      { id: "oneliner", label: "What you do, in one sentence", star: true, hint: "It becomes your bio line. e.g. “Family-run gym in Waverly with classes for every age.”" },
      { id: "where", label: "Where to find you", kind: "long", star: true, hint: "Address (or the towns you cover) and your hours." },
      { id: "link", label: "The one link every post points to", star: true, hint: "Your booking page, online store, menu or website.", placeholder: "https://" },
      { id: "contact", label: "Phone and website", hint: "However customers should reach you." },
      { id: "started", label: "Year started and team size" },
      { id: "story", label: "Your story, in a few lines", kind: "long", hint: "How it started and why. It shapes what I film." },
      { id: "products", label: "What you sell, with prices", kind: "long", hint: "One per line. Put ★ by the best seller and → by the one you want to push." },
      { id: "seasons", label: "Your year", kind: "long", hint: "Busy months, slow months, events, launches and holidays you care about. It feeds the content calendar." },
      { id: "reviews", label: "Google reviews", hint: "Your Google Business Profile link, and today's rating and number of reviews." },
    ],
  },
  {
    key: "visual", letter: "B", title: "Look",
    blurb: "Logo, colors and fonts. Watch the preview card come together as you go.",
    fields: [
      { id: "logos", label: "Your logo", kind: "assets", asset: "logo", star: true, hint: "Every version you have: main logo, wordmark, icon, light and dark. SVG or a big PNG is best; PDF and AI files are fine." },
      { id: "colors", label: "Your colors", kind: "colors", star: true, hint: "Up to six, each with a job. Tap a color pulled from your logo, or type a hex code." },
      { id: "fonts", label: "Your fonts", kind: "fonts", hint: "Type a Google Font name to see it. No idea is fine — I'll pick." },
      { id: "look", label: "Photo and video look", kind: "sliders", pairs: [["Warm", "Cool"], ["Bright", "Moody"], ["Film", "Clean"]], need: 2 },
      { id: "refs", label: "Pictures with the look you want", kind: "assets", asset: "reference", hint: "Screenshots are perfect." },
      { id: "ref_links", label: "Links to that look", kind: "long", hint: "Instagram posts, Pinterest, other businesses." },
      { id: "logo_rules", label: "How to use your logo", kind: "chips", options: ["Watermark on photos", "No watermark", "Logo at the end of videos", "Logo in a corner"], custom: true },
      { id: "guide", label: "Brand guide", kind: "assets", asset: "guide", hint: "Only if you already have one (PDF)." },
    ],
  },
  {
    key: "vibe", letter: "C", title: "Feel",
    blurb: "How it should feel when someone scrolls past you.",
    fields: [
      { id: "words", label: "Three to five vibe words", kind: "chips", star: true, custom: true, max: 5, options: ["Warm", "Scrappy", "Hometown", "Loud", "Inclusive", "Cozy", "Bold", "Calm", "Fun", "Elegant", "Honest", "Handmade"] },
      { id: "sliders", label: "Where you sit", kind: "sliders", star: true, pairs: VIBE_SLIDERS, need: 3, hint: "Drag toward the side that's more you. Leave any you can't decide." },
      { id: "meets", label: "We're like ___ meets ___", placeholder: "e.g. your grandma's kitchen meets a record store" },
      { id: "admire", label: "Three brands or accounts you admire, and why", kind: "long", hint: "Links welcome." },
      { id: "avoid", label: "Brands you never want to look like", kind: "long" },
      { id: "music", label: "Music", kind: "long", hint: "Genres, two or three songs that feel like you, and anything I should never use." },
      { id: "moodboard", label: "Mood board", kind: "assets", asset: "moodboard", hint: "Anything that feels like you — photos, screenshots, packaging." },
      { id: "mood_links", label: "Mood board links", kind: "long", hint: "Pinterest board, Instagram saves." },
    ],
  },
  {
    key: "voice", letter: "D", title: "Voice and words",
    blurb: "So captions sound like you wrote them.",
    fields: [
      { id: "text_like", label: "How would you text a customer?", kind: "long", hint: "Write one the way you really would." },
      { id: "words_use", label: "Words and phrases you always use", kind: "long" },
      { id: "words_avoid", label: "Words to avoid", kind: "long" },
      { id: "person", label: "Speak as", kind: "choice", options: ["We", "I", "Either"] },
      { id: "emoji", label: "Emoji?", kind: "choice", options: ["Yes", "A few", "No"] },
      { id: "emoji_which", label: "Which emoji", placeholder: "e.g. 🍞 ✨" },
      { id: "hashtags", label: "Hashtags", hint: "Your branded ones and the local ones." },
      { id: "captions", label: "Two or three captions you love", kind: "long", hint: "Yours or anyone's. Paste them or link them." },
      { id: "taglines", label: "Taglines or slogans you already use" },
      { id: "never_claim", label: "Claims to never make", kind: "long", hint: "Health or results claims, guarantees, pricing promises, anything your lawyer or franchise rules out." },
      { id: "cta", label: "Your go-to call to action", placeholder: "e.g. Order for pickup" },
    ],
  },
  {
    key: "audience", letter: "E", title: "Who you serve",
    blurb: "The people every post is for.",
    fields: [
      { id: "customer", label: "Your main customer", kind: "long", star: true, hint: "Age range, men/women mix, town or how far they come, stage of life, interests. Income if you know it." },
      { id: "why_buy", label: "Why they buy from you", kind: "long", star: true, hint: "The problem you solve for them." },
      { id: "objections", label: "Their top three hesitations", kind: "long", hint: "e.g. too expensive, intimidated, no time." },
      { id: "hangouts", label: "Where they spend time", kind: "long", hint: "Apps, local spots, groups, events." },
      { id: "secondary", label: "Other people you serve", kind: "long" },
      { id: "not_for", label: "Who you don't want to attract", kind: "long" },
      { id: "quotes", label: "Things customers have said to you", kind: "long", hint: "Their words, and only with their OK to use them." },
      { id: "personas", label: "Customer sketches", kind: "long", hint: "One to three made-up regulars. e.g. “Busy mom, 34, comes in Saturdays.” We can draft these together." },
    ],
  },
  {
    key: "offer", letter: "F", title: "Offer and positioning",
    blurb: "Why someone picks you over the place down the road.",
    fields: [
      { id: "different", label: "What makes you different?", kind: "long", hint: "What would your regulars say?" },
      { id: "competitors", label: "Competitors", kind: "long", hint: "Two to five, with links, and what they do better or worse." },
      { id: "price", label: "Price position", kind: "choice", options: ["Budget", "Mid", "Premium"] },
      { id: "promos", label: "Promotions", kind: "long", hint: "What's running now, and what's coming up this year." },
      { id: "lead_path", label: "What happens after someone sees a post?", kind: "long", hint: "Where they click, what they fill in, who gets back to them and how fast." },
      { id: "entry", label: "Your easy first step for a new customer", placeholder: "e.g. a free sample, a first-visit deal" },
    ],
  },
  {
    key: "goals", letter: "G", title: "Goals",
    blurb: "What we're aiming for. We'll put numbers on them together.",
    fields: [
      { id: "picks", label: "Pick one to three goals", kind: "chips", star: true, max: 3, options: GOALS, hint: "We'll set today's number, a target and a date together on a call." },
      { id: "win90", label: "What would make the next 90 days a win?", kind: "long" },
      { id: "dream", label: "Where you'd love to be in a year", kind: "long" },
    ],
  },
  {
    key: "content", letter: "H", title: "Content",
    blurb: "Where it goes, who posts it, and what we film.",
    fields: [
      { id: "platforms", label: "Where you post", kind: "chips", star: true, options: ["Instagram", "Facebook", "TikTok", "YouTube", "Google Business Profile", "LinkedIn", "Website", "Email"] },
      { id: "handles", label: "Handles and follower counts", kind: "long", hint: "One per line, e.g. Instagram @yourname · 1,240" },
      { id: "who_posts", label: "Who posts?", kind: "choice", star: true, options: ["I do", "Roth Media does", "A mix"] },
      { id: "cadence", label: "How often you post now, and how often you'd like to" },
      { id: "pillars", label: "Content pillars", kind: "chips", custom: true, max: 5, options: ["Behind the scenes", "Tips and how-tos", "Customer stories", "Offers", "Community", "The owner"], hint: "Three to five topics you keep coming back to." },
      { id: "formats", label: "Formats you want", kind: "chips", options: ["Reels", "Carousels", "Stories", "Long videos", "Website photos", "Ads"] },
      { id: "on_camera", label: "Who's happy to be on camera?", kind: "long", hint: "You, staff, customers — and how comfortable each is." },
      { id: "no_camera", label: "Anyone who must NOT appear", kind: "long", hint: "Staff or customers who can't be filmed. I keep them out of every frame." },
      { id: "releases", label: "Release forms", hint: "Who's signed one already, if anyone." },
      { id: "locations", label: "Places we can shoot", kind: "long", hint: "Inside, outside, partner spots." },
      { id: "moments", label: "Moments worth filming", kind: "long", hint: "Classes, events, deliveries, the season changing." },
      { id: "worked", label: "Content that worked before", kind: "long", hint: "Links, and why you think it worked." },
      { id: "hate", label: "Content you can't stand", kind: "long" },
      { id: "approval", label: "Who signs off, and how fast", kind: "long" },
    ],
  },
  {
    key: "logistics", letter: "I", title: "Logistics and access",
    blurb: "The practical bits for shoot days and posting.",
    fields: [
      { id: "contact", label: "Main contact and approver", kind: "long", hint: "Names, and the best way and time to reach each." },
      { id: "shoot_times", label: "Best shoot days and times", kind: "long" },
      { id: "access", label: "Parking, access and quiet hours", kind: "long" },
      { id: "accounts", label: "Account access", kind: "checklist", options: ["Meta Business Suite partner access", "Google Business Profile manager", "Website editor", "Email tool"], hint: "Never send me a password. I send an invite from each of these; tick it once you've accepted." },
      { id: "folders", label: "Brand folders you already have", kind: "long", hint: "Google Drive or Dropbox links." },
    ],
  },
];

// ── Presets: extra questions by kind of business (spec §1b) ──────────
// The next café or restaurant gets these for free. `after` = the field
// they slot in behind.
export const PRESETS = {
  food: {
    fields: {
      business: [
        { after: "type", id: "diet", label: "Dietary positioning", kind: "chips", custom: true, options: ["Gluten-free", "Celiac-safe", "Dedicated gluten-free kitchen", "Nut-free", "Dairy-free", "Vegan"] },
        { after: "diet", id: "allergens", label: "Other allergens, and how you handle cross-contact", kind: "long" },
        { after: "products", id: "stars", label: "Menu stars", kind: "long", hint: "Signature items, the best seller, and the one to push." },
        { after: "seasons", id: "menu_seasons", label: "Seasonal and holiday menu", kind: "long", hint: "e.g. pumpkin in fall, cookie boxes in December, Easter, Mother's Day, graduation, wedding cakes." },
        { after: "menu_seasons", id: "buy", label: "How people buy", kind: "chips", options: ["Walk-in", "Pre-orders", "Custom orders", "Farmers markets and pop-ups", "Wholesale to cafés", "Shipping"] },
        { after: "buy", id: "buy_details", label: "Buying details", kind: "long", hint: "Walk-in hours, pre-order lead time, market dates and spots." },
      ],
      voice: [
        { after: "never_claim", id: "claims_ok", label: "Claims you're allowed to make", kind: "long", hint: "“Gluten-free” has an FDA definition: under 20 ppm gluten. Tell me what you test or certify, and every caption stays inside it." },
      ],
      audience: [
        { after: "customer", id: "groups", label: "Customer groups", kind: "chips", custom: true, options: ["Celiac community", "Parents of kids with allergies", "Wedding and event clients", "Local regulars"] },
      ],
      content: [
        { after: "moments", id: "craft", label: "Craft shots I should never miss", kind: "chips", custom: true, options: ["Flour dust", "The oven door", "The crumb, cut open", "Decorating", "The 5 a.m. start", "The owner's hands"] },
        { after: "craft", id: "why_story", label: "Your why", kind: "long", hint: "Why you started. Only if you want to tell it on camera." },
      ],
    },
    // Extra chip options on existing fields.
    options: {
      "goals.picks": ["Pre-orders per month", "Custom-order inquiries", "Google reviews", "Instagram followers", "Sell-out rate at markets"],
      "content.pillars": ["The bake", "Seasonal menu"],
    },
  },
};

export const presetOf = (data) => (PRESETS[data?.business?.type] ? data.business.type : null);

// A section's fields for this palette (base + preset extras, in order).
export function fieldsFor(section, data) {
  const sec = typeof section === "string" ? SECTIONS.find((s) => s.key === section) : section;
  const preset = PRESETS[presetOf(data)];
  let list = sec.fields.map((f) => {
    const extra = preset?.options?.[`${sec.key}.${f.id}`];
    return extra ? { ...f, options: [...new Set([...(f.options || []), ...extra])] } : f;
  });
  for (const x of preset?.fields?.[sec.key] || []) {
    const at = list.findIndex((f) => f.id === x.after);
    list = at < 0 ? [...list, x] : [...list.slice(0, at + 1), x, ...list.slice(at + 1)];
  }
  return list;
}

// Every field that could ever be stored (all presets), for the sanitizer.
const ALL_FIELDS = (() => {
  const m = new Map();
  for (const s of SECTIONS) for (const f of s.fields) m.set(`${s.key}.${f.id}`, f);
  for (const p of Object.values(PRESETS)) {
    for (const [sec, list] of Object.entries(p.fields)) for (const f of list) m.set(`${sec}.${f.id}`, f);
  }
  return m;
})();

export const ESSENTIALS = SECTIONS.flatMap((s) => s.fields.filter((f) => f.star).map((f) => ({ section: s.key, letter: s.letter, ...f })));

// ── Filled / completeness ───────────────────────────────────────────
// assets: [{ kind }] — so the logo field counts once a logo is uploaded.
export function isFilled(field, value, assets = []) {
  switch (field.kind) {
    case "assets": return assets.some((a) => a.kind === field.asset);
    case "chips": return Array.isArray(value) && value.length > 0;
    case "sliders": return value && typeof value === "object" && Object.keys(value).length >= (field.need || 1);
    case "colors": return Array.isArray(value) && value.some((c) => normHex(c?.hex));
    case "fonts": return Boolean(value && (value.headline || value.body || value.pick));
    case "checklist": return value && typeof value === "object" && Object.values(value).some(Boolean);
    default: return String(value || "").trim().length > 0;
  }
}

export const talkKey = (section, id) => `${section}.${id}`;
export const isTalk = (data, section, id) => Boolean(data?._talk?.[talkKey(section, id)]);

// { essentials: { done, of, missing:[{section, id, label}] },
//   deep: { done, of, pct }, sections: { key: { done, of } }, pct }
// A field marked "Not sure, let's talk" counts as handled.
export function completeness(data = {}, assets = []) {
  const sections = {};
  let done = 0, of = 0, eDone = 0, eOf = 0, dDone = 0, dOf = 0;
  const missing = [];
  for (const s of SECTIONS) {
    let sd = 0;
    const list = fieldsFor(s, data);
    for (const f of list) {
      const ok = isFilled(f, data?.[s.key]?.[f.id], assets) || isTalk(data, s.key, f.id);
      if (ok) sd++;
      if (f.star) { eOf++; if (ok) eDone++; else missing.push({ section: s.key, id: f.id, label: f.label }); }
      else { dOf++; if (ok) dDone++; }
    }
    sections[s.key] = { done: sd, of: list.length };
    done += sd; of += list.length;
  }
  return {
    essentials: { done: eDone, of: eOf, missing },
    deep: { done: dDone, of: dOf, pct: dOf ? Math.round((dDone / dOf) * 100) : 0 },
    sections,
    pct: of ? Math.round((done / of) * 100) : 0,
  };
}

// ── Sanitizer (server) ───────────────────────────────────────────────
const clip = (v, n) => String(v ?? "").slice(0, n);
const MAX = { text: 400, long: 4000 };

function clean(field, v) {
  switch (field.kind) {
    case "choice":
      return field.options.includes(v) ? v : "";
    case "chips": {
      const list = Array.isArray(v) ? v : [];
      const out = [...new Set(list.map((x) => clip(x, 60).trim()).filter(Boolean))];
      const ok = field.custom ? out : out.filter((x) => (field.options || []).includes(x) || Object.values(PRESETS).some((p) => Object.values(p.options || {}).flat().includes(x)));
      return ok.slice(0, field.max || 12);
    }
    case "sliders": {
      const out = {};
      for (const [l, r] of field.pairs) {
        const k = `${l}|${r}`;
        const n = Number(v?.[k]);
        if (n >= 1 && n <= 5) out[k] = Math.round(n);
      }
      return out;
    }
    case "colors":
      return (Array.isArray(v) ? v : []).slice(0, 6).map((c) => ({
        hex: normHex(c?.hex) || "#000000",
        role: COLOR_ROLES.some((r) => r.id === c?.role) ? c.role : "accent",
        name: clip(c?.name, 40),
      }));
    case "fonts":
      return { headline: clip(v?.headline, 60).trim(), body: clip(v?.body, 60).trim(), pick: Boolean(v?.pick) };
    case "checklist": {
      const out = {};
      for (const o of field.options) if (v?.[o]) out[o] = true;
      return out;
    }
    case "assets":
      return undefined; // files live in brand_assets
    default:
      return clip(v, field.kind === "long" ? MAX.long : MAX.text);
  }
}

// changes: { "section.field": value, "_talk.section.field": bool,
//            "visual.logo_colors": [hex], "_suggest.section": "used"|"dismissed" }
// Returns { data, touched: [sections] } — unknown keys are dropped.
export function applyChanges(data, changes) {
  const next = { ...(data || {}) };
  const touched = new Set();
  for (const [key, value] of Object.entries(changes || {}).slice(0, 80)) {
    if (key.startsWith("_talk.")) {
      const k = key.slice(6);
      if (!ALL_FIELDS.has(k)) continue;
      const t = { ...(next._talk || {}) };
      if (value) t[k] = true; else delete t[k];
      next._talk = t;
      touched.add(k.split(".")[0]);
      continue;
    }
    if (key.startsWith("_suggest.")) {
      const sec = key.slice(9);
      if (!next._suggest?.[sec] || !["used", "dismissed"].includes(value)) continue;
      next._suggest = { ...next._suggest, [sec]: { ...next._suggest[sec], state: value } };
      continue;
    }
    if (key === "visual.logo_colors") {
      const list = [...new Set((Array.isArray(value) ? value : []).map(normHex).filter(Boolean))].slice(0, 8);
      next.visual = { ...(next.visual || {}), logo_colors: list };
      continue;
    }
    const field = ALL_FIELDS.get(key);
    if (!field) continue;
    const v = clean(field, value);
    if (v === undefined) continue;
    const [sec, id] = key.split(".");
    next[sec] = { ...(next[sec] || {}), [id]: v };
    touched.add(sec);
  }
  return { data: next, touched: [...touched] };
}

// Per-section status, stored so Studio lists can show progress without
// recomputing: { key: { done, of, at, by } } for the sections just touched.
export function sectionStatus(prev, data, assets, touched, by) {
  const c = completeness(data, assets);
  const out = { ...(prev || {}) };
  const at = new Date().toISOString();
  for (const s of SECTIONS) {
    out[s.key] = { ...c.sections[s.key], at: touched.includes(s.key) ? at : out[s.key]?.at || null, by: touched.includes(s.key) ? by : out[s.key]?.by || null };
  }
  out._essentials = c.essentials.done;
  out._essentials_of = c.essentials.of;
  out._pct = c.pct;
  return out;
}

// ── Prefill from the business brief (lib/intake.js) ──────────────────
// Never ask twice: answers from their brief land in the matching empty
// fields when the palette is first created. Keys are the brief's
// question text, so a renamed question simply stops prefilling.
const FROM_BRIEF = [
  ["Business name and what you do", "business.oneliner"],
  ["Who's on camera", "content.on_camera"],
  ["Dates and times that work", "logistics.shoot_times"],
  ["Anything unusual on site", "logistics.access"],
  ["Brand assets you have", "logistics.folders"],
];

export function prefillChanges({ brief, client } = {}) {
  const changes = {};
  if (client?.name) changes["business.name"] = client.name;
  if (client?.phone) changes["business.contact"] = client.phone;
  if (brief?.type === "business") {
    for (const [q, key] of FROM_BRIEF) if (brief.answers?.[q]) changes[key] = brief.answers[q];
  }
  return changes;
}

// The report-link slug (phase 2): readable + a short random tail.
export function brandSlug(name) {
  const base = String(name || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "brand";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));
