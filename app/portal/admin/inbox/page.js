import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import InboxBoard from "../../../../components/InboxBoard";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../lib/studio-data";
import { actionsFor } from "../../../../lib/lead-intel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inbox — Studio",
  robots: { index: false },
};

export default async function InboxPage() {
  const user = await requireAdminPage();
  const db = supabaseAdmin();
  const BASE =
    "id, created_at, updated_at, kind, name, email, phone, subject, summary, fields, status, notes, read_at, source_path, utm, visitor";
  // The action-bar columns come with supabase/studio-2.sql. Until it's run,
  // asking for them fails — so ask again without them and the inbox still loads.
  const load = (cols) =>
    db
      .from("submissions")
      .select(cols)
      .not("kind", "in", "(partner_lead,partner_month,call,intake_sent)") // partner leads live in Studio → Partners
      .order("created_at", { ascending: false })
      .limit(500);
  let migrated = true;
  let { data, error } = await load(`${BASE}, first_contacted_at, next_follow_up, lost_reason`);
  if (error) {
    const retry = await load(BASE);
    if (!retry.error) {
      migrated = false;
      data = retry.data;
      error = null;
    }
  }

  // What each open lead did on the site (same signals Stats uses for heat).
  // Visitor ids never leave the server.
  const did = {};
  const rows = data || [];
  const visitors = [...new Set(rows.filter((r) => r.visitor && (r.status === "new" || r.status === "contacted")).map((r) => r.visitor))].slice(0, 150);
  if (visitors.length) {
    const { data: events } = await db
      .from("site_events")
      .select("created_at, type, name, path, utm_source, visitor")
      .in("visitor", visitors)
      .order("created_at", { ascending: false })
      .limit(5000);
    const byVisitor = new Map();
    for (const e of events || []) {
      if (!byVisitor.has(e.visitor)) byVisitor.set(e.visitor, []);
      byVisitor.get(e.visitor).push(e);
    }
    for (const r of rows) if (r.visitor && byVisitor.has(r.visitor)) did[r.id] = actionsFor(byVisitor.get(r.visitor));
  }
  const items = rows.map(({ visitor, ...r }) => r);
  const newCount = await newLeadCount();

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="inbox" newCount={newCount} kick="Studio" title="Inbox">
        {error ? (
          <p className="portal-empty">
            The inbox table isn&apos;t set up yet — run <code>supabase/studio.sql</code> in the
            Supabase SQL editor once, then refresh.
          </p>
        ) : (
          <InboxBoard initial={items} did={did} migrated={migrated} />
        )}
      </StudioShell>
      <StudioFooter />
    </>
  );
}
