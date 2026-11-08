// A client's address book (2026-11-08, Brandon: "a library with their
// addresses so I can easily see where I'm going"). Built from what's already
// saved — no new table: the address answers in their briefs (INTAKE items
// marked address: true), their shoot days' "Where", and Brandon's Shoots
// calendar entries. Newest first, one row per place.

import { INTAKE } from "./intake";

const ADDRESS_QS = new Set(Object.values(INTAKE).flat().filter((it) => it.address).map((it) => it.q));
const NOT_A_PLACE = /^(tbd|tba|n\/?a|none|not sure|no|nope|suggest( some)?|idk|-)$/i;

// Google Maps directions to a place (opens the Maps app on a phone).
export const directionsUrl = (address) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

export function clientAddresses({ subs = [], days = [], shoots = [] } = {}) {
  const rows = [];
  for (const s of subs) {
    if (s.kind !== "intake") continue;
    for (const [q, a] of s.fields || []) if (ADDRESS_QS.has(q) && a) rows.push({ address: String(a), from: q, at: s.updated_at || s.created_at });
  }
  for (const d of days) if (d.location) rows.push({ address: d.location, from: `Shoot day: ${d.title || "untitled"}`, at: d.date || d.updated_at });
  for (const sh of shoots) if (sh.address) rows.push({ address: sh.address, from: `Shoot: ${sh.title || "untitled"}`, at: sh.date || "" });
  const seen = new Map();
  for (const r of rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")))) {
    const address = r.address.replace(/\s+/g, " ").trim();
    if (address.length < 3 || NOT_A_PLACE.test(address)) continue;
    const key = address.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) { seen.get(key).from.push(r.from); continue; }
    seen.set(key, { address, from: [r.from], at: r.at || "" });
  }
  return [...seen.values()].map((r) => ({ ...r, from: [...new Set(r.from)] }));
}
