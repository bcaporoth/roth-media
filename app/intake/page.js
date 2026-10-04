import "../theme/misc.css";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
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
      <SiteNav cta={{ href: `sms:+1${tel}`, label: `Text ${PHONE}` }} />
      <main className="cx-page cx-page--hero mx-page mx-intake">
        <header className="cx-hero cx-hero--plain mx-intake-head">
          <div className="cx-wrap cx-wrap--narrow cx-hero-body">
            <p className="cx-kick">Before we talk</p>
            <h1 className="cx-h1">Tell me about it.</h1>
            <p className="cx-lede">Five minutes, a guess is fine on anything you don&apos;t know yet. I read every word before our call so we can skip the basics and get to the good part.</p>
          </div>
        </header>
        <section className="cx-section cx-section--tight">
          <div className="cx-wrap cx-wrap--narrow">
            <IntakeForm email={String(sp?.email || "")} name={String(sp?.name || "")} type={String(sp?.type || "")} />
          </div>
        </section>
      </main>
      <SiteFooter slim />
    </>
  );
}
