import Link from "next/link";
import { notFound } from "next/navigation";
import LegalPage from "../../../../components/LegalPage";
import PartnerReportView from "../../../../components/PartnerReportView";
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
    <LegalPage kick={`${p.lead?.brand || p.first} · results`} title={`${s.label}`} updated="">
      <p className="prep-nav">
        <Link href={q(prevMonth(month))}>← {monthLabel(prevMonth(month))}</Link>
        {month < thisMonth() && <Link href={q(next)}>{monthLabel(next)} →</Link>}
      </p>
      <PartnerReportView s={s} closing={a?.closing} />
      <h2>Where these numbers come from</h2>
      <ul>
        <li><strong>Leads</strong> are the people who filled in your sign-up page from an ad, counted the moment they hit send.</li>
        <li><strong>New customers</strong> are leads who signed up with you, marked by Brandon the day they do, with what they chose.</li>
        <li><strong>Ad spend</strong> comes from your Meta Ads Manager{s.spendUpdated ? `, last updated ${new Date(s.spendUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}. You can check it anytime in your own ad account.</li>
      </ul>
      <p>This page updates live. Questions about any number? Text Brandon at 845-549-4425.</p>
    </LegalPage>
  );
}
