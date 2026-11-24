import "../../../../../theme/misc.css";
import { notFound } from "next/navigation";
import PortalNav from "../../../../../../components/PortalNav";
import { PortalFrame } from "../../../../../../components/PortalViews";
import PortalTop from "../../../../../../components/PortalTop";
import IntakeForm from "../../../../../../components/IntakeForm";
import { requireAdminPage } from "../../../../../../lib/admin-guard";
import { supabaseAdmin } from "../../../../../../lib/supabase-admin";
import { briefsByType, clientType, TYPES } from "../../../../../../lib/intake";
import { isNoEmail } from "../../../../../../lib/no-email";

export const dynamic = "force-dynamic";
export const metadata = { title: "Intake — Command Center", robots: { index: false } };

// Command Center → client → "Fill in intake" (2026-11-24, Brandon: "sitting
// down with them … make it very easily accessible for me to view and fill out
// their intake form"). Same questions as /intake, already filled with what
// they've answered before, saved over the same record as they type.
export default async function ClientIntakePage({ params, searchParams }) {
  const user = await requireAdminPage();
  const { id } = await params;
  const sp = (await searchParams) || {};
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, email, name, phone").eq("id", id).maybeSingle();
  if (!client) notFound();
  const email = client.email.toLowerCase();
  const { data: subs } = await db.from("submissions").select("id, created_at, updated_at, kind, fields, utm, name, phone").eq("email", email).order("created_at", { ascending: false }).limit(60);
  const all = subs || [];
  const byType = briefsByType(all);
  const ids = TYPES.map((t) => t.id);
  const guess = clientType({ subs: all, shoots: [] });
  const type = ids.includes(sp.type) ? sp.type : ids.includes(guess) ? guess : "";
  const initialByType = Object.fromEntries(ids.map((t) => [t, { ...(byType[t]?.answers || {}) }]));
  // A walk-in already told us the business name: start that answer with it.
  const walkin = all.find((s) => s.kind === "walkin");
  const biz = String(walkin?.utm?.business || (walkin?.fields || []).find(([k]) => k === "business")?.[1] || "");
  if (biz && !initialByType.business["Business name and what you do"]) initialByType.business["Business name and what you do"] = biz;
  const first = (client.name || "").split(" ")[0] || "them";
  const back = `/portal/admin/clients/${client.id}`;
  const nav = <PortalNav email={user.email} isAdmin active="admin" />;

  return (
    <PortalFrame nav={nav} className="pt-brief mx-page">
      <PortalTop
        who={{ kick: "Command Center · Intake", title: client.name || client.email }}
        page={`Fill it in with ${first}`}
        lede={<>Nothing is required. <strong>It saves by itself as you type</strong>, so you can stop and come back any time. No emails go out. <a href={back}>Back to {first}&apos;s profile</a></>}
      />
      <section className="cx-section cx-section--tight">
        <div className="cx-wrap cx-wrap--narrow">
          {isNoEmail(email) ? (
            <p className="cx-lede">{first} needs an email on file first. Add it in their Settings tab, then come back. <a href={`${back}#settings`}>Open Settings</a></p>
          ) : (
            <IntakeForm
              mode="admin"
              email={email}
              name={client.name || ""}
              phone={client.phone || ""}
              type={type}
              initialByType={initialByType}
              savedTypes={Object.keys(byType)}
              backHref={back}
              quoteBase="/portal/admin/quotes?from="
            />
          )}
        </div>
      </section>
    </PortalFrame>
  );
}
