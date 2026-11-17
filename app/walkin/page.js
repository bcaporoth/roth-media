import LegalPage from "../../components/LegalPage";
import WalkinForm from "../../components/WalkinForm";
import "../theme/walkin.css";
import { walkinKeyOk, WALKIN_GIFT } from "../../lib/walkin";

export const metadata = { title: "Claim your free gallery", robots: { index: false } };
export const dynamic = "force-dynamic";

// Where Brandon's walk-in QR lands (Studio → More → Walk-in). Three boxes
// and one button; the owner ends up signed in on their portal home.
export default async function WalkinPage({ searchParams }) {
  const sp = await searchParams;
  const k = String(sp?.k || "");
  if (!walkinKeyOk(k)) {
    return (
      <LegalPage kick="Roth Media" title="This page opens from Brandon's QR code." updated="" plain>
        <div className="mx-done" role="status">
          <p className="mx-done-title">Ask Brandon to show you the code again.</p>
          <p>Already have an account? <a href="/portal">Sign in here</a>.</p>
        </div>
      </LegalPage>
    );
  }
  return (
    <LegalPage kick="Roth Media · walk-in" title="Brandon walked in. Here's your account." updated="" plain>
      <WalkinForm k={k} gift={WALKIN_GIFT} />
    </LegalPage>
  );
}
