// Pull dated moments out of a free-text intake answer ("Black Friday · grand
// opening Nov 15 · holiday menu · slow season starts in Jan"). Each chunk with
// a date we can pin becomes { date: 'YYYY-MM-DD', title }; the rest come back
// as `loose` so nothing is silently dropped. Year = the next occurrence.

const MONTHS = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nth = (year, month, dow, n) => { const d = new Date(year, month, 1); const off = (dow - d.getDay() + 7) % 7; return new Date(year, month, 1 + off + 7 * (n - 1)); };
const last = (year, month, dow) => { const d = new Date(year, month + 1, 0); const off = (d.getDay() - dow + 7) % 7; return new Date(year, month + 1, -off); };

// Named days (US). Each returns a Date for the given year.
const HOLIDAYS = [
  [/black friday/i, (y) => { const t = nth(y, 10, 4, 4); return new Date(y, 10, t.getDate() + 1); }],
  [/small business saturday/i, (y) => { const t = nth(y, 10, 4, 4); return new Date(y, 10, t.getDate() + 2); }],
  [/cyber monday/i, (y) => { const t = nth(y, 10, 4, 4); return new Date(y, 10, t.getDate() + 4); }],
  [/thanksgiving/i, (y) => nth(y, 10, 4, 4)],
  [/christmas eve/i, (y) => new Date(y, 11, 24)],
  [/christmas|xmas/i, (y) => new Date(y, 11, 25)],
  [/new year'?s? eve/i, (y) => new Date(y, 11, 31)],
  [/new year/i, (y) => new Date(y, 0, 1)],
  [/valentine/i, (y) => new Date(y, 1, 14)],
  [/st\.? ?patrick/i, (y) => new Date(y, 2, 17)],
  [/easter/i, (y) => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31) - 1, da = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mo, da); }],
  [/mother'?s day/i, (y) => nth(y, 4, 0, 2)],
  [/memorial day/i, (y) => last(y, 4, 1)],
  [/father'?s day/i, (y) => nth(y, 5, 0, 3)],
  [/(4th|fourth) of july|july 4/i, (y) => new Date(y, 6, 4)],
  [/labor day/i, (y) => nth(y, 8, 1, 1)],
  [/halloween/i, (y) => new Date(y, 9, 31)],
  [/veterans day/i, (y) => new Date(y, 10, 11)],
];

function nextOccurrence(make, now) {
  const y = now.getFullYear();
  const floor = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const d = make(y);
  return d >= floor ? d : make(y + 1);
}

export function parseEventDates(text, now = new Date()) {
  const events = [], loose = [];
  const chunks = String(text || "").split(/\s*(?:·|•|\||;|,|\n|\band\b)\s*/i).map((c) => c.trim()).filter(Boolean);
  for (const raw of chunks) {
    let date = null;
    let title = raw;
    // "Nov 15", "November 15th", "15 Nov", "11/15", "11/15/26"
    let m = raw.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}|\d{2}))?\b/) || raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:,?\s+(\d{4}|\d{2}))?\b/);
    if (m) {
      const a = m[1], b = m[2];
      const mon = MONTHS[a.toLowerCase()] ?? MONTHS[b.toLowerCase()];
      const day = Number(MONTHS[a.toLowerCase()] !== undefined ? b : a);
      if (mon !== undefined && day >= 1 && day <= 31) {
        const yr = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null;
        date = yr ? new Date(yr, mon, day) : nextOccurrence((y) => new Date(y, mon, day), now);
        title = raw.replace(m[0], "").replace(/^\W+|\W+$/g, "").trim() || raw;
      }
    }
    if (!date) {
      m = raw.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?\b/);
      if (m) {
        const mon = Number(m[1]) - 1, day = Number(m[2]);
        if (mon >= 0 && mon < 12 && day >= 1 && day <= 31) {
          const yr = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null;
          date = yr ? new Date(yr, mon, day) : nextOccurrence((y) => new Date(y, mon, day), now);
          title = raw.replace(m[0], "").replace(/^\W+|\W+$/g, "").trim() || raw;
        }
      }
    }
    if (!date) {
      const h = HOLIDAYS.find(([re]) => re.test(raw));
      if (h) { date = nextOccurrence(h[1], now); title = raw; }
    }
    if (date && !Number.isNaN(date.getTime())) events.push({ date: ymd(date), title: title.charAt(0).toUpperCase() + title.slice(1) });
    else loose.push(raw);
  }
  return { events, loose };
}
