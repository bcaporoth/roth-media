import { notFound } from "next/navigation";
import LegalPage from "../../../../components/LegalPage";
import { PARTNERS } from "../../../../lib/partners";
import { recordBooking } from "../../../../lib/booking";
import { stripe, stripeConfigured } from "../../../../lib/stripe";

export const metadata = { title: "You're in", robots: { index: false } };
export const dynamic = "force-dynamic";

// Stripe sends the partner here after paying. Records the signup (the
// webhook does too — whichever lands first wins, the other is a no-op).
export default async function PartnerWelcome({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = PARTNERS[slug];
  if (!p) notFound();
  if (stripeConfigured && /^cs_/.test(String(sp?.s || ""))) {
    try { await recordBooking(await stripe("GET", `/checkout/sessions/${sp.s}`)); } catch {}
  }
  return (
    <LegalPage kick="Partner plan" title={`You’re in, ${p.first}.`} updated="">
      <p>Your plan is active and your signed agreement is saved. Stripe emailed your receipt.</p>
      <h2>What happens next</h2>
      <ol>
        <li><strong>Brandon texts you today</strong> to pick your first shoot day.</li>
        <li>If you picked ads: add Brandon as a partner on your Facebook ad account when he sends the request, and set your ad budget (about $200 a month to start).</li>
        <li>Your content lands in your client gallery within 14 days of each shoot.</li>
      </ol>
      <p>Update your card, see payments, or cancel anytime at <a href="/billing">rothmediaco.com/billing</a>.</p>
    </LegalPage>
  );
}
