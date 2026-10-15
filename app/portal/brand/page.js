import "../../theme/brand.css";
import { redirect } from "next/navigation";
import PortalNav from "../../../components/PortalNav";
import { PortalFrame, PortalNotice } from "../../../components/PortalViews";
import BrandPalette from "../../../components/BrandPalette";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { loadBrand } from "../../../lib/brand-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your brand palette",
  robots: { index: false },
};

// The client's brand palette (docs/BRAND-PALETTE-SPEC.md). Brandon opens it
// from Studio ("Send brand palette"); until then this page says so. Saves
// go through /api/portal/brand, matched to the signed-in email.
export default async function BrandPage() {
  if (!portalConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal?next=/portal/brand");
  const email = user.email.toLowerCase();
  const isAdmin = email === ADMIN_EMAIL;
  const nav = <PortalNav email={user.email} isAdmin={isAdmin} active="brand" />;
  const notice = (title, body) => <PortalNotice nav={nav} kicker="Your brand palette" title={title}>{body}</PortalNotice>;

  if (!adminConfigured) return notice("Almost ready.", "Text me at 845-549-4425 and I'll send it over.");
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, name").eq("email", email).maybeSingle();
  if (!client) return notice(<>Hi — I don&apos;t have your account set up yet.</>, <>You&apos;re signed in as {user.email}, but that email isn&apos;t linked to a client account. Text me at <a href="tel:+18455494425">845-549-4425</a> and I&apos;ll fix it.</>);

  const b = await loadBrand(db, client.id);
  if (!b.ready || !b.palette) return notice("Not open yet.", <>Your brand palette opens once I send it to you. Text me at <a href="tel:+18455494425">845-549-4425</a> if you were expecting it.</>);

  const name = b.palette.data?.business?.name || client.name;
  return (
    <PortalFrame nav={nav} className="pt-brand mx-page">
      <header className="cx-wrap pt-head">
        <p className="cx-kick">Your brand palette</p>
        <h1 className="cx-h1 cx-h1--long">{name || "Your brand"}</h1>
        <p className="cx-lede">Logo, colors, look, customers and goals, in one place. I plan every shoot, edit and caption for you from it. It saves as you go — skip anything and we&apos;ll cover it on a call.</p>
      </header>
      <section className="cx-section cx-section--tight">
        <div className="cx-wrap">
          <BrandPalette mode="client" initial={b.palette} initialAssets={b.assets} />
        </div>
      </section>
    </PortalFrame>
  );
}
