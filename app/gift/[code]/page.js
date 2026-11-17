import LegalPage from "../../../components/LegalPage";
import WalkinForm from "../../../components/WalkinForm";
import "../../theme/walkin.css";
import { adminConfigured, supabaseAdmin } from "../../../lib/supabase-admin";
import { giftGiver, WALKIN_GIFT } from "../../../lib/walkin";

export const metadata = { title: "You've been gifted", robots: { index: false } };
export const dynamic = "force-dynamic";

// The link on a client's "gift card for a friend" (portal home). It lands the
// friend here: who gifted them, what it is, and the same three boxes as the
// walk-in page. They end up signed in with the gift card on their account.
export default async function GiftPage({ params }) {
  const { code } = await params;
  const giver = adminConfigured ? await giftGiver(supabaseAdmin(), code) : null;
  if (!giver) {
    return (
      <LegalPage kick="Roth Media" title="This gift link isn't working." updated="" plain>
        <div className="mx-done" role="status">
          <p className="mx-done-title">Ask whoever sent it to copy the link again.</p>
          <p>Already have an account? <a href="/portal">Sign in here</a>.</p>
        </div>
      </LegalPage>
    );
  }
  const from = giver.business ? `${giver.first} at ${giver.business}` : giver.first;
  return (
    <LegalPage kick={`From ${from}`} title="You've been gifted." updated="" plain>
      <WalkinForm gift={WALKIN_GIFT} giftCode={giver.code} from={from} />
    </LegalPage>
  );
}
