import { notFound } from "next/navigation";
import PartnerLeadForm from "../../../components/PartnerLeadForm";
import { PARTNERS } from "../../../lib/partners";
import { videoUrl } from "../../../lib/media";
import { partnerAgreement } from "../../../lib/partner-stats";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const lead = PARTNERS[slug]?.lead;
  return lead ? { title: { absolute: lead.brand }, description: lead.sub, robots: { index: false } } : {};
}

// Where a partner's ads land. Every sign-up is counted here (the report's
// "leads"), tagged with the ad it came from, and Brandon is alerted.
export default async function PartnerLeadPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const lead = PARTNERS[slug]?.lead;
  if (!lead) notFound();
  const signed = await partnerAgreement(slug).catch(() => null);
  const bookingUrl = lead.bookingUrl || signed?.utm?.booking_url || "";
  const utm = Object.fromEntries(["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"].filter((k) => sp?.[k]).map((k) => [k, String(sp[k]).slice(0, 120)]));
  return (
    <main className="golead">
      <div className="golead-inner">
        <div className="golead-brand">{lead.brand}</div>
        <h1>{lead.headline}</h1>
        <p className="golead-sub">{lead.sub}</p>
        {lead.video && (
          <video className="golead-video" src={videoUrl(lead.video)} poster={lead.poster} autoPlay muted loop playsInline />
        )}
        <PartnerLeadForm slug={slug} brand={lead.brand} utm={utm} cta={lead.cta} bookingUrl={bookingUrl} />
      </div>
    </main>
  );
}
