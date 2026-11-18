// What a signed-in client has to sign, and what they already signed, for the
// Agreements tab on the business portal home (2026-11-18, Brandon: "so they
// can easily see where they need to sign off on stuff").
// Two places hold these: quotes Brandon sent (submissions, kind quote_offer,
// opened at /q/<token>) and agreements (the agreements table, /sign/<token>).
// A quote that was signed already made its own agreement row, so only quotes
// still waiting are listed from the quote side.
import { AGREEMENT_KINDS, money, offerExpired, offerExpiry } from "./agreements";
import { quoteExpired, quoteExpiry } from "./quotes";

const day = (d) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });

export async function loadPortalAgreements(db, email) {
  const e = String(email || "").toLowerCase();
  if (!e) return [];
  const [ags, quotes] = await Promise.all([
    db.from("agreements").select("id, created_at, token, kind, business, amount_cents, paid_cents, period, sign_required, status, signed_at").ilike("client_email", e).neq("status", "void").order("created_at", { ascending: false }).limit(50).then((r) => r.data || [], () => []),
    db.from("submissions").select("id, created_at, utm").eq("kind", "quote_offer").ilike("email", e).order("created_at", { ascending: false }).limit(30).then((r) => r.data || [], () => []),
  ]);
  const out = [];

  for (const row of quotes) {
    const q = row.utm || {};
    if (!q.token || ["signed", "paid", "deleted"].includes(q.status)) continue;
    const expired = quoteExpired(q);
    const until = quoteExpiry(q);
    const n = (q.options || []).length;
    out.push({
      key: "q" + row.id,
      title: `Quote${q.business ? ` for ${q.business}` : ""}`,
      detail: `${n > 1 ? `${n} options to pick from` : "One option"} · sent ${day(q.sentAt || row.created_at)}`,
      state: expired ? "expired" : "todo",
      status: expired ? "Expired" : "Needs you: pick one, sign and pay",
      note: expired ? "This quote ran out. Ask Brandon for a new one." : until ? `Good until ${day(until)}.` : "",
      href: expired ? "" : `/q/${q.token}`,
      go: "Open my quote",
      at: q.sentAt || row.created_at,
    });
  }

  for (const a of ags) {
    const k = AGREEMENT_KINDS[a.kind] || AGREEMENT_KINDS.upkeep;
    const amt = a.amount_cents ? money(a.status === "paid" ? a.paid_cents || a.amount_cents : a.amount_cents) : "";
    const base = { key: "a" + a.id, title: `${k.title}${a.period ? ` · ${a.period}` : ""}`, at: a.signed_at || a.created_at, href: `/sign/${a.token}` };
    if (a.status === "paid") {
      out.push({ ...base, state: "done", status: a.sign_required && a.signed_at ? "Signed and paid" : "Paid", detail: [amt, a.signed_at ? `signed ${day(a.signed_at)}` : ""].filter(Boolean).join(" · "), note: "", go: "Open it" });
    } else if (a.status === "signed") {
      out.push({ ...base, state: "todo", status: "Signed. Payment still to do", detail: [amt, a.signed_at ? `signed ${day(a.signed_at)}` : ""].filter(Boolean).join(" · "), note: "", go: "Open and pay" });
    } else if (offerExpired(a)) {
      out.push({ ...base, state: "expired", status: "Expired", detail: [amt, `sent ${day(a.created_at)}`].filter(Boolean).join(" · "), note: "This one ran out. Ask Brandon for a new one.", href: "", go: "" });
    } else {
      const until = offerExpiry(a);
      const needsSign = a.kind !== "invoice" && a.sign_required;
      out.push({ ...base, state: "todo", status: needsSign ? "Needs your signature" : "Needs payment", detail: [amt, `sent ${day(a.created_at)}`].filter(Boolean).join(" · "), note: until ? `Good until ${day(until)}.` : "", go: needsSign ? "Read and sign" : "Open and pay" });
    }
  }

  // Things waiting on the client first, then newest first.
  const rank = { todo: 0, expired: 1, done: 2 };
  return out.sort((x, y) => rank[x.state] - rank[y.state] || new Date(y.at) - new Date(x.at));
}
