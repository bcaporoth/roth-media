import { notFound } from "next/navigation";
import LegalPage from "../../../components/LegalPage";
import AgreementSign from "../../../components/AgreementSign";
import AgreementText from "../../../components/AgreementText";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { stripe, stripeConfigured } from "../../../lib/stripe";
import { recordBooking } from "../../../lib/booking";
import { AGREEMENT_KINDS, agreementText, money } from "../../../lib/agreements";

export const metadata = { title: "Sign & pay", robots: { index: false } };
export const dynamic = "force-dynamic";

// A private link Brandon sends one client: the agreement, a typed
// signature, and Stripe checkout for this month's amount — one page.
export default async function SignPage({ params, searchParams }) {
  const { token } = await params;
  const sp = await searchParams;
  if (!adminConfigured || !/^[A-Za-z0-9_-]{8,40}$/.test(String(token || ""))) notFound();
  const db = supabaseAdmin();
  let { data: row } = await db.from("agreements").select("*").eq("token", token).maybeSingle();
  if (!row || row.status === "void") notFound();

  // Back from Stripe: confirm with Stripe itself, never the URL.
  const s = String(sp?.s || "");
  if (row.status !== "paid" && stripeConfigured && /^cs_(live|test)_[A-Za-z0-9]+$/.test(s)) {
    try {
      const session = await stripe("GET", `/checkout/sessions/${s}`);
      if (session?.metadata?.agreement === String(row.id)) {
        await recordBooking(session);
        ({ data: row } = await db.from("agreements").select("*").eq("id", row.id).single());
      }
    } catch {}
  }

  const k = AGREEMENT_KINDS[row.kind] || AGREEMENT_KINDS.upkeep;
  const first = String(row.client_name || "").split(/\s+/)[0] || "Hi";
  const text = row.kind === "invoice" ? agreementText("invoice", row) : row.agreement_text || agreementText(row.kind, row);

  if (row.status === "paid") {
    return (
      <LegalPage kick={k.title} title={`${first}, you're all set.`} updated="" plain>
        <div className="mx-done" role="status">
          <p className="mx-done-title">{money(row.paid_cents || row.amount_cents)} paid{row.period ? ` for ${row.period}` : ""}. Thank you!</p>
          <p>A receipt is on its way to {row.client_email}. {row.kind === "invoice" ? "" : "Send your changes any time — text or email, one batch at a time, with the final words and files."}</p>
        </div>
      </LegalPage>
    );
  }

  const title = row.kind === "invoice" ? `${first}, here's your invoice.` : `${first}, here's your website upkeep agreement.`;
  const intro = row.kind === "invoice"
    ? `One amount, one button. Pay by card, Apple Pay or Google Pay.`
    : row.sign_required && row.status !== "signed"
    ? `Read it (two minutes), type your name to sign, and pay this month's amount — all on this page.`
    : `You've already signed — this is this month's payment.`;

  return (
    <LegalPage kick={k.title} title={title} updated="" plain>
      <p className="cx-lede mx-pa-intro">{intro}</p>
      <AgreementSign token={token} row={row} checkout={stripeConfigured}>
        {row.kind === "invoice" && !row.note ? null : <AgreementText text={text} />}
      </AgreementSign>
    </LegalPage>
  );
}
