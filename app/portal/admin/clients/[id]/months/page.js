import { notFound } from "next/navigation";
import PortalNav from "../../../../../../components/PortalNav";
import StudioShell from "../../../../../../components/StudioShell";
import StudioFooter from "../../../../../../components/StudioFooter";
import MonthsBoard from "../../../../../../components/MonthsBoard";
import { requireAdminPage } from "../../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../../../lib/studio-data";
import { ensureBrand } from "../../../../../../lib/brand-server";
import { aiConfigured } from "../../../../../../lib/content-plan-server";
import { stripeConfigured } from "../../../../../../lib/stripe";
import { monthKey, isMonth, ensureMonth, listMonths, refreshPaid } from "../../../../../../lib/months-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Months — Studio", robots: { index: false } };

// Studio → Clients → profile → Months (the retainer). ?m=YYYY-MM opens a month.
export default async function ClientMonthsPage({ params, searchParams }) {
  const user = await requireAdminPage();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, name, email").eq("id", id).maybeSingle();
  if (!client) notFound();
  const month = isMonth(sp?.m) ? sp.m : monthKey();
  let row = null, months = [], err = "";
  try {
    await ensureBrand(db, client);
    row = await refreshPaid(db, await ensureMonth(db, client.id, month));
    months = (await listMonths(db, client.id)) || [];
  } catch (e) { err = e.message; }
  const newCount = await newLeadCount();
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="clients" newCount={newCount} kick={`Studio · Clients · ${client.name || client.email}`} title="Months">
        <p className="gcard-meta"><a className="achip" href={`/portal/admin/clients/${client.id}`}>← {client.name || "Client"}</a></p>
        {err
          ? <p className="sm-sqlhint">{/content_months/.test(err) ? <>Months aren&apos;t set up yet — run <code>supabase/content-months.sql</code> once in the Supabase SQL editor.</> : err}</p>
          : <MonthsBoard client={{ id: client.id, name: client.name || "", email: client.email }} initialMonth={month} initial={row} months={months} aiReady={aiConfigured} stripeReady={stripeConfigured} />}
      </StudioShell>
      <StudioFooter />
    </>
  );
}
