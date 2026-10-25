// Where Brandon drives from, geocoding (OpenStreetMap Nominatim), and
// real driving distance/time (OSRM's public router). Both are free and
// need no key; both are rate-limited, so we only call them when an
// address changes.

export const HOME = { label: "Waverly, NY", lat: 42.0104, lng: -76.5277 };

const UA = "RothMedia-Studio/1.0 (brandon@rothventures.co)";

async function lookup(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) return null;
  const [hit] = await res.json().catch(() => []);
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
}

// Tries the full string, then progressively drops the leading part (a venue
// or business name OSM doesn't know) so "Apple and Moore, Watkins Glen NY"
// still lands on Watkins Glen. Bare strings get ", NY" for a Twin Tiers bias.
export async function geocode(address) {
  const q = String(address || "").trim();
  if (!q) return null;
  const withState = (s) => (/\b(NY|PA|New York|Pennsylvania)\b/i.test(s) ? s : `${s}, NY`);
  const parts = q.split(",").map((p) => p.trim()).filter(Boolean);
  const tries = [];
  for (let i = 0; i < parts.length; i++) tries.push(withState(parts.slice(i).join(", ")));
  if (parts.length === 1) { const words = q.split(/\s+/); if (words.length > 2) tries.push(withState(words.slice(-2).join(" "))); }
  for (const t of tries) {
    const hit = await lookup(t);
    if (hit) return { ...hit, approximate: t !== tries[0] };
  }
  return null;
}

// Typeahead: up to 6 places for a partial string, nearest-first around home.
// Returns { label, address, lat, lng } — `address` is what we save (short,
// human), `label` is what the dropdown shows.
export async function suggest(q) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&lat=${HOME.lat}&lon=${HOME.lng}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const hits = (json?.features || []).map((f) => {
      const p = f.properties || {};
      const [lng, lat] = f.geometry?.coordinates || [];
      const street = [p.housenumber, p.street].filter(Boolean).join(" ");
      const town = p.city || p.town || p.village || p.locality || p.county || "";
      const parts = [p.name && p.name !== street ? p.name : "", street, town, p.state ? stateAbbr(p.state) : ""].filter(Boolean);
      const address = parts.join(", ");
      return address && lat && lng ? { label: address + (p.postcode ? ` ${p.postcode}` : ""), address, lat, lng } : null;
    }).filter(Boolean);
    const seen = new Set();
    return hits.filter((h) => !seen.has(h.address) && seen.add(h.address));
  } catch {
    const hit = await lookup(q);
    return hit ? [{ label: hit.label, address: hit.label.split(",").slice(0, 3).join(","), lat: hit.lat, lng: hit.lng }] : [];
  }
}
const STATES = { "New York": "NY", Pennsylvania: "PA", "New Jersey": "NJ", Ohio: "OH", Connecticut: "CT", Massachusetts: "MA", Vermont: "VT", Maryland: "MD", Delaware: "DE", Virginia: "VA" };
const stateAbbr = (s) => STATES[s] || s;

export function haversineMiles(a, b) {
  const R = 3958.8, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Driving miles + minutes from home. Falls back to straight-line × 1.3 at 40 mph.
export async function drive(to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${HOME.lng},${HOME.lat};${to.lng},${to.lat}?overview=false`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const json = await res.json();
    const r = json?.routes?.[0];
    if (r) return { miles: Math.round((r.distance / 1609.34) * 10) / 10, minutes: Math.round(r.duration / 60), estimated: false };
  } catch {}
  const miles = Math.round(haversineMiles(HOME, to) * 1.3 * 10) / 10;
  return { miles, minutes: Math.round((miles / 40) * 60), estimated: true };
}

export const mapsUrl = (address, lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(HOME.label)}&destination=${encodeURIComponent(lat && lng ? `${lat},${lng}` : address)}`;
