import LegalPage from "../../components/LegalPage";
import { optOut } from "../../lib/unsubscribe";

export const metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ searchParams }) {
  const { t } = await searchParams;
  const ok = await optOut(t);
  return (
    <LegalPage kick="Email" title={ok ? "You're unsubscribed." : "That link didn't work."} updated="">
      {ok ? (
        <>
          <p>No more marketing emails from Roth Media. You&apos;ll still get emails about work you&apos;ve booked with us — a gallery that&apos;s ready, an invoice, a schedule change.</p>
          <p>Changed your mind? Reply to any of our emails and we&apos;ll switch you back on.</p>
        </>
      ) : (
        <p>The unsubscribe link looks incomplete or was already used. Reply to any Roth Media email with &quot;STOP&quot; and we&apos;ll take you off by hand.</p>
      )}
    </LegalPage>
  );
}
