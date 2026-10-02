import { notFound } from "next/navigation";
import LegalPage from "../../../components/LegalPage";
import PartnerSignup from "../../../components/PartnerSignup";
import PartnerAgreement from "../../../components/PartnerAgreement";
import { PARTNERS } from "../../../lib/partners";
import { stripeConfigured } from "../../../lib/stripe";

export const metadata = { title: "Partner plan — sign up", robots: { index: false } };
export const dynamic = "force-dynamic";

// A partner's private page: pick the plan, sign, pay — Brandon sends the link.
export default async function PartnerPage({ params }) {
  const { slug } = await params;
  const p = PARTNERS[slug];
  if (!p) notFound();
  return (
    <LegalPage kick={`Partner plan · ${p.pct}% off your first ${p.months || 3} months`} title={`${p.first}, here’s your partner plan.`} updated="">
      <p>Pick what you want, read the agreement, sign, and pay — all on this page, in about five minutes. Every price is {p.pct}% off the list price for your first {p.months || 3} months; then we sit down together, look at the results, and agree on what’s next. Switch plans or cancel with 30 days’ notice.</p>
      <PartnerSignup slug={slug} pct={p.pct} months={p.months || 3} checkout={stripeConfigured}>
        <PartnerAgreement pct={p.pct} months={p.months || 3} />
      </PartnerSignup>
    </LegalPage>
  );
}
