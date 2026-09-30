// Where Brandon drives from, geocoding (OpenStreetMap Nominatim), and
// real driving distance/time (OSRM's public router). Both are free and
// need no key; both are rate-limited, so we only call them when an
// address changes.

export const HOME = { label: "Waverly, NY", lat: 42.0104, lng: -76.5277 };

const UA = "RothMedia-Studio/1.0 (brandon@rothventures.co)";

export async function geocode(address) {
  const q = String(address || "").trim();
  if (!q) return null;
  // Bias toward the Twin Tiers: bare business names resolve better with a region.
  const query = /\b(NY|PA|New York|Pennsylvania)\b/i.test(q) ? q : `${q}, NY`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) return null;
  const [hit] = await res.json().catch(() => []);
  if (!hit) return null;
  return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name };
}

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
