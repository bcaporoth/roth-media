import Link from "next/link";
import { notFound } from "next/navigation";
import LegalPage from "../../../../components/LegalPage";
import PartnerReportView from "../../../../components/PartnerReportView";
import PartnerJoined from "../../../../components/PartnerJoined";
import { PARTNERS } from "../../../../lib/partners";
import { monthStats, partnerAgreement, validToken, thisMonth, prevMonth, monthLabel } from "../../../../lib/partner-stats";

export const metadata = { title: "Your report", robots: { index: false } };
export const dynamic = "force-dynamic";

// The partner's live report — private link (?k=), always current.
export default async function PartnerReport({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = PARTNERS[slug];
  if (!p || !validToken(slug, sp?.k)) notFound();
  const month = /^\d{4}-\d{2}$/.test(String(sp?.m || "")) && sp.m <= thisMonth() ? sp.m : thisMonth();
  const [s, a] = await Promise.all([monthStats(slug, month), partnerAgreement(slug)]);
  const q = (m) => `/partner/${slug}/report?k=${sp.k}&m=${m}`;
  const next = (() => { const [y, mo] = month.split("-").map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`; })();
  return (
    <LegalPage kick={`${p.lead?.brand || p.first} · results`} title={`${s.label}`} updated="" plain>
      <div className="mx-rep">
        <p className="mx-rep-nav">
          <Link href={q(prevMonth(month))}>← {monthLabel(prevMonth(month))}</Link>
          {month < thisMonth() && <Link href={q(next)}>{monthLabel(next)} →</Link>}
        </p>
        <PartnerReportView s={s} closing={a?.closing} />
        <section className="cx-stack">
          <h2 className="cx-h2">Leads this month ({s.leadCount})</h2>
          <p className="cx-fine">Newest first. Tap <strong>Mark joined</strong> when someone signs up; that’s how the report counts new members.</p>
          {s.leads.length ? (
            <ul className="mx-leads" style={{ width: "100%" }}>
              {s.leads.map((l) => (
                <li key={l.id}>
                  <div><strong>{l.name}</strong><br /><small><a href={`tel:${l.phone}`}>{l.phone}</a>{l.email ? ` · ${l.email}` : ""} · {new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}{l.utm?.utm_content ? ` · ad: ${l.utm.utm_content}` : ""}</small></div>
                  <PartnerJoined slug={slug} k={sp.k} id={l.id} joined={l.status === "booked"} />
                </li>
              ))}
            </ul>
          ) : <p className="cx-lede">No leads yet this month.</p>}
        </section>

        <article className="cx-prose mx-prose">
          <h2>Where these numbers come from</h2>
          <ul>
            <li><strong>Leads</strong> are the people who filled in your sign-up page from an ad, counted the moment they hit send. Each one is also sent to your team right away.</li>
            <li><strong>New members</strong> are the leads your team marks “joined” above.</li>
            <li><strong>Ad spend</strong> comes from your Meta Ads Manager{s.spendUpdated ? `, last updated ${new Date(s.spendUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}. You can check it anytime in your own ad account.</li>
          </ul>
          <p>This page updates live. Questions about any number? Text Brandon at 845-549-4425.</p>
        </article>
      </div>
    </LegalPage>
  );
}
