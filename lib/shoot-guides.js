// Prep guides per shoot type: the gear to pack and the shots to get.
// Copied onto a new shoot as its checklist (items tagged group "gear" or
// "shots"), then edited per job — add, remove, tick off. Brandon's own
// guides live here; the print sheet at /portal/admin/shoots/print uses the
// same lists.

import { addonNames } from "./packages";

// First line of every shot list: the add-ons the booking can carry, so
// nothing paid for gets missed on the day. Event shoots sell from the
// business menu.
const ADDON_KIND = { wedding: "wedding", engagement: "wedding", family: "family", business: "business", event: "business" };
export const addonCheck = (kind) =>
  ADDON_KIND[kind] ? `Check the booking for add-ons (${addonNames(ADDON_KIND[kind])}) — plan the day for each one` : "";

// Packed for every shoot, whatever the type.
export const GEAR_BASE = [
  "Camera body + backup body",
  "Lenses: 24–70, 85 (or 50), wide",
  "Batteries charged (all of them) + charger in the bag",
  "Memory cards formatted, at least 2 spares",
  "Gimbal balanced and charged",
  "Tripod / monopod",
  "ND filters + lens cloth",
  "Phone charged + car charger",
  "Water, snacks, layers",
];

// On-camera reminders — the things that get forgotten once the day is
// moving. Checked on the shoot screen, not before it: WB, slo-mo, holding
// still, the angle on the locked-off cam. Every shoot gets these; types
// add their own below.
export const CAMERA_BASE = [
  "WHITE BALANCE — set it for this light now, and re-set every time you move rooms or the sun changes",
  "SLO-MO — shoot at least one 120fps pass before you leave: hands, walking, spins, reactions, confetti. Don't leave without it",
  "Shutter: 1/50 at 24p (1/250 for slo-mo) — ND on if you're wide open outside",
  "STAY STILL — plant your feet, elbows in, breathe out, then roll. No drifting, no walking while rolling unless it's a move",
  "TRIPOD CAM — check the angle on the back screen before you walk away: level horizon, eye-level or just above, headroom, nothing growing out of their head",
  "Audio: levels peaking around −12, headphones on for 10 seconds, wind cover outside",
  "Red dot — confirm you're actually recording on every clip; glance at the time counter",
  "Focus on the eyes, then lock it (or confirm face-tracking has the right face)",
  "Both bodies on the same frame rate, resolution and picture profile",
  "Play one clip back before the last setup: exposure, audio, focus, WB",
];

// Shoots that live by the light. Content Days are indoors (a bakery, a shop)
// — sunset and golden hour are noise there, so the UI hides them.
export const usesSun = (kind) => kind !== "business";

export const GUIDES = {
  wedding: {
    label: "Wedding",
    gear: [
      "Lav mics + recorder tested, fresh batteries",
      "Second body ready for ceremony wide",
      "Flash + diffuser for the reception",
      "Backup drive to dump cards before bed",
    ],
    camera: [
      "Ceremony cam rolling before the processional — check it's still rolling at the vows",
      "Switch to slo-mo for the exit, confetti, first dance spin, cake",
      "Reception: WB will change when the lights go down — re-set it",
    ],
    shots: [
      addonCheck("wedding"),
      "Details: rings, dress, invites, florals",
      "Getting ready candids; first look reaction",
      "Ceremony wide locked off + roaming for vows and reactions",
      "Family formals (work the list, two minutes each)",
      "Couple session at golden hour — 15 min, no exceptions",
      "Speeches: two angles, DJ board audio if possible",
      "First dance, dance floor, exit",
      "Venue + decor b-roll before guests move it",
    ],
  },
  engagement: {
    label: "Engagement",
    gear: [
      "85 (or 50) for the close stuff, wide for the big-scene frame",
      "Reflector + a small LED for after sunset",
      "Prompt list on the phone",
      "Blanket / towel for sitting shots, bug spray",
      "Ring macro: 100mm or extension tube",
    ],
    camera: [
      "Slo-mo pass of the walk, the spin, the dress twirl",
      "Backlit at golden hour: expose for the faces, let the sky go",
    ],
    shots: [
      "Ring on her hand — macro, then on his too if he wears one",
      "Walking toward camera, hands held, laughing",
      "Wide frame: tiny couple, big scene",
      "Forehead to forehead, close and quiet",
      "The dip / spin / lift — whatever they're up for",
      "Outfit change #2 in the best light",
      "Save-the-date frame: space for text, both looking at camera",
      "Golden hour backlit silhouette",
      "A few frames of each alone — they'll want them",
    ],
  },
  family: {
    label: "Family / portraits",
    gear: [
      "Reflector",
      "Prompt list on the phone",
      "Blanket or stool for little ones",
    ],
    shots: [
      addonCheck("family"),
      "Whole family first while kids are fresh",
      "Parents together; each parent with each kid",
      "Kids solo, then siblings together",
      "Walking toward camera; tickle fight; whisper a secret",
      "Close-ups: hands, details, the thing they brought",
      "Wide environmental shot in the best light",
    ],
  },
  business: {
    label: "Content Day",
    gear: [
      "Lav mic + recorder for the owner",
      "Small LED light + stand",
      "Shot list agreed with the owner, on the phone",
    ],
    camera: [
      "Vertical 9:16 pass of every b-roll setup — headroom for captions",
      "Slo-mo on hands working, product spins, pours, steam",
      "Mixed light inside (window + tungsten) — pick one, kill the other or set WB to it",
      "Owner on camera: tripod, eye-level, eyes on the top third — check the angle before rolling",
    ],
    shots: [
      addonCheck("business"),
      "Owner on camera: 3 hooks (question, bold claim, behind-the-scenes)",
      "The ONE thing to promote, plus 2–3 secondary offers",
      "Hands working, product close-ups, storefront, signage",
      "Customers reacting (with permission)",
      "Vertical framing for reels — headroom for captions",
      "Testimonial from a real customer if one's around",
    ],
  },
  event: {
    label: "Event",
    gear: [
      "Lav or board feed for speakers",
      "Flash for indoor rooms",
      "Schedule + key people list on the phone",
    ],
    camera: [
      "Slo-mo on crowd energy, applause, toasts",
      "Stage lights: WB and exposure will swing — check after every lighting change",
    ],
    shots: [
      addonCheck("event"),
      "Wide establishing shots first",
      "Details: signage, decor, food, setup",
      "Speakers / awards with a second angle for reactions",
      "Crowd energy b-roll for the recap",
      "Key people named in the brief",
    ],
  },
  documentary: {
    label: "Documentary",
    gear: [
      "Two bodies for the interview (wide + tight), both on tripods",
      "Lav on the subject + shotgun/boom as backup, recorder rolling separately",
      "Key light + fill (or a window and a reflector), stand, sandbag",
      "Slider or gimbal for the b-roll pass",
      "Headphones — you listen to every interview live",
      "Release forms (paper or on the phone) + a pen",
      "Scanner app / copy stand for archival photos and documents",
    ],
    camera: [
      "Interview: eyeline just off-axis, subject on the thirds, headroom tight, background with depth",
      "Both bodies matched: 24p, 1/50, same WB, same profile — check before the first question",
      "Record 30 seconds of room tone before you break the set",
      "Audio: lav AND backup rolling, levels around −12, listen on headphones for hum / HVAC",
      "B-roll: hold every shot 10 seconds, slo-mo pass on candles, hands, light through glass",
    ],
    shots: [
      "Exterior establishing: front, steeple, wide from across the street, dawn or dusk",
      "Interior wides: nave from the back, from the altar, from the balcony",
      "Details: stained glass, candles, hymnals, pews, hands praying, bells, cornerstone",
      "The people: arrivals, greetings, the congregation singing, the priest at work",
      "Archival: old photos, documents, newspaper clippings — flat, even light, no glare",
      "Each interview subject: a quiet portrait frame after the interview",
      "Corning context: Market Street, the river, the other churches named in the story",
    ],
  },
  other: {
    label: "Shoot",
    gear: [],
    shots: ["Confirm what they want to walk away with", "Wide, medium, close of everything that matters"],
  },
};

// Fresh checklist for a new shoot: base gear + type gear + type shots.
export function seedChecklist(kind) {
  const g = GUIDES[kind] || GUIDES.other;
  return [
    ...GEAR_BASE.map((text) => ({ text, done: false, group: "gear" })),
    ...g.gear.map((text) => ({ text, done: false, group: "gear" })),
    ...CAMERA_BASE.map((text) => ({ text, done: false, group: "camera" })),
    ...(g.camera || []).map((text) => ({ text, done: false, group: "camera" })),
    ...g.shots.map((text) => ({ text, done: false, group: "shots" })),
  ];
}

// ── Playbook ──────────────────────────────────────────────────────────
// Five kinds of list live on every shoot and in the Studio → Playbook
// library: the flow of the day (timed), camera settings & reminders, shots
// to get, poses / prompts, and gear to pack. The library is editable in the browser (table
// `playbook`); what's below is only the starter set it gets seeded with.

export const GROUPS = ["flow", "camera", "shots", "poses", "gear"];
export const GROUP_LABEL = { gear: "Gear to pack", camera: "Camera: settings & reminders", shots: "Shots to get", flow: "Flow of the day", poses: "Poses & prompts" };
export const SECTION_LABEL = { camera: "Settings & reminders", gear: "Gear lists", shots: "Shot lists", flow: "Flows", poses: "Poses" };
export const PLAYBOOK_KINDS = ["any", "wedding", "engagement", "family", "business", "event", "documentary", "other"];
// Lists that don't apply to a kind are hidden on the shoot, not just empty.
const NO_POSES = new Set(["business", "event", "documentary"]);
export const showsGroup = (kind, group) => !(group === "poses" && NO_POSES.has(kind));
// Quick labels for the on-the-day roll gate (sticky strip in day mode). The
// long versions live in CAMERA_BASE; these are what fits on a chip.
export const ROLL_GATE = [
  { tag: "WB", tip: "White balance set for THIS light?" },
  { tag: "1/50", tip: "Shutter 1/50 at 24p — 1/250 for slo-mo" },
  { tag: "120fps", tip: "Have you shot the slo-mo pass yet?" },
  { tag: "Plant feet", tip: "Feet planted, elbows in, breathe out, then roll" },
  { tag: "Tripod angle", tip: "Check the locked-off cam on the back screen before you walk away" },
  { tag: "Red dot", tip: "Actually recording? Look at the counter" },
  { tag: "Audio −12", tip: "Levels peaking around −12, headphones on" },
];
// "Before you leave" counters — stored on the shoot's checklist as group
// "wrap" ({ need, got }). Seeded the first time day mode touches them.
export const WRAP_DEFAULT = [
  { text: "Slo-mo pass (120fps)", need: 1 },
  { text: "Played one clip back (exposure · audio · focus · WB)", need: 1 },
  { text: "Room tone / wild sound", need: 1 },
  { text: "Cards dumped to the backup drive", need: 1 },
];
// Items saved before the split have no group — they were shots.
export const groupOf = (c) => (GROUPS.includes(c?.group) || c?.group === "wrap" ? c.group : "shots");

const FLOWS = {
  engagement: {
    title: "Engagement session — run of show",
    items: [
      "Arrive 15 early, walk the spot, pick 3 backgrounds",
      "Outfit 1 — warm-up prompts, easy walking frames",
      "Ring + detail frames while the light is flat",
      "Move to spot 2 — sitting / close prompts",
      "Outfit 2 — best light, save-the-date frame",
      "Golden hour — backlit, silhouettes, wide scene",
      "Blue hour / LED frames if they're game",
      "Cull sneak peek that night, 5 frames by morning",
    ],
  },
  wedding: {
    title: "Wedding day — run of show",
    items: [
      "Arrive, scout light, park close to the exit",
      "Details: rings, dress, invites, florals (30 min)",
      "Getting ready — candids, letters, mic the groom",
      "First look / wedding party portraits",
      "Lock off ceremony wide, check audio, roll early",
      "Ceremony",
      "Family formals — work the list (20 min)",
      "Cocktail hour: room + decor b-roll before guests sit",
      "Grand entrance, first dance",
      "Speeches — two angles, DJ board audio",
      "Golden hour couple session (15 min, no exceptions)",
      "Dance floor, cake, exit",
      "Dump cards to the backup drive before bed",
    ],
  },
  business: {
    title: "Content Day — run of show",
    items: [
      "Arrive, walk the space with the owner, pick 3 spots",
      "Set light + mic, confirm the ONE thing to promote",
      "Owner on camera: 3 hooks, then the main talking points",
      "Process / hands-working b-roll",
      "Product + detail close-ups",
      "Team and customers (permission first)",
      "Storefront, signage, exterior — vertical and wide",
      "Stills: owner headshot, team, space",
      "Wrap: confirm delivery date + what they'll post first",
    ],
  },
  family: {
    title: "Family session — 60 minutes",
    items: [
      "Meet, loosen everyone up, no camera for 2 minutes",
      "Whole family first while the kids are fresh",
      "Parents together",
      "Each parent with each kid",
      "Kids solo, then siblings",
      "Play: walking, tickle fight, whisper a secret",
      "One wide environmental frame in the best light",
      "Show them a frame on the back of the camera before you leave",
    ],
  },
  documentary: {
    title: "Documentary day — run of show",
    items: [
      "Arrive, walk the space with your contact, pick the interview spot (depth, quiet, no HVAC)",
      "Set the interview: two bodies, key + fill, lav + boom, test a line, listen",
      "Interview 1 — warm-up questions first, the hard ones in the middle, 'anything I didn't ask?' last",
      "Room tone 30s, then a quiet portrait frame of them",
      "Interview 2 (same setup, re-check WB if the light moved)",
      "B-roll pass: wides, details, hands, light — hold 10s each, slo-mo on the small things",
      "Archival: photos and documents flat under even light",
      "Exterior at the best light, then wrap: releases signed, cards dumped tonight",
    ],
  },
  event: {
    title: "Event — run of show",
    items: [
      "Arrive early: establishing shots, signage, empty room",
      "Find the organizer — confirm key people + key moments",
      "Arrivals and mingling",
      "Speakers / awards with a reaction angle",
      "Crowd energy b-roll",
      "Group photo before people leave",
    ],
  },
};

const POSES = {
  engagement: {
    title: "Engagement — poses & prompts",
    items: [
      "Walk toward me, bump hips every third step",
      "Tell her the thing you'd never say in front of her mom",
      "Pick her up — hold it — now spin once",
      "Nose to nose, eyes closed, breathe together",
      "Sit close, her legs over his, tell me about the proposal",
      "Fix his collar / her hair — slow, don't look at me",
      "Walk away from me, look back over your shoulder on three",
      "Almost-kiss: stop an inch away and hold it",
      "Ring hand on his chest, look at the ring, then at him",
      "Wide frame: stand small in the big scene, forehead to forehead",
    ],
  },
  wedding: {
    title: "Couple — poses & prompts",
    items: [
      "Walk toward me holding hands, bump hips, look at each other",
      "Forehead to forehead, eyes closed, breathe",
      "Whisper your grocery list in your most romantic voice",
      "Wrap from behind, sway like the first dance",
      "Spin her out and pull her back in",
      "Sit close — hands on the ring, tell me how you met",
      "Almost-kiss: stop an inch away and hold it",
      "Walk away from me, look back over your shoulder",
      "Veil / jacket over both of you, close and quiet",
      "Wide frame: tiny couple, big scene",
    ],
  },
  family: {
    title: "Family — poses & prompts",
    items: [
      "Everybody squish in — who gives the best hugs?",
      "Walk toward me holding hands, swing the littlest one",
      "Kids: race to mom and dad",
      "Tell dad a secret; dad, react big",
      "Parents kiss, kids look grossed out",
      "Sit on the blanket, everyone look at the youngest",
      "Piggyback rides",
      "Just hands: big hands holding little hands",
    ],
  },
  business: {
    title: "Owner / headshot — posing",
    items: [
      "Weight on the back foot, shoulders angled, chin toward me",
      "Arms crossed with a real laugh, not a tough face",
      "Leaning on the counter / doorway, mid-conversation",
      "Hands busy: doing the actual work",
      "Looking off camera at a customer, then back to me",
      "Walking toward camera through the space",
      "Seated, leaning in, elbows on knees — the 'tell me more' frame",
    ],
  },
};

// Starter library, as rows for the playbook table.
export function defaultPlaybook() {
  const rows = [
    { section: "gear", kind: "any", title: "Every shoot — base kit", items: GEAR_BASE },
    { section: "camera", kind: "any", title: "Every shoot — settings & reminders", items: CAMERA_BASE },
  ];
  for (const [kind, g] of Object.entries(GUIDES)) {
    if (g.gear.length) rows.push({ section: "gear", kind, title: `${g.label} — extra gear`, items: g.gear });
    if (g.camera?.length) rows.push({ section: "camera", kind, title: `${g.label} — camera reminders`, items: g.camera });
    if (g.shots.length) rows.push({ section: "shots", kind, title: `${g.label} — shot list`, items: g.shots });
    if (FLOWS[kind]) rows.push({ section: "flow", kind, title: FLOWS[kind].title, items: FLOWS[kind].items });
    if (POSES[kind]) rows.push({ section: "poses", kind, title: POSES[kind].title, items: POSES[kind].items });
  }
  return rows.map((r, i) => ({ ...r, notes: "", auto: true, sort: i, items: r.items.map((text) => ({ text })) }));
}

// The checklist a new shoot of this kind starts with, built from library
// lists marked "auto" that are for this kind (or for every kind).
export function checklistFromPlaybook(lists, kind) {
  const out = [];
  const seen = new Set();
  for (const group of GROUPS) {
    const hits = (lists || []).filter((l) => l.section === group && l.auto && (l.kind === "any" || l.kind === kind));
    hits.sort((a, b) => (a.kind === "any" ? -1 : 0) - (b.kind === "any" ? -1 : 0) || (a.sort || 0) - (b.sort || 0));
    for (const l of hits) for (const it of l.items || []) {
      const key = `${group}|${it.text}`;
      if (!it.text || seen.has(key)) continue;
      seen.add(key);
      out.push({ text: it.text, done: false, group, ...(it.time ? { time: it.time } : {}), ...(it.img ? { img: it.img } : {}) });
    }
  }
  return out;
}
