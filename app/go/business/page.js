import "../../theme/business.css";
import AdLeadForm from "../../../components/AdLeadForm";
import DealPrice from "../../../components/DealPrice";
import { PACKAGES } from "../../../lib/packages";
import { videoUrl } from "../../../lib/media";

export const metadata = { title: { absolute: "A month of posts, shot at your place — Roth Media" }, description: "One shoot at your business: a promo, reels, and photos, delivered in two weeks ready to post. Twin Tiers. Real prices, quote in your inbox instantly.", robots: { index: false } };
export const revalidate = 3600;

// Where business ads land. One job: get the quote into their inbox and a
// call on the calendar before they close the tab. Pick plan → name, phone,
// business, email → send. ?pkg=mini|day|always pre-selects the plan.
export default function BusinessAdPage() {
  const day = PACKAGES.business.find((p) => p.id === "day");
  const mini = PACKAGES.business.find((p) => p.id === "mini");
  const always = PACKAGES.business.find((p) => p.id === "always");
  const plans = [mini, day, { ...always, per: "/mo" }].map(({ id, name, price, scope, popular, per }) => ({ id, name, price, scope, popular, per }));
  return (
    <main className="cx-page cx-page--hero bz-page bz-go">
      <div className="bz-go-grid">
        <div className="bz-go-pitch">
          <p className="cx-kick bz-go-brand">Roth Media · Twin Tiers · local business content</p>
          <h1 className="cx-h1 cx-h1--long">Stop posting nothing. <br />One shoot, a month of posts.</h1>
          <p className="cx-lede">I come to your place for two hours. You get the reels, photos, and the three pinned posts that turn your Instagram into a front door — delivered in two weeks, sized to post. You never touch a camera.</p>
          <a href="#plan" className="cx-btn cx-btn--light cx-btn--lg cx-btn--block bz-go-jump">Get my quote — 60 seconds</a>
          <video className="bz-go-video" src={videoUrl("/reels/nicole-golden-zumba-promo.mp4")} poster="/reels/nicole-golden-zumba-promo-poster.jpg" autoPlay muted loop playsInline />
          <ul className="bz-go-why">
            <li><strong>Two posts a week, done.</strong> 8 vertical reels + 10–30 photos — a month of content from one morning, no scramble on a Tuesday night.</li>
            <li><strong>Your profile sells for you.</strong> The Pinned Three: who you are &amp; where to find you · why people trust you · how to book or stop in. The first thing every new customer sees.</li>
            <li><strong>Real people, your place.</strong> Your team, your regulars, your work — not stock footage. That&apos;s what makes someone in Sayre pick you over the chain.</li>
            <li><strong>Cleared for ads.</strong> Licensed music, yours to run on Facebook and Instagram. Want me to run them? Ask on the call.</li>
          </ul>
          <ul className="cx-rows bz-go-prices">
            <li className="cx-row"><span className="cx-row-name">{mini.name}</span><span className="cx-row-note">2-hr shoot · 8 reels + Pinned Three + 10–20 photos</span><strong className="cx-row-price"><DealPrice price={mini.price} category="business" packageId={mini.id} /></strong></li>
            <li className="cx-row"><span className="cx-row-name">{day.name}</span><span className="cx-row-note">half day · + a 45–90s promo video · 15–30 photos</span><strong className="cx-row-price"><DealPrice price={day.price} category="business" packageId={day.id} /></strong></li>
            <li className="cx-row"><span className="cx-row-name">{always.name}</span><span className="cx-row-note">The Month, every month · pause or cancel anytime</span><strong className="cx-row-price"><DealPrice price={always.price} category="business" packageId={always.id} />/mo</strong></li>
          </ul>
          <p className="cx-fine bz-go-proof">★★★★★ 5.0 on Google · delivered within 2 weeks · no contracts, pay when we lock the date</p>
        </div>
        <div className="bz-go-form cx-panel" id="plan">
          <p className="cx-kick">Your quote, instantly</p>
          <h2 className="bz-go-form-title">Pick a plan. Four fields. Done.</h2>
          <p className="bz-go-form-sub">Your price, exactly what you get, and a link to book a 15-minute call hit your inbox the moment you send. I text you the same day.</p>
          <AdLeadForm category="business" label="business" cta="Send me my quote" emailRequired plans={plans} extra={{ label: "Business name", placeholder: "Your shop, gym, or restaurant" }} />
        </div>
      </div>
      <a href="#plan" className="bz-go-sticky">Get my quote <span>→ 60 seconds</span></a>
    </main>
  );
}
