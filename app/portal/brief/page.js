import "../../theme/misc.css";
import { redirect } from "next/navigation";
import PortalNav from "../../../components/PortalNav";
import { PortalFrame } from "../../../components/PortalViews";
import IntakeForm from "../../../components/IntakeForm";
import WelcomeForm from "../../../components/WelcomeForm";
import PortalTop from "../../../components/PortalTop";
import { portalWho } from "../../../lib/portal-who";

import { createSupabaseServer, portalConfigured } from "../../../lib/supabase";
import { adminConfigured, supabaseAdmin, ADMIN_EMAIL } from "../../../lib/supabase-admin";
import { latestBrief, welcomeOf, briefsByType, TYPES, TYPE_LABEL } from "../../../lib/intake";
import { emailHasBrand } from "../../../lib/brand-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your shoot brief",
  robots: { index: false },
};

// The client's brief, in two steps (2026-11-08):
//   1. Welcome form — who they are, what they want, what's been hard, and
//      which services (one or more). Shows in Studio as their Initial inquiry.
//   2. The detailed questions (same as /intake) for each service they picked.
// Edits save over the same records, so Brandon's call sheet and the shoot's
// day plan always read the current version.
// ?step=welcome reopens step 1; ?type=<service> picks the step-2 form.
export default async function BriefPage({ searchParams }) {
  const sp = (await searchParams) || {};
  if (!portalConfigured) redirect("/portal");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal?next=/portal/brief");
  const email = user.email.toLowerCase();

  let brief = null;
  let client = null;
  let welcome = null;
  let byType = {};
  let hasBrand = false;
  if (adminConfigured) {
    const db = supabaseAdmin();
    const [{ data: subs }, { data: c }, b] = await Promise.all([
      db.from("submissions").select("id, created_at, updated_at, kind, fields, utm, name, phone").in("kind", ["intake", "welcome"]).eq("email", email).order("created_at", { ascending: false }).limit(20),
      db.from("clients").select("name, phone").eq("email", email).maybeSingle(),
      email === ADMIN_EMAIL ? false : emailHasBrand(db, email),
    ]);
    hasBrand = b;
    brief = latestBrief(subs || []);
    welcome = welcomeOf(subs || []);
    byType = briefsByType(subs || []);
    client = c;
    if (brief) {
      const src = (subs || []).find((s) => s.id === brief.id);
      brief.name = src?.name || "";
      brief.phone = src?.phone || "";
    }
  }
  const who = adminConfigured ? await portalWho(supabaseAdmin(), email) : { kick: "Client portal", title: "Hi, there." };
  const nav = <PortalNav email={user.email} isAdmin={email === ADMIN_EMAIL} active="brief" brand={hasBrand} />;
  const name = welcome?.name || brief?.name || client?.name || "";
  const phone = welcome?.phone || brief?.phone || client?.phone || "";

  // Step 1: no welcome form yet (and no older brief), or they asked to edit it.
  const editWelcome = sp.step === "welcome";
  if (!welcome && !brief || editWelcome) {
    return (
      <PortalFrame nav={nav} className="pt-brief mx-page">
        <PortalTop who={who} page={editWelcome ? "About you" : "Step 1 of 2: About you"} lede={editWelcome
          ? "Change anything and save. I see it right away."
          : "A few quick questions about you and what you're after. About three minutes. Next, you'll fill in the details for each thing you pick."} />
        <section className="cx-section cx-section--tight">
          <div className="cx-wrap cx-wrap--narrow">
            <WelcomeForm name={name} phone={phone} services={welcome?.services || []} initial={welcome?.answers || {}} editing={Boolean(welcome)} />
          </div>
        </section>
      </PortalFrame>
    );
  }

  // Step 2: the details for each service they picked (plus any brief they
  // already had from before the welcome form existed).
  const picked = TYPES.map((t) => t.id).filter((id) => (welcome?.services || []).includes(id) || byType[id]);
  const services = picked.length ? picked : TYPES.map((t) => t.id);
  const wanted = TYPES.some((t) => t.id === sp.type) && services.includes(sp.type) ? sp.type : "";
  const current = wanted || services.find((t) => !byType[t]) || services[0];
  const initialByType = Object.fromEntries(services.map((t) => [t, byType[t]?.answers || {}]));
  const doneCount = services.filter((t) => byType[t]).length;
  const latest = services.map((t) => byType[t]?.updated_at).filter(Boolean).sort().pop();
  const when = latest ? new Date(latest).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "";

  return (
    <PortalFrame nav={nav} className="pt-brief mx-page">
      <PortalTop
        who={who}
        page={doneCount === services.length ? "Your brief" : "Step 2 of 2: The details"}
        lede={doneCount === services.length
          ? `Last saved ${when}. Change anything, any time. I see it the moment you save, and your day plan updates with it.`
          : services.length > 1
            ? `You picked ${services.length} things, so there's a short set of questions for each. A guess is fine on anything you don't know yet.`
            : "A guess is fine on anything you don't know yet. You can come back and change it any time before the shoot."}
      />
      <section className="cx-section cx-section--tight">
        <div className="cx-wrap cx-wrap--narrow">
          <ol className="bf-steps">
            <li className={welcome ? "is-done" : ""}>
              <strong>Step 1: About you</strong>
              <a href="/portal/brief?step=welcome">{welcome ? "Edit" : "Fill it in"}</a>
            </li>
            <li className={doneCount === services.length ? "is-done" : ""}>
              <strong>Step 2: The details</strong>
              <span>{doneCount} of {services.length} saved{services.length > 1 ? ` (${services.map((t) => TYPE_LABEL[t]).join(", ")})` : ""}</span>
            </li>
          </ol>
          <IntakeForm
            key={current}
            mode="portal"
            email={user.email}
            name={name}
            phone={phone}
            type={current}
            types={services}
            initialByType={initialByType}
            skipWelcomeAsked={Boolean(welcome)}
          />
        </div>
      </section>
    </PortalFrame>
  );
}
