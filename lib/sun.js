// Sunset for a place and date (NOAA solar calculator, ±2 min) — so a
// shoot booked "two hours before sunset" gets a real clock time, and every
// shoot shows its golden hour.

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

function julianDay(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

// Returns minutes after UTC midnight of sunset, or null for polar cases.
export function sunsetUtcMinutes(lat, lng, dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const jd = julianDay(y, m, d);
  const T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T) + Math.sin(rad(3 * M)) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
  const yy = Math.tan(rad(eps / 2)) ** 2;
  const eqTime = 4 * deg(yy * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * yy * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * yy * yy * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
  const cosHA = (Math.cos(rad(90.833)) / (Math.cos(rad(lat)) * Math.cos(rad(decl)))) - Math.tan(rad(lat)) * Math.tan(rad(decl));
  if (cosHA < -1 || cosHA > 1) return null;
  const ha = deg(Math.acos(cosHA));
  return 720 - 4 * (lng - ha) - eqTime; // NOAA: sunrise uses (lng + ha), sunset (lng - ha)
}

// Local wall-clock "HH:MM" for a sunset, using the America/New_York offset for that date.
export function sunsetLocal(lat, lng, dateStr) {
  const mins = sunsetUtcMinutes(lat, lng, dateStr);
  if (mins == null) return null;
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 0, Math.round(mins)));
  const local = new Date(utc.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`;
}

export function shiftTime(hhmm, deltaMinutes) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const t = ((h * 60 + m + deltaMinutes) % 1440 + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

// "two hours before sunset", "90 min before sunset", "at sunset", "1 hr after sunrise" (sunrise ignored → null)
const WORDS = { one: 1, two: 2, three: 3, four: 4, half: 0.5, "an": 1, "a": 1 };
export function resolveTimeNote(note, sunset) {
  if (!note || !sunset) return null;
  const n = String(note).toLowerCase();
  if (!/sunset/.test(n)) return null;
  if (/^\s*(at )?sunset\s*$/.test(n)) return sunset;
  const m = /(\d+(?:\.\d+)?|one|two|three|four|half|an|a)\s*(hours?|hrs?|h|minutes?|mins?|m)?\b.*?(before|after)/.exec(n);
  if (!m) return null;
  const qty = WORDS[m[1]] ?? Number(m[1]);
  const unit = /^m/.test(m[2] || "h") ? 1 : 60;
  return shiftTime(sunset, (m[3] === "before" ? -1 : 1) * Math.round(qty * unit));
}

export const fmt12 = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
