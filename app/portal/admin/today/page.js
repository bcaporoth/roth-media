import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import TodayBoard from "../../../../components/TodayBoard";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { actionsFor } from "../../../../lib/lead-intel";
import { balancesToSend } from "../../../../lib/balances";
import { nextShoot, leadsNeedingYou, owedToday, recentNumbers } from "../../../../lib/today";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today — Studio", robots: { index: false } };

const LEAD_KINDS = ["quote", "card", "contact", "promo"];

// Each block loads on its own and fails on its own: a table that isn't set
// up yet (or a column from supabase/studio-2.sql that isn't there yet) turns
// into `ok: false` / a hint for that one block, never an error page.
async function quiet(fn, fallback) {
  try { return await fn(); } catch { return fallback; }
}

export default async function TodayPage() {
  const user = await requireAdminPage();
  const db = supabaseAdmin();
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

  const LEAD_COLS = "id, created_at, updated_at, kind, name, email, phone, summary, fields, status, source_path, utm, visitor";
  const loadLeads = (cols) =>
    db.from("submissions").select(cols).in("kind", LEAD_KINDS).in("status", ["new", "contacted"]).order("created_at", { ascending: false }).limit(300);

  const [newCount, shootsRes, leadsRes, payRes, balances, monthRes, bookingsRes] = await Promise.all([
    quiet(() => newLeadCount(), 0),
    quiet(() => db.from("shoots").select("*").order("date", { ascending: true, nullsFirst: false }), { error: true }),
    quiet(async () => {
      // next_follow_up arrives with supabase/studio-2.sql — ask again without it if it isn't there.
      const full = await loadLeads(`${LEAD_COLS}, next_follow_up`);
      if (!full.error) return { data: full.data, followUps: true };
      const base = await loadLeads(LEAD_COLS);
      return base.error ? { error: true } : { data: base.data, followUps: false };
    }, { error: true }),
    quiet(() => db.from("submissions").select("id, kind, email, created_at").eq("kind", "booking").limit(2000), { error: true }),
    quiet(async () => ({ ok: true, ...(await balancesToSend(db, { now: now.getTime() })) }), { ok: false, due: [], unclear: [] }),
    quiet(() => db.from("submissions").select("id, kind, email, status, source_path, created_at").in("kind", LEAD_KINDS).gte("created_at", monthAgo).limit(5000), { error: true }),
    quiet(() => db.from("bookings").select("id, created_at, email, status").gte("created_at", monthAgo), { error: true }),
  ]);

  // Shoots → next shoot + what's owed.
  const shootsOk = !shootsRes.error;
  const shootRows = shootsOk ? shootsRes.data || [] : [];
  // Delivery columns exist once studio-2.sql has been run; with no shoots yet, ask the table.
  let deliveryReady = shootRows.length ? "final_delivered_at" in shootRows[0] : false;
  if (shootsOk && !shootRows.length) {
    const probe = await quiet(() => db.from("shoots").select("final_delivered_at").limit(1), { error: true });
    deliveryReady = !probe.error;
  }
  const next = nextShoot(shootRows, now);

  // Leads → who's waiting. What they did on the site sharpens "your next move" (same as the Inbox).
  const leadsOk = !leadsRes.error;
  const leadRows = leadsOk ? leadsRes.data || [] : [];
  const did = {};
  const visitors = [...new Set(leadRows.filter((r) => r.visitor).map((r) => r.visitor))].slice(0, 150);
  if (visitors.length) {
    const ev = await quiet(
      () => db.from("site_events").select("created_at, type, name, path, utm_source, visitor").in("visitor", visitors).order("created_at", { ascending: false }).limit(5000),
      { data: [] }
    );
    const byVisitor = new Map();
    for (const e of ev.data || []) {
      if (!byVisitor.has(e.visitor)) byVisitor.set(e.visitor, []);
      byVisitor.get(e.visitor).push(e);
    }
    for (const r of leadRows) if (r.visitor && byVisitor.has(r.visitor)) did[r.id] = actionsFor(byVisitor.get(r.visitor));
  }
  const paySubs = payRes.error ? [] : payRes.data || [];
  const needYou = leadsNeedingYou(leadRows, did, now.getTime(), paySubs.map((p) => p.email));

  const numbersOk = !monthRes.error;
  const nums = recentNumbers({
    subs: numbersOk ? monthRes.data || [] : [],
    bookings: bookingsRes.error ? [] : bookingsRes.data || [],
    paySubs: paySubs.filter((p) => p.created_at >= monthAgo),
  });

  const view = {
    dayLabel: now.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" }),
    shoots: { ok: shootsOk, next: next.shoot, alsoThisWeek: next.alsoThisWeek, undated: next.undated },
    leads: { ok: leadsOk, followUps: leadsOk ? leadsRes.followUps : true, rows: needYou },
    owed: { ok: shootsOk, ready: deliveryReady, rows: owedToday(shootRows, deliveryReady, now) },
    balances: {
      ok: balances.ok,
      due: balances.due.map((b) => ({ id: b.id, name: b.name, phone: b.phone || "", owed: b.owed, event: b.event || "", link: b.link, days: b.days })),
      unclear: balances.unclear.length,
    },
    numbers: { ok: numbersOk, ...nums },
  };

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="today" newCount={newCount} kick="Studio" title="Today">
        <TodayBoard view={view} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
