import "../../theme/misc.css";
import { redirect } from "next/navigation";
import PortalNav from "../../../components/PortalNav";
import { PortalFrame } from "../../../components/PortalViews";
import IntakeForm from "../../../components/IntakeForm";
import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { latestBrief } from "../../../lib/intake";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your shoot brief",
  robots: { index: false },
};

// The client's brief — the same questions as /intake, but theirs to come
// back to. Edits save over the same record, so Brandon's call sheet and the
// shoot's day plan always read the current version.
export default async function BriefPage() {
  if (!portalConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal?next=/portal/brief");
  const email = user.email.toLowerCase();

  let brief = null;
  let client = null;
  if (adminConfigured) {
    const db = supabaseAdmin();
    const [{ data: subs }, { data: c }] = await Promise.all([
      db.from("submissions").select("id, created_at, updated_at, kind, fields, utm, name, phone").eq("kind", "intake").eq("email", email).order("created_at", { ascending: false }).limit(3),
      db.from("clients").select("name, phone").eq("email", email).maybeSingle(),
    ]);
    brief = latestBrief(subs || []);
    client = c;
    if (brief) {
      const src = (subs || []).find((s) => s.id === brief.id);
      brief.name = src?.name || "";
      brief.phone = src?.phone || "";
    }
  }
  const nav = <PortalNav email={user.email} isAdmin={email === ADMIN_EMAIL} active="brief" />;
  const when = brief?.updated_at ? new Date(brief.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "";

  return (
    <PortalFrame nav={nav} className="pt-brief mx-page">
      <header className="cx-wrap cx-wrap--narrow pt-head">
        <p className="cx-kick">Your shoot brief</p>
        <h1 className="cx-h1 cx-h1--long">{brief ? "Everything I know about your day." : "Tell me about it."}</h1>
        <p className="cx-lede">
          {brief
            ? `Last saved ${when}. Change anything, any time — a new location, the outfits, the one shot you can't miss. I see it the moment you save, and your day plan updates with it.`
            : "Five minutes, a guess is fine on anything you don't know yet. You can come back and change it any time before the shoot."}
        </p>
      </header>
      <section className="cx-section cx-section--tight">
        <div className="cx-wrap cx-wrap--narrow">
          <IntakeForm
            mode="portal"
            email={user.email}
            name={brief?.name || client?.name || ""}
            phone={brief?.phone || client?.phone || ""}
            type={brief?.type || ""}
            initial={brief?.answers || {}}
          />
        </div>
      </section>
    </PortalFrame>
  );
}
