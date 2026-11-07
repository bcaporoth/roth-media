// Gallery hero title size by length, so "Kaci's gallery" lands huge and
// "Nicole and Matt Engagement gallery" still fits in two or three lines.
export function titleSize(title) {
  const n = String(title || "").length;
  return n > 28 ? " gal-title--long" : n > 16 ? " gal-title--mid" : "";
}

// "19 photos · 3 films" — what's actually in the gallery.
export function mediaCounts(items = []) {
  const films = items.filter((i) => i.kind === "video").length;
  const photos = items.length - films;
  const p = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return [photos ? p(photos, "photo") : "", films ? p(films, "film") : ""].filter(Boolean).join(" · ") || "0 items";
}

// "filmed & photographed" / "photographed" / "filmed", by what's in it.
export function madeBy(items = []) {
  const films = items.some((i) => i.kind === "video");
  const photos = items.some((i) => i.kind !== "video");
  const verb = films && photos ? "filmed & photographed" : films ? "filmed" : "photographed";
  return `${verb} by Roth Media`;
}
