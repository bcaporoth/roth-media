import PortalNav from "../../../../components/PortalNav";
import StudioShell from "../../../../components/StudioShell";
import StudioFooter from "../../../../components/StudioFooter";
import CopyChip from "../../../../components/CopyChip";
import { requireAdminPage } from "../../../../lib/admin-guard";
import { newLeadCount } from "../../../../lib/studio-data";
import { OPEN_AMOUNT_LINK, RETAINER_RATE, payablePackages } from "../../../../lib/payments";
import { money } from "../../../../lib/packages";
import PartnerCharge from "../../../../components/PartnerCharge";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments — Studio",
  robots: { index: false },
};

export default async function PayAdminPage() {
  const user = await requireAdminPage();
  const newCount = await newLeadCount();
  const pkgs = payablePackages();
  const live = pkgs.filter((p) => p.link).length + (OPEN_AMOUNT_LINK ? 1 : 0);
  // Active partners (signed + paid at /partner/<slug>) — for closing fees and events.
  const { data: partners } = await supabaseAdmin().from("submissions").select("id, name, phone, summary, fields, utm").eq("kind", "partner").eq("status", "booked").order("created_at", { ascending: false });

  return (
    <>
      <PortalNav email={user.email} isAdmin active="admin" />
      <StudioShell active="pay" newCount={newCount} kick="Studio" title="Payments">
        <div className="atoolbar">
          <a className="abtn" href="https://dashboard.stripe.com/payments" target="_blank" rel="noreferrer">
            Stripe payments ↗
          </a>
          <a className="abtn abtn-ghost" href="https://dashboard.stripe.com/payment-links" target="_blank" rel="noreferrer">
            Payment links ↗
          </a>
          <a className="abtn abtn-ghost" href="https://dashboard.stripe.com/invoices/create" target="_blank" rel="noreferrer">
            New invoice ↗
          </a>
          <a className="abtn abtn-ghost" href="/pay" target="_blank" rel="noreferrer">
            Your pay page ↗
          </a>
        </div>

        <p className="inbox-hint">
          {live} of {pkgs.length + 1} pay buttons are live. Retainer = {Math.round(RETAINER_RATE * 100)}% of the
          package. Text a client the link below, or send them to rothmediaco.com/pay.
        </p>

        {(partners || []).filter((p) => p.utm?.stripe_customer).length > 0 && (
          <section className="psection">
            <h2>Partner charges</h2>
            <p className="inbox-hint">Closing fees and events go on the partner’s saved card. Text them the amount first, then charge 3 or more days later (their agreement, §3).</p>
            {(partners || []).filter((p) => p.utm?.stripe_customer).map((p) => (
              <div key={p.id} className="pcard">
                <strong>{p.summary}</strong>
                {(p.fields || []).filter(([k]) => k === "charge").slice(-3).map(([, v]) => <em key={v}>{v}</em>)}
                <PartnerCharge id={p.id} name={p.name} phone={p.phone} />
              </div>
            ))}
          </section>
        )}

        <ul className="paylist">
          {pkgs.map((p) => (
            <li key={p.key}>
              <span>
                <strong>{p.name}</strong>
                <em>
                  {money(p.retainer)} retainer · {money(p.price)} total
                </em>
              </span>
              {p.link ? (
                <CopyChip text={p.link} label="Copy pay link" />
              ) : (
                <span className="itag itag-new">link not set</span>
              )}
            </li>
          ))}
          <li>
            <span>
              <strong>Balance / invoice</strong>
              <em>Client types the amount</em>
            </span>
            {OPEN_AMOUNT_LINK ? (
              <CopyChip text={OPEN_AMOUNT_LINK} label="Copy pay link" />
            ) : (
              <span className="itag itag-new">link not set</span>
            )}
          </li>
        </ul>
      </StudioShell>
      <StudioFooter />
    </>
  );
}
