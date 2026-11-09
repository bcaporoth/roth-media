// Expand repeating client events into the dates they land on, inside a
// window. Each occurrence keeps the row's id as base_id; the first one keeps
// the real id so edits/removes hit the row.
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

// skips: { [eventId]: ["YYYY-MM-DD", …] } — dates of a repeating event that were
// moved on their own (2026-11-08); a one-off copy sits on the new date.
export function expandEvents(rows, { from, to, skips = {} } = {}) {
  const start = from ? parse(from) : (() => { const d = new Date(); d.setDate(d.getDate() - 45); return d; })();
  const end = to ? parse(to) : (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; })();
  const out = [];
  for (const r of rows) {
    if (!r.repeat) { out.push({ ...r, base_id: r.id }); continue; }
    let d = parse(r.date), n = 0;
    while (d <= end && n < 400) {
      if (d >= start && !(skips[r.id] || []).includes(ymd(d))) out.push({ ...r, base_id: r.id, id: n === 0 ? r.id : `${r.id}@${ymd(d)}`, date: ymd(d), occurrence: n });
      if (r.repeat === "weekly") d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      else d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
      n++;
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)));
}
