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

// Items for one group from the guide (used by "reset to guide" per list).
export function guideItems(kind, group) {
  const g = GUIDES[kind] || GUIDES.other;
  const list = group === "gear" ? [...GEAR_BASE, ...g.gear] : g.shots;
  return list.map((text) => ({ text, done: false, group }));
}
