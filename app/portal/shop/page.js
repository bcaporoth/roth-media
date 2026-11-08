import "../../theme/misc.css";
import { redirect } from "next/navigation";
import PortalNav from "../../../components/PortalNav";
import { PortalFrame } from "../../../components/PortalViews";
import ShopBoard from "../../../components/ShopBoard";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { emailHasBrand } from "../../../lib/brand-server";
import { welcomeOf, briefsByType } from "../../../lib/intake";
import { shopCategories, seedCart, cleanCart } from "../../../lib/shop";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop", robots: { index: false } };

// The client's Shop (2026-11-08): everything they can book from Brandon,
// their cart (saved, and shown on their Studio profile), one tap to pay
// through the normal /pay/cart page, or to send a question / extras request.
export default async function ShopPage() {
  if (!portalConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal?next=/portal/shop");
  const email = user.email.toLowerCase();
  let client = null; let hasBrand = false; let subs = [];
  if (adminConfigured) {
    const db = supabaseAdmin();
    [{ data: client }, hasBrand, { data: subs }] = await Promise.all([
      db.from("clients").select("id, name, phone").eq("email", email).maybeSingle(),
      email === ADMIN_EMAIL ? false : emailHasBrand(db, email),
      db.from("submissions").select("id, kind, created_at, updated_at, fields, utm").in("kind", ["welcome", "intake", "cart"]).eq("email", email).order("created_at", { ascending: false }).limit(20),
    ]);
  }
  const welcome = welcomeOf(subs || []);
  const saved = (subs || []).find((s) => s.kind === "cart");
  const categories = shopCategories(hasBrand ? ["business", ...(welcome?.services || [])] : welcome?.services || []);
  const initial = saved?.utm?.category ? cleanCart(saved.utm) : seedCart({ services: hasBrand ? ["business"] : welcome?.services || [], briefs: briefsByType(subs || []) });
  const nav = <PortalNav email={user.email} isAdmin={email === ADMIN_EMAIL} active="shop" brand={hasBrand} />;

  return (
    <PortalFrame nav={nav} className="pt-brief pt-shop mx-page">
      <header className="cx-wrap pt-head">
        <p className="cx-kick">Shop</p>
        <h1 className="cx-h1 cx-h1--long">Everything you can book.</h1>
        <p className="cx-lede">Pick a package and any extras. Your cart saves as you go, and I can see it too. Pay when you&apos;re ready, or ask me anything first.</p>
      </header>
      <section className="cx-section cx-section--tight">
        <div className="cx-wrap">
          <ShopBoard categories={categories} initial={initial} name={client?.name || ""} email={email} phone={client?.phone || ""} />
        </div>
      </section>
    </PortalFrame>
  );
}
