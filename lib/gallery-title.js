// Gallery hero title size by length, so "Kaci's gallery" lands huge and
// "Nicole and Matt Engagement gallery" still fits in two or three lines.
export function titleSize(title) {
  const n = String(title || "").length;
  return n > 28 ? " gal-title--long" : n > 16 ? " gal-title--mid" : "";
}
