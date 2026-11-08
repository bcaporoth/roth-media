// The baseline day (2026-11-08, Brandon): a business client's FIRST shoot day
// comes with its scripts started — the Pinned Three (the three posts that stay
// pinned on their Instagram: who you are · why people trust you · how to buy)
// and a B-roll list of the shop, the team and the goods. Built from their
// brand page answers. Lines they SAY are prompts in brackets, never words put
// in their mouth — they and Brandon write the real lines together.

import { cleanBody } from "./scripts";

const lines = (v) => String(v || "").split(/\n+/).map((x) => x.replace(/^[-•*\s]+/, "").trim()).filter(Boolean);

export function baselineScripts(data = {}) {
  const b = data.business || {};
  const voice = data.voice || {};
  const name = b.name || "the business";
  const where = [b.where, b.hours ? `Hours: ${b.hours}` : ""].filter(Boolean).join(" · ");
  const team = lines(b.team);
  const products = lines(b.products);
  const push = products.filter((p) => /[★→]/.test(p));
  const goods = (push.length ? push : products).slice(0, 6);

  const pinned = [
    {
      title: "Pinned #1: Who we are",
      body: {
        goal: "The first post on their Instagram, pinned: who you are, what you do, where, since when, and why.",
        hook: "[First line on camera: your name and the business, in one breath]",
        on_camera: team[0] || "The owner",
        where: b.where || "",
        length: "30–45s",
        steps: [
          { say: `[Who you are + ${name}]`, do: "Stand where customers first see you", shot: "Medium shot, the sign or counter behind you", secs: 5 },
          { say: "[What you do, in one sentence]", do: "Do the thing you're known for", shot: "Hands at work, close-up", secs: 8 },
          { say: "[Where to find you, and since when]", do: "", shot: "Outside: the door, the sign, the street", secs: 8 },
          { say: "[Why you started it]", do: "Look at the camera", shot: "Close-up, slower", secs: 12 },
        ],
        cta: "Follow for more from " + name,
        notes: b.pinned_who ? `Their words (brand page):\n${b.pinned_who}` : "Fill in Pinned post #1 on the brand page first.",
      },
    },
    {
      title: "Pinned #2: Why people trust us",
      body: {
        goal: "The second pinned post: proof. Years, reviews, numbers, results, the regulars.",
        hook: "[The strongest proof first: a number, a review, a result]",
        on_camera: team[0] || "The owner",
        where: b.where || "",
        length: "30–45s",
        steps: [
          { say: "[The biggest proof point]", do: "", shot: "Text on screen with the number or the review", secs: 5 },
          { say: "[Two or three more reasons]", do: "Serve a regular / show the work", shot: "Real customers (with their OK), finished work", secs: 15 },
          { say: "[What people say about you]", do: "", shot: "Google reviews on a phone, close-up", secs: 8 },
        ],
        cta: "Read the reviews / come see for yourself",
        notes: [b.pinned_trust && `Their words (brand page):\n${b.pinned_trust}`, b.reviews && `Google reviews: ${b.reviews}`].filter(Boolean).join("\n\n") || "Fill in Pinned post #2 on the brand page first.",
      },
    },
    {
      title: "Pinned #3: How to buy from us",
      body: {
        goal: "The third pinned post: the exact next step, so nobody has to guess how to buy.",
        hook: "[“Here's how to …” — the one action, said plainly]",
        on_camera: team[0] || "The owner",
        where: b.where || "",
        length: "20–30s",
        steps: [
          { say: "[The one step: walk in, call, DM, order, book]", do: "Show it happening", shot: "Screen recording or the real counter", secs: 8 },
          { say: "[Where and when: address and hours]", do: "", shot: "Outside + hours on the door", secs: 8 },
          { say: "[What they get first: the best seller or the easy first step]", do: "Hand it over", shot: "Product close-up", secs: 8 },
        ],
        cta: voice.cta || b.link || "",
        notes: [b.pinned_next && `Their words (brand page):\n${b.pinned_next}`, where && `Where / hours: ${where}`, b.link && `Link: ${b.link}`].filter(Boolean).join("\n\n") || "Fill in Pinned post #3 on the brand page first.",
      },
    },
  ];

  const broll = [
    "Outside: the building, the sign, the street, the door opening",
    "Inside: a wide shot of the whole space, then three details",
    ...team.slice(0, 8).map((t) => `Team: ${t}`),
    ...goods.map((g) => `The goods: ${g.replace(/[★→]/g, "").trim()}`),
    b.hours ? `The hours on the door (${b.hours})` : "The hours on the door",
    "Hands at work, close-ups, slow",
    "A customer moment (with their OK)",
  ];

  return [
    ...pinned.map((p) => ({ kind: "reel", title: p.title, minutes: 30, body: cleanBody(p.body) })),
    { kind: "photos", title: "Baseline: the shop, the team, the goods", minutes: 45, body: cleanBody({ goal: "Footage and photos of the basics, used under every post for months.", broll, notes: "Shoot all of it once, on this first day." }) },
  ];
}
