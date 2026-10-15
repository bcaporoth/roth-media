import "../../../../../theme/brand.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import PortalNav from "../../../../../../components/PortalNav";
import StudioShell from "../../../../../../components/StudioShell";
import StudioFooter from "../../../../../../components/StudioFooter";
import BrandPalette from "../../../../../../components/BrandPalette";
import { requireAdminPage } from "../../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../../lib/supabase-admin";
import { newLeadCount } from "../../../../../../lib/studio-data";
import { loadBrand, ensureBrand } from "../../../../../../lib/brand-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brand palette — Studio", robots: { index: false } };

// Studio → Clients → profile → Brand palette. The same form the client
// fills in, editable, with your own note under each section.
export default async function ClientBrandPage({ params }) {
  const user = await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, name, email, phone").eq("id", id).maybeSingle();
  if (!client) notFound();
  let b = await loadBrand(db, client.id, { admin: true });
  if (b.ready && !b.palette) {
    await ensureBrand(db, client); // "Open palette" on a client who has none yet
    b = await loadBrand(db, client.id, { admin: true });
  }
  const newCount = await newLeadCount();
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="clients" newCount={newCount} kick={`Studio · Clients · ${client.name || client.email}`} title="Brand palette">
        <div className="gcard-actions bp-studio-bar">
          <Link className="achip" href={`/portal/admin/clients/${client.id}`}>← {client.name || "Client"}</Link>
          {b.palette && <a className="achip" href={`/portal/admin/clients/${client.id}/brand/sheet`} target="_blank" rel="noreferrer">Brand sheet ↗</a>}
        </div>
        {!b.ready
          ? <p className="sm-sqlhint">Brand palettes aren&apos;t set up yet — run <code>supabase/brand.sql</code> once (it&apos;s also in <code>00-all.sql</code>).</p>
          : <BrandPalette mode="admin" clientId={client.id} initial={b.palette} initialAssets={b.assets} initialNotes={b.palette.brandon_notes || {}} />}
      </StudioShell>
      <StudioFooter />
    </>
  );
}
