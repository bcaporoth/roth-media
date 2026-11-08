// A client's address book (2026-11-08, Brandon: "a library with their
// addresses so I can easily see where I'm going").
//
// Two sources, merged:
//   1. Their own list (Settings → Your addresses): a submissions row, kind
//      "addresses", utm = { book: [{ label, address }], hidden: [keys] }.
//      They add, edit and remove these; they come first.
//   2. Places already saved elsewhere: address answers in their briefs
//      (INTAKE items marked address: true), their shoot days' "Where", and
//      Brandon's Shoots calendar entries. Removing one of these in Settings
//      hides it (its key goes in `hidden`); editing one copies it into the book.

import { INTAKE } from "./intake";

const ADDRESS_QS = new Set(Object.values(INTAKE).flat().filter((it) => it.address).map((it) => it.q));
const NOT_A_PLACE = /^(tbd|tba|n\/?a|none|not sure|no|nope|suggest( some)?|idk|-)$/i;

// Google Maps directions to a place (opens the Maps app on a phone).
export const directionsUrl = (address) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
export const addressKey = (address) => String(address || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Their own list, cleaned. Returns { book, hidden }.
export function cleanAddressBook(v = {}) {
  const book = (Array.isArray(v.book) ? v.book : []).slice(0, 30).map((x) => ({
    label: String(x?.label || "").replace(/\s+/g, " ").trim().slice(0, 60),
    address: String(x?.address || "").replace(/\s+/g, " ").trim().slice(0, 300),
  })).filter((x) => x.address.length >= 3);
  const hidden = [...new Set((Array.isArray(v.hidden) ? v.hidden : []).map(String).filter(Boolean))].slice(0, 100);
  return { book, hidden };
}

// The book row from a list of submissions (kind "addresses"), or empty.
export function bookFrom(subs = []) {
  const row = subs.find((s) => s.kind === "addresses");
  return cleanAddressBook(row?.utm || {});
}

// Everything, theirs first. Each: { address, label, from: [...], mine, at }.
export function clientAddresses({ subs = [], days = [], shoots = [], book = null } = {}) {
  const own = book || bookFrom(subs);
  const hidden = new Set(own.hidden);
  const seen = new Map();
  for (const b of own.book) {
    const key = addressKey(b.address);
    if (!seen.has(key)) seen.set(key, { address: b.address, label: b.label, from: ["Saved in Settings"], mine: true, at: "" });
  }
  const rows = [];
  for (const s of subs) {
    if (s.kind !== "intake") continue;
    for (const [q, a] of s.fields || []) if (ADDRESS_QS.has(q) && a) rows.push({ address: String(a), from: q, at: s.updated_at || s.created_at });
  }
  for (const d of days) if (d.location) rows.push({ address: d.location, from: `Shoot day: ${d.title || "untitled"}`, at: d.date || d.updated_at });
  for (const sh of shoots) if (sh.address) rows.push({ address: sh.address, from: `Shoot: ${sh.title || "untitled"}`, at: sh.date || "" });
  for (const r of rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")))) {
    const address = r.address.replace(/\s+/g, " ").trim();
    if (address.length < 3 || NOT_A_PLACE.test(address)) continue;
    const key = addressKey(address);
    if (hidden.has(key)) continue;
    if (seen.has(key)) { if (!seen.get(key).mine) seen.get(key).from.push(r.from); continue; }
    seen.set(key, { address, label: "", from: [r.from], mine: false, at: r.at || "" });
  }
  return [...seen.values()].map((r) => ({ ...r, from: [...new Set(r.from)] }));
}
