import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import StatsBoard from "../../../../components/StatsBoard";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { buildLeadBoard, hotVisitors, forecast } from "../../../../lib/lead-intel";
import {
  DEFAULT_CLOSE_RATE, bookedPeople, buildSignals, closeRead, collected, countableLeads, expectedToBook,
  firstTouch, isLead, liveBookings, paidEmailSet, paymentEvent, sourceTable, trend, visitFunnel,
} from "../../../../lib/stats-math";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stats — Studio",
  robots: { index: false },
};

const TZ = "America/New_York";
const RANGES = [1, 7, 30, 90];
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
const hourOf = (d) =>
  Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(new Date(d)));

// PostgREST caps a response at 1,000 rows — page through the window.
async function fetchAll(query, max = 50000) {
  const out = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await query().range(from, from + 999);
    if (error) return { rows: out, error };
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { rows: out, error: null };
}

function tally(rows, keyFn, valueFn = null) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    const cur = m.get(k) || { key: k, count: 0, visitors: new Set() };
    cur.count++;
    if (valueFn) cur.visitors.add(valueFn(r));
    m.set(k, cur);
  }
  return [...m.values()]
    .map((v) => ({ key: v.key, count: v.count, visitors: v.visitors.size }))
    .sort((a, b) => (b.visitors || b.count) - (a.visitors || a.count) || b.count - a.count);
}

function source(r) {
  if (r.utm_source) return r.utm_source === "qr" ? "QR code (business card)" : r.utm_source;
  if (!r.referrer) return "Direct / typed in";
  if (/google\./.test(r.referrer)) return "Google";
  if (/(facebook|fb)\.|l\.facebook/.test(r.referrer)) return "Facebook";
  if (/instagram/.test(r.referrer)) return "Instagram";
  if (/tiktok/.test(r.referrer)) return "TikTok";
  if (/bing\./.test(r.referrer)) return "Bing";
  if (/(chatgpt|openai|perplexity|claude|gemini)/.test(r.referrer)) return "AI assistant";
  return r.referrer;
}

export default async function StatsPage({ searchParams }) {
  const user = await requireAdminPage();
  const sp = await searchParams;
  const range = RANGES.includes(Number(sp?.range)) ? Number(sp.range) : 30;
  const since = new Date(Date.now() - range * 24 * 3600 * 1000);
  const db = supabaseAdmin();

  const prevSince = new Date(since.getTime() - range * 24 * 3600 * 1000);
  const NOT_MINE = "(partner,partner_lead,partner_month,call,intake_sent)"; // partner work + Brandon's own call sheets
  const SUB_COLS = "id, created_at, updated_at, kind, status, name, email, phone, summary, source_path, utm, visitor";
  const loadSubs = (cols) => db.from("submissions").select(cols).not("kind", "in", NOT_MINE).gte("created_at", since.toISOString());
  const [{ rows, error }, subsFirst, actRes, newCount, bookRes, guestRes, prevLeadsRes, prevViewsRes, payRes] = await Promise.all([
    fetchAll(() =>
      db
        .from("site_events")
        .select("created_at, type, name, path, referrer, utm_source, visitor, device, browser, os, country, region, city")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
    ),
    // first_contacted_at arrives with supabase/studio-2.sql — retried without it below.
    loadSubs(`${SUB_COLS}, first_contacted_at`),
    db
      .from("gallery_activity")
      .select("created_at, action, via, viewer, filename, gallery_id, galleries(title)")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
    newLeadCount(),
    // Both tables may not exist yet (bookings.sql / guest.sql) — tolerated below.
    db.from("bookings").select("id, created_at, email, paid_cents, total_cents, mode, status").gte("created_at", since.toISOString()),
    db.from("guest_uploads").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString()),
    // The window before this one — for "up or down" in What's going on. Rows, not
    // a count, so it's judged by the same "what's a lead" rule as this window.
    db.from("submissions").select("id, kind, status, source_path").in("kind", ["quote", "card", "contact", "promo"]).gte("created_at", prevSince.toISOString()).lt("created_at", since.toISOString()).limit(5000),
    db.from("site_events").select("id", { count: "exact", head: true }).eq("type", "pageview").gte("created_at", prevSince.toISOString()).lt("created_at", since.toISOString()),
    // Money that landed in the window: lib/booking.js writes one inbox row per payment.
    db.from("submissions").select("id, created_at, kind, email, summary, fields, utm").eq("kind", "booking").gte("created_at", since.toISOString()),
  ]);
  let subsRes = subsFirst;
  const touchReady = !subsFirst.error;
  if (subsFirst.error) subsRes = await loadSubs(SUB_COLS);
  const bookingsOk = !bookRes?.error;
  const bookingRows = bookRes?.data || [];
  const bookings = liveBookings(bookingRows); // refunded / cancelled aren't "booked"
  const paySubs = payRes?.data || [];
  const guestUploads = guestRes?.count || 0;

  const views = rows.filter((r) => r.type === "pageview");
  const events = rows.filter((r) => r.type === "event");
  const subs = subsRes.data || [];
  const acts = actRes.data || [];
  // What counts as a lead is decided in lib/stats-math.js (and the inbox's isLead):
  // forms a stranger sent, not intakes / pasted-in inquiries / booking rows.
  const leads = countableLeads(subs);
  const paidEmails = paidEmailSet({ bookings, paySubs });

  // Visitor ids rotate daily, so "visits" = unique people per day, summed.
  const visitKey = (r) => `${dayKey(r.created_at)}|${r.visitor}`;
  const visits = new Set(views.map(visitKey));

  // Daily series, oldest → newest, zero-filled.
  const days = [];
  for (let i = range - 1; i >= 0; i--) days.push(dayKey(Date.now() - i * 24 * 3600 * 1000));
  const daily = new Map(days.map((d) => [d, { date: d, visitors: new Set(), pageviews: 0, leads: 0 }]));
  for (const r of views) {
    const d = daily.get(dayKey(r.created_at));
    if (d) {
      d.pageviews++;
      d.visitors.add(r.visitor);
    }
  }
  for (const s of leads) {
    const d = daily.get(dayKey(s.created_at));
    if (d) d.leads++;
  }

  // Hour of day (ET), unique visits per hour.
  const hours = Array.from({ length: 24 }, () => new Set());
  for (const r of views) hours[hourOf(r.created_at)].add(visitKey(r));

  // Funnel: one unit (a visit) all the way down — see visitFunnel().
  const funnel = visitFunnel(rows, subs.filter((s) => s.kind === "quote"), dayKey);

  // Source → leads → booked → dollars. A lead is credited to the link it came in
  // on (utm_source), else to the first page view of that visit (rows are newest
  // first, so the last match is the earliest).
  const firstView = {};
  for (const l of leads) {
    if (!l.visitor) continue;
    const day = dayKey(l.created_at);
    for (const r of views) if (r.visitor === l.visitor && dayKey(r.created_at) === day) firstView[l.id] = r;
  }
  const leadSources = sourceTable({ leads, firstView, sourceOf: source, paidEmails, payEvents: paySubs.map(paymentEvent) });

  const qrVisits = new Set(views.filter((r) => r.utm_source === "qr").map(visitKey)).size;
  const liveCut = Date.now() - 30 * 60 * 1000;
  const live = new Set(views.filter((r) => new Date(r.created_at) > liveCut).map((r) => r.visitor)).size;

  // Per-gallery client activity.
  const byGallery = new Map();
  for (const a of acts) {
    const g = byGallery.get(a.gallery_id) || {
      title: a.galleries?.title || "Gallery",
      views: 0,
      downloads: 0,
      last: a.created_at,
    };
    if (a.action === "view") g.views++;
    else g.downloads++;
    byGallery.set(a.gallery_id, g);
  }

  // Lead tracker + the read on it. Scoring lives in lib/lead-intel.js; what
  // gets counted and what gets said lives in lib/stats-math.js.
  const board = buildLeadBoard(subs.filter((s) => isLead(s) || s.kind === "booking"), rows);
  const hot = hotVisitors(subs, rows);
  const peak = hours.map((s) => s.size);
  const peakHour = peak.some(Boolean) ? peak.indexOf(Math.max(...peak)) : null;
  const leadsPrev = prevLeadsRes?.error ? null : countableLeads(prevLeadsRes?.data || []).length;
  const visitsPrev = prevViewsRes?.error ? null : prevViewsRes?.count ?? null;
  const f = forecast({ board, hot, range, visits: views.length, visitsPrev, leadsPrev, events, peakHour });
  const close = closeRead(board, Object.fromEntries(leads.map((l) => [l.id, l.email])));
  const touch = firstTouch(leads, touchReady);
  const leadTrend = trend(leads.length, leadsPrev);
  const intel = {
    overdue: f.overdue,
    open: f.open,
    pipeline: f.pipeline,
    pickerShown: f.pickerShown,
    callsBooked: f.callsBooked,
    checkoutOpens: f.checkoutOpens,
    close,
    assumedRate: DEFAULT_CLOSE_RATE,
    // A real number once enough leads are decided; until then a labelled guess.
    expected: expectedToBook(board, close.known ? close.rate : DEFAULT_CLOSE_RATE),
    touch,
    signals: buildSignals({ board, hot, f, close, touch, leadTrend, visits: views.length, visitsPrev, range, peakHour }),
  };
  const money = collected({ bookings: bookingRows, bookingsOk, paySubs });
  const booked = bookedPeople(leads, paidEmails);

  const data = {
    range,
    intel,
    board: board.slice(0, 40),
    hot,
    ready: !error,
    kpis: {
      visits: visits.size,
      pageviews: views.length,
      pagesPerVisit: visits.size ? views.length / visits.size : 0,
      leads: leads.length,
      booked, // people, once each
      otherForms: subs.length - leads.length - subs.filter((s) => s.kind === "booking").length,
      qr: qrVisits,
      live,
      bookings: bookings.length,
      bookingsOk,
      money,
      galleryOpens: acts.filter((a) => a.action === "view").length,
      gallerySaves: acts.filter((a) => a.action !== "view").length,
      guestUploads,
    },
    daily: [...daily.values()].map((d) => ({
      date: d.date,
      visitors: d.visitors.size,
      pageviews: d.pageviews,
      leads: d.leads,
    })),
    hours: hours.map((s) => s.size),
    funnel,
    pages: tally(views, (r) => r.path, visitKey).slice(0, 12),
    sources: tally(views, source, visitKey).slice(0, 10),
    leadSources,
    cities: tally(
      views,
      (r) => (r.city ? `${r.city}${r.region ? `, ${r.region}` : ""}` : r.country || ""),
      visitKey
    ).slice(0, 10),
    devices: tally(views, (r) => r.device, visitKey),
    browsers: tally(views, (r) => r.browser, visitKey).slice(0, 6),
    os: tally(views, (r) => r.os, visitKey).slice(0, 6),
    events: tally(events, (r) => r.name).slice(0, 10),
    recent: rows.slice(0, 30).map((r) => ({
      at: r.created_at,
      type: r.type,
      label: r.type === "event" ? r.name : r.path,
      where: r.city ? `${r.city}${r.region ? `, ${r.region}` : ""}` : r.country,
      device: r.device,
      source: r.type === "pageview" ? source(r) : "",
    })),
    galleries: [...byGallery.values()].sort((a, b) => b.views + b.downloads - (a.views + a.downloads)),
    // Every form that came in during the window — the actual people.
    forms: [...subs]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50)
      .map((s) => ({
        id: s.id,
        at: s.created_at,
        kind: s.kind,
        status: s.status,
        name: s.name || s.email || "—",
        summary: s.summary || "",
        from: s.utm?.source || (s.source_path || "").replace(/^\//, "") || "site",
      })),
    formKinds: Object.entries(subs.reduce((m, s) => ((m[s.kind] = (m[s.kind] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]),
    galleryFeed: acts.slice(0, 25).map((a) => ({
      at: a.created_at,
      title: a.galleries?.title || "Gallery",
      action: a.action,
      who: a.viewer || (a.via === "share" ? "someone with the share link" : "client"),
      filename: a.filename,
    })),
  };

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="stats" newCount={newCount} kick="Studio" title="Stats" wide>
        <StatsBoard data={data} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
