// Prep guides per shoot type: the gear to pack and the shots to get.
// Copied onto a new shoot as its checklist (items tagged group "gear" or
// "shots"), then edited per job — add, remove, tick off. Brandon's own
// guides live here; the print sheet at /portal/admin/shoots/print uses the
// same lists.

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

export const GUIDES = {
  wedding: {
    label: "Wedding / engagement",
    gear: [
      "Lav mics + recorder tested, fresh batteries",
      "Second body ready for ceremony wide",
      "Flash + diffuser for the reception",
      "Backup drive to dump cards before bed",
    ],
    shots: [
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
  family: {
    label: "Family / portraits",
    gear: [
      "Reflector",
      "Prompt list on the phone",
      "Blanket or stool for little ones",
    ],
    shots: [
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
    shots: [
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
    shots: [
      "Wide establishing shots first",
      "Details: signage, decor, food, setup",
      "Speakers / awards with a second angle for reactions",
      "Crowd energy b-roll for the recap",
      "Key people named in the brief",
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
    ...g.shots.map((text) => ({ text, done: false, group: "shots" })),
  ];
}

// ── Playbook ──────────────────────────────────────────────────────────
// Four kinds of list live on every shoot and in the Studio → Playbook
// library: gear to pack, shots to get, the flow of the day (timed), and
// poses / prompts. The library is editable in the browser (table
// `playbook`); what's below is only the starter set it gets seeded with.

export const GROUPS = ["flow", "shots", "poses", "gear"];
export const GROUP_LABEL = { gear: "Gear to pack", shots: "Shots to get", flow: "Flow of the day", poses: "Poses & prompts" };
export const SECTION_LABEL = { gear: "Gear lists", shots: "Shot lists", flow: "Flows", poses: "Poses" };
export const PLAYBOOK_KINDS = ["any", "wedding", "family", "business", "event", "other"];
// Items saved before the split have no group — they were shots.
export const groupOf = (c) => (GROUPS.includes(c?.group) ? c.group : "shots");

const FLOWS = {
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
  const rows = [{ section: "gear", kind: "any", title: "Every shoot — base kit", items: GEAR_BASE }];
  for (const [kind, g] of Object.entries(GUIDES)) {
    if (g.gear.length) rows.push({ section: "gear", kind, title: `${g.label} — extra gear`, items: g.gear });
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
      out.push({ text: it.text, done: false, group, ...(it.time ? { time: it.time } : {}) });
    }
  }
  return out;
}
