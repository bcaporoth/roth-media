// Partner reports: where every number comes from.
//   Leads      — people who filled in /go/<slug> (counted by the site itself)
//   Customers  — leads Brandon marks Closed in Studio → Partners, with what
//                they signed up for
//   Ad spend   — typed in once a month from Meta Ads Manager (the one
//                number the site can't see)
// Everything else (cost per lead, cost per customer, closing fees) is math.
// Rows live in `submissions`: kind "partner_lead" and "partner_month".

import crypto from "node:crypto";
import { supabaseAdmin } from "./supabase-admin";

// The partner's private report link: /partner/<slug>/report?k=<token>
export function reportToken(slug) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return crypto.createHmac("sha256", secret).update(`partner-report:${slug}`).digest("hex").slice(0, 20);
}
export const reportUrl = (slug) => `https://rothmediaco.com/partner/${slug}/report?k=${reportToken(slug)}`;
export const validToken = (slug, k) => {
  const want = reportToken(slug);
  return typeof k === "string" && k.length === want.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(want));
};

// Agreement §5: 10% of what they signed up for, at least $25.
export const closingFee = (value) => Math.max(25, Math.round(Number(value || 0) * 0.1));

export const thisMonth = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" }).slice(0, 7);
const monthRange = (m) => {
  const [y, mo] = m.split("-").map(Number);
  return [new Date(Date.UTC(y, mo - 1, 1, 4)).toISOString(), new Date(Date.UTC(y, mo, 1, 4)).toISOString()]; // ET month, close enough
};
export const monthLabel = (m) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
export const prevMonth = (m) => { const [y, mo] = m.split("-").map(Number); return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`; };

// Partner rate: payments 1..months are locked. Review before payment
// `months` (so 30 days' notice of a new rate lands on the next payment).
const addMonths = (iso, n) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d; };
export function rateDates(agreement, months = 3) {
  const start = agreement?.utm?.signed_at;
  if (!start) return null;
  return { reviewBy: addMonths(start, months - 1), lockedUntil: addMonths(start, months) };
}

export async function partnerAgreement(slug) {
  const { data } = await supabaseAdmin().from("submissions").select("id, name, phone, email, fields, utm, status").eq("kind", "partner").eq("utm->>partner", slug).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  const f = Object.fromEntries(data.fields || []);
  const closing = /hour/i.test(f["lead follow-up"] || "") ? "hourly" : /customer/i.test(f["lead follow-up"] || "") ? "percent" : "none";
  return { ...data, business: f["business (legal name)"] || "", closing, active: data.status === "booked" && Boolean(data.utm?.stripe_customer) };
}

export async function monthStats(slug, month = thisMonth()) {
  const db = supabaseAdmin();
  const [from, to] = monthRange(month);
  const [leadsRes, closedRes, monthRes] = await Promise.all([
    db.from("submissions").select("id, created_at, name, phone, email, status, utm").eq("kind", "partner_lead").eq("utm->>partner", slug).gte("created_at", from).lt("created_at", to).order("created_at", { ascending: false }),
    db.from("submissions").select("id, created_at, name, status, utm").eq("kind", "partner_lead").eq("utm->>partner", slug).eq("status", "booked").gte("utm->>closed_at", from).lt("utm->>closed_at", to),
    db.from("submissions").select("id, utm").eq("kind", "partner_month").eq("utm->>partner", slug).eq("utm->>month", month).maybeSingle(),
  ]);
  const leads = leadsRes.data || [];
  const closed = (closedRes.data || []).map((c) => ({ id: c.id, name: c.name, value: Number(c.utm?.close_value || 0), what: c.utm?.close_what || "", closedAt: c.utm?.closed_at, fee: closingFee(c.utm?.close_value) }));
  const spend = monthRes.data ? Number(monthRes.data.utm?.spend || 0) : null;
  const hours = monthRes.data ? Number(monthRes.data.utm?.hours || 0) : 0;
  const n = leads.length, won = closed.length;
  return {
    slug, month, label: monthLabel(month),
    leads, closed, spend, hours, spendUpdated: monthRes.data?.utm?.updated_at || null, monthRowId: monthRes.data?.id || null,
    leadCount: n,
    contacted: leads.filter((l) => l.status !== "new").length,
    customers: won,
    revenue: closed.reduce((s, c) => s + c.value, 0),
    costPerLead: spend != null && n ? spend / n : null,
    costPerCustomer: spend != null && won ? spend / won : null,
    closeRate: n ? won / n : null,
    percentFees: closed.reduce((s, c) => s + c.fee, 0),
    sources: Object.entries(leads.reduce((acc, l) => { const k = l.utm?.utm_content || l.utm?.utm_campaign || l.utm?.utm_source || "direct"; acc[k] = (acc[k] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]),
  };
}
