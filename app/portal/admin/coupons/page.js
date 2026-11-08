import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import CouponsBoard from "../../../../components/CouponsBoard";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { newLeadCount } from "../../../../lib/studio-data";
import { adminConfigured, supabaseAdmin } from "../../../../lib/supabase-admin";
import { listCoupons } from "../../../../lib/coupons-server";
import { PACKAGES, CATEGORIES } from "../../../../lib/packages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coupons — Studio", robots: { index: false } };

// Studio → Money → Coupons (2026-11-08): make a code, pick what it takes off
// and what it covers, pause or delete it. Works on the quote page, the pay
// page and checkout (lib/coupons-server.js).
export default async function CouponsAdmin() {
  const user = await requireAdminPage();
  const newCount = await newLeadCount();
  let coupons = [];
  let error = "";
  if (adminConfigured) {
    try { coupons = await listCoupons(supabaseAdmin()); } catch (e) { error = e.message; }
  }
  const menu = CATEGORIES.map((c) => ({ id: c.id, title: c.id === "family" ? "Portraits" : c.id === "business" ? "Business" : "Weddings", packages: (PACKAGES[c.id] || []).map((p) => ({ id: p.id, name: p.name, price: p.price })) }));
  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="coupons" newCount={newCount} kick="Studio · Money" title="Coupons">
        {error && <p className="cform-error">{error}</p>}
        <CouponsBoard initial={coupons} menu={menu} />
      </StudioShell>
      <StudioFooter />
    </>
  );
}
