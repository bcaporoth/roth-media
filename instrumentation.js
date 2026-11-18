// The server's clock runs on UTC, but Brandon and his clients are in New York.
// Without this, a page is first drawn with UTC dates ("Wednesday" at 9 PM on a
// Tuesday, a save time 5 hours ahead) and the browser then redraws it with the
// right ones: React hydration error #418 on the client profile and shoot day
// pages (2026-11-17). Node re-reads TZ when it is set at runtime, so every
// date the server formats now matches what the browser shows.
process.env.TZ = "America/New_York";

export function register() {
  process.env.TZ = "America/New_York";
}
