import Link from "next/link";
import BrandMark from "../../components/BrandMark";
import IntakeForm from "../../components/IntakeForm";
import { PHONE } from "../../lib/site";

export const metadata = {
  title: "Before we talk",
  description: "A short questionnaire so our first call is about you.",
  robots: { index: false },
};

// Brandon sends this link (Studio → Clients → Send intake link). The answers
// land on the client's profile in Studio; then they pick a call time.
export default async function IntakePage({ searchParams }) {
  const sp = await searchParams;
  const tel = PHONE.replace(/\D/g, "");
  return (
    <>
      <nav className="rm-nav portal-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          <span className="brand-chip"><BrandMark /></span>
          <span className="brand-text">Roth <em>Media</em></span>
        </Link>
        <ul className="nav-links"><li><a href={`sms:+1${tel}`}>{PHONE}</a></li></ul>
      </nav>
      <main className="quote-wrap legal-wrap intake-wrap">
        <div className="kick">Before we talk</div>
        <h1>Tell me about it.</h1>
        <p className="lead">Five minutes, a guess is fine on anything you don&apos;t know yet. I read every word before our call so we can skip the basics and get to the good part.</p>
        <IntakeForm email={String(sp?.email || "")} name={String(sp?.name || "")} type={String(sp?.type || "")} />
      </main>
    </>
  );
}
