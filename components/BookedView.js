import SiteNav from "./SiteNav";
import PurchasePing from "./PurchasePing";
import SiteFooter from "./SiteFooter";
import { money } from "../lib/packages";
import { bookingLabel } from "../lib/booking";
import { CALENDLY, EMAIL, PHONE } from "../lib/site";
import { REFERRAL_AMOUNT, referralLink, referralPitch } from "../lib/referral-rules";

// What /booked shows once app/booked/page.js has checked the Stripe session.
// Pure display: every value is worked out by the page and passed in.
// A real photo sits beside the receipt, matched to what they booked.
const PHOTO = {
  wedding: { src: "/photos/39-wedding-sealed.jpg", alt: "The first kiss at an outdoor ceremony while the guests applaud", pos: "50% 36%" },
  business: { src: "/photos/41-gym-mid-set-laughter.jpg", alt: "A lifter laughing mid-set at the squat rack, black and white", pos: "50% 30%" },
  family: { src: "/photos/04-senior-portrait-golden-hour.jpg", alt: "A senior portrait — a young woman sitting on steel steps holding a volleyball, backlit by the evening sun", pos: "50% 24%" },
};

function Shell({ kick, title, children }) {
  return (
    <>
      <SiteNav />
      <main className="cx-page cx-page--hero qt-page qt-booked">
        <header className="cx-hero cx-hero--plain qt-head">
          <div className="cx-wrap cx-hero-body">
            <p className="cx-kick">{kick}</p>
            <h1 className="cx-h1 cx-h1--long">{title}</h1>
            <p className="cx-lede">Questions? Email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> or text {PHONE}.</p>
          </div>
        </header>
        {children}
      </main>
      <SiteFooter slim />
    </>
  );
}

export default function BookedView({ paid, m = {}, q = null, paidAmt = "", amountTotal = 0, first = "", refCode = null, sessionId = "" }) {
  if (!paid) {
    return (
      <Shell kick="Booking" title="We couldn't find that payment.">
        <section className="cx-section cx-section--tight">
          <div className="cx-wrap cx-stack">
            <p className="cx-lede qt-booked-miss">If your card was charged, you&apos;re booked — Stripe&apos;s receipt is on its way and I&apos;ll be in touch within 24 hours. If it wasn&apos;t, head back to the <a href="/quote">quote</a> and try again, or text 845-549-4425 and I&apos;ll sort it by hand.</p>
            <p className="cx-cta-row">
              <a href="/quote" className="cx-btn cx-btn--light cx-btn--lg">Back to the quote</a>
              <a href={`sms:+1${PHONE.replace(/\D/g, "")}`} className="cx-btn cx-btn--ghost cx-btn--lg">Text {PHONE}</a>
            </p>
          </div>
        </section>
      </Shell>
    );
  }

  const photo = PHOTO[m.category];
  return (
    <Shell kick="Booked" title={m.mode === "balance" ? "You're all paid up." : first ? `You're booked, ${first}.` : "You're booked."}>
      <PurchasePing sessionId={sessionId} value={amountTotal / 100} category={m.category} packageId={m.package} />
      <section className="cx-section cx-section--tight">
        <div className={`cx-wrap qt-booked-cols${photo ? "" : " qt-booked-cols--solo"}`}>
          <div className="qt-booked-main">
            <div className="qt-receipt">
              <p className="cx-kick">Your booking</p>
              <p className="qt-receipt-what"><strong>{q ? bookingLabel(q) : m.package}</strong>{m.date ? ` · ${m.date}` : ""}{m.where ? ` · ${m.where}` : ""}</p>
              {m.mode === "balance" ? (
                <p className="qt-receipt-line">Balance received — <strong>{paidAmt}</strong>. You&apos;re paid in full. Thank you!</p>
              ) : q?.mode === "retainer" ? (
                <p className="qt-receipt-line">Your <strong>{paidAmt}</strong> retainer holds the date. The balance — {money(Math.max(0, q.total - amountTotal / 100))} — is due 14 days before, and I&apos;ll send a link for it. Retainers are non-refundable; one free reschedule with 30 days&apos; notice.</p>
              ) : (
                <p className="qt-receipt-line">Paid in full — <strong>{paidAmt}</strong>. Nothing else to do on your end.</p>
              )}
            </div>

            <div className="qt-next">
              <h2 className="cx-h2 qt-q">What happens next</h2>
              <ol className="cx-steps">
                <li><span>Stripe emailed you a receipt, and a confirmation from me is on its way.</span></li>
                <li><span>I reach out within 24 hours — usually much faster — to lock in the plan: timeline, must-have moments, where to park.</span></li>
                <li><span>Sneak peeks land within 48 hours of the shoot; the full delivery follows on the schedule in the <a href="/terms" className="qt-inline">terms</a>.</span></li>
              </ol>
              <p className="cx-lede">Want to talk it through sooner? <a href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a 15-minute call</a> or text 845-549-4425.</p>
            </div>

            {refCode && (() => { const pitch = referralPitch(m.category); const link = referralLink(refCode, m.category); return (
              <div className="qt-refer">
                <p className="cx-kick">{pitch.kick}</p>
                <h2 className="cx-h2 qt-q">{pitch.title}</h2>
                <p className="cx-lede">{pitch.body}</p>
                <p className="cx-cta-row">
                  <a className="cx-btn cx-btn--light cx-btn--lg" href={`sms:?&body=${encodeURIComponent(pitch.text(refCode))}`}>{pitch.button}</a>
                  <a className="cx-btn cx-btn--ghost cx-btn--lg" href={link}>{link.replace(/^https:\/\//, "")}</a>
                </p>
                <p className="cx-fine">Your link does it all — when they open it, the {money(REFERRAL_AMOUNT)} is already on. If they'd rather type something, your code is <span className="cx-num">{refCode}</span>.</p>
                <p className="cx-fine">Give {money(REFERRAL_AMOUNT)}, get {money(REFERRAL_AMOUNT)}. Works on weddings and business packages; the $100 lands once their booking is paid.</p>
              </div>
            ); })()}
          </div>
          {photo && (
            <figure className="cx-frame qt-booked-photo">
              <img src={photo.src} alt={photo.alt} loading="lazy" style={{ objectPosition: photo.pos }} />
            </figure>
          )}
        </div>
      </section>
    </Shell>
  );
}
