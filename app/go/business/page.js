import "../../theme/business.css";
import "../../theme/quote.css";
import BusinessAsk from "../../../components/BusinessAsk";
import { videoUrl } from "../../../lib/media";

export const metadata = { title: { absolute: "A month of posts, shot at your place — Roth Media" }, description: "One shoot at your business: reels and photos aimed at what you're promoting, delivered in two weeks ready to post. Twin Tiers. Tell me what you need and get a quote with three options.", robots: { index: false } };
export const revalidate = 3600;

// Where business ads land. Quote-first since 2026-11-15: no package prices,
// the same four questions as /quote?for=business, straight to the Inbox.
export default function BusinessAdPage() {
  return (
    <main className="cx-page cx-page--hero bz-page bz-go">
      <div className="bz-go-grid">
        <div className="bz-go-pitch">
          <p className="cx-kick bz-go-brand">Roth Media · Twin Tiers · content that converts</p>
          <h1 className="cx-h1 cx-h1--long">Stop posting nothing. <br />One shoot, a month of posts.</h1>
          <p className="cx-lede">I come to your place and film. You get videos and photos built around what you&apos;re promoting — delivered in two weeks, sized to post. You never touch a camera.</p>
          <p className="bz-go-converts"><strong>A reel gets a scroll. This gets them through the door.</strong> Every piece is built to answer the one question a new customer has before they walk in: <em>is this place for me?</em> That&apos;s content that converts — not content that fills a feed.</p>
          <a href="#plan" className="cx-btn cx-btn--light cx-btn--lg cx-btn--block bz-go-jump">Get my quote — 60 seconds</a>
          <div className="bz-go-adwrap">
            <video className="bz-go-video bz-go-video--ad" src="/reels/roth-ad.mp4" poster="/reels/roth-ad-poster.jpg" autoPlay muted loop playsInline controls preload="metadata" aria-label="Brandon, 30 seconds: one shoot, a month of posts" />
            <video className="bz-go-video bz-go-video--work" src={videoUrl("/reels/nicole-golden-zumba-promo.mp4")} poster="/reels/nicole-golden-zumba-promo-poster.jpg" autoPlay muted loop playsInline aria-label="A promo shot for a local gym" />
          </div>
          <ul className="bz-go-why">
            <li><strong>Reels with a job.</strong> Every reel is aimed at what you&apos;re promoting, plus photos. You pick how many in your quote. No scramble on a Tuesday night.</li>
            <li><strong>Your profile sells for you.</strong> The Pinned Three: who you are &amp; where to find you · why people trust you · how to book or stop in. The first thing every new customer sees.</li>
            <li><strong>Real people, your place.</strong> Your team, your regulars, your work — not stock footage. That&apos;s what makes someone in Sayre pick you over the chain.</li>
            <li><strong>Give $100, get $100.</strong> Once you&apos;re booked you get a link to hand to the business next door — $100 off their first shoot, $100 back to you. Every owner you send.</li>
            <li><strong>Cleared for ads.</strong> Licensed music, yours to run on Facebook and Instagram. Want me to run them? Ask on the call.</li>
          </ul>
          <p className="cx-fine bz-go-proof">★★★★★ 5.0 on Google · delivered within 2 weeks · one payment, paid in full when you book</p>
        </div>
        <div className="bz-go-form cx-panel" id="plan">
          <p className="cx-kick">Content that converts · your quote</p>
          <h2 className="bz-go-form-title">Four quick questions.</h2>
          <p className="bz-go-form-sub">Tell me what you need. I&apos;ll send you a quote with three options to pick from.</p>
          <BusinessAsk />
        </div>
      </div>
      <a href="#plan" className="bz-go-sticky">Get my quote <span>→ 60 seconds</span></a>
    </main>
  );
}
