// Homepage v2 — a preview of the scroll-driven redesign. Lives at /v2 so the
// real homepage is untouched until this is approved; not indexed.
import Link from "next/link";
import "./v2.css";
import BrandMark from "../../components/BrandMark";
import FilmCard from "../../components/FilmCard";
import QuoteFlow from "../../components/QuoteFlow";
import SocialLinks from "../../components/SocialLinks";
import V2Motion from "../../components/V2Motion";
import { EMAIL } from "../../lib/site";
import { stripeConfigured } from "../../lib/stripe";
import { videoUrl } from "../../lib/media";

export const metadata = {
  title: "Homepage preview",
  robots: { index: false, follow: false },
};

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

const WORK = [
  { src: "/photos/24-wedding-a-world-of-their-own.jpg", cap: "A world of their own", cat: "Weddings", wide: true },
  { src: "/photos/22-wedding-the-first-dance.jpg", cap: "The first dance", cat: "Weddings" },
  { src: "/photos/40-wedding-just-married-mid-laugh.jpg", cap: "Just married, mid laugh", cat: "Weddings", wide: true },
  { src: "/photos/06-engagement-she-said-yes.jpg", cap: "She said yes", cat: "Engagements" },
  { src: "/photos/25-wedding-the-veil-took-flight.jpg", cap: "The veil took flight", cat: "Weddings", wide: true },
  { src: "/photos/04-senior-portrait-golden-hour.jpg", cap: "Golden hour", cat: "Seniors" },
  { src: "/photos/01-gym-athlete-chalk-and-focus.jpg", cap: "Chalk and focus", cat: "Fitness" },
  { src: "/photos/33-event-the-finish-line-hug.jpg", cap: "The finish line hug", cat: "Events" },
];

const TOWNS = ["Waverly", "Elmira", "Corning", "Sayre", "Athens"];

export default function HomeV2() {
  return (
    <div className="v2">
      <V2Motion />

      <nav className="v2-nav" aria-label="Main navigation">
        <Link href="/" className="v2-brand">
          <span className="brand-chip"><BrandMark /></span>
          <span>Roth Media</span>
        </Link>
        <div className="v2-nav-links">
          <a href="#work">Work</a>
          <a href="#films">Films</a>
          <Link href="/weddings">Weddings</Link>
          <Link href="/business">For business</Link>
          <a href={PHONE_HREF} className="v2-nav-phone">{PHONE}</a>
          <Link href="/portal" className="v2-nav-login">Client login</Link>
          <a href="#quote" className="v2-pill v2-pill--light">Get a quote</a>
        </div>
      </nav>

      <main>
        {/* ── Hero: the ceremony loop, headline rises in, video settles as you scroll ── */}
        <header className="v2-hero">
          <div className="v2-hero-media">
            <video
              src={videoUrl("/matt-april-loop.mp4")}
              poster="/matt-april-cover.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          </div>
          <div className="v2-hero-shade" aria-hidden="true" />
          <div className="v2-hero-inner">
            <p className="v2-kick v2-kick--gold v2-hero-fade">Photo · Video · Story</p>
            <h1 className="v2-hero-title">
              <span className="v2-line"><span>One place</span></span>
              <span className="v2-line"><span>for the whole</span></span>
              <span className="v2-line"><span>story.</span></span>
            </h1>
            <div className="v2-hero-row v2-hero-fade">
              <p>
                Candid photography and cinematic films for weddings, seniors,
                brands, events, and the people you love.
              </p>
              <div className="v2-cta">
                <a href="#quote" className="v2-pill v2-pill--light v2-pill--lg">Get my instant quote →</a>
                <a href="#work" className="v2-pill v2-pill--ghost v2-pill--lg">See the work</a>
              </div>
            </div>
            <ul className="v2-towns v2-hero-fade" aria-label="Towns served">
              {TOWNS.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </header>

        {/* ── Statement: words light up as you scroll through them ── */}
        <section className="v2-statement">
          <p className="v2-kick">One studio, two crafts</p>
          <p className="v2-statement-text" data-v2-words>
            Video when the moment moves, photo when it should stand still.
            Serving the Twin Tiers from Waverly to Corning.
          </p>
        </section>

        {/* ── Work: pinned, scrolls sideways on desktop; swipe on phones ── */}
        <section id="work" className="v2-work">
          <div className="v2-work-pin">
            <div className="v2-work-head">
              <h2 className="v2-h2">Selected work</h2>
              <p>Weddings · Engagements · Seniors · Fitness · Events</p>
            </div>
            <div className="v2-track">
              {WORK.map((p) => (
                <figure key={p.src} className={p.wide ? "v2-shot v2-shot--wide" : "v2-shot"}>
                  <div className="v2-shot-frame">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.src} alt={p.cap} loading="lazy" />
                  </div>
                  <figcaption><strong>{p.cap}</strong><span>{p.cat}</span></figcaption>
                </figure>
              ))}
              <a href="#quote" className="v2-track-end">
                <span>Yours next?</span>
                <strong>Build your quote →</strong>
              </a>
            </div>
          </div>
        </section>

        {/* ── Films: the feature film grows to full width as it arrives ── */}
        <section id="films" className="v2-films">
          <div className="v2-films-head">
            <div>
              <p className="v2-kick v2-kick--gold v2-rise">Video work</p>
              <h2 className="v2-h2 v2-h2--xl v2-rise">Made to be watched.</h2>
            </div>
            <p className="v2-rise">
              Tap to play, sound on. Ceremony-first wedding films, delivered
              the same night as a sneak peek.
            </p>
          </div>

          <div className="v2-feature">
            <FilmCard
              feature
              src={videoUrl("/matt-april-wedding.mp4")}
              poster="/matt-april-wedding-poster.jpg"
              title="Matt & April"
              sub="Wedding sneak peek · September 2026"
            />
          </div>

          <div className="v2-biz-head v2-rise">
            <strong>For business</strong>
            <span>Promos and reels cut for the feed. One shoot, a month of posts.</span>
          </div>
          <div className="fc-bento v2-rise">
            <FilmCard
              src={videoUrl("/reels/nicole-golden-zumba-promo.mp4")}
              poster="/reels/nicole-golden-zumba-promo-poster.jpg"
              title="Nicole Golden"
              sub="Zumba class promo"
            />
            <FilmCard
              src={videoUrl("/reels/womens-powerlifting-club.mp4")}
              poster="/reels/womens-powerlifting-club-poster.jpg"
              title="Women’s Powerlifting Club"
              sub="Gym promo"
            />
            <FilmCard
              vertical
              src={videoUrl("/reels/bake-against-the-grain.mp4")}
              poster="/reels/bake-against-the-grain-poster.jpg"
              title="Bake Against the Grain"
              sub="Brand film · vertical for Instagram & TikTok"
            />
          </div>
        </section>

        {/* ── The business offer, pulled out of the About copy ── */}
        <section className="v2-offer">
          <div>
            <p className="v2-kick v2-rise">For local businesses</p>
            <h2 className="v2-h2 v2-rise">
              A promo, reels, and photos — shot at your place in one day.
            </h2>
          </div>
          <div className="v2-offer-side v2-rise">
            <p>Your people and your work, not stock footage. Delivered within two weeks.</p>
            <Link href="/business" className="v2-pill v2-pill--dark v2-pill--lg">See how it works →</Link>
          </div>
        </section>

        {/* ── Quote: the existing guided quote, unchanged ── */}
        <section className="v2-quote">
          <div className="v2-quote-head">
            <div>
              <p className="v2-kick v2-rise">Real prices, up front</p>
              <h2 className="v2-h2 v2-h2--xl v2-rise">Build your quote.</h2>
            </div>
            <p className="v2-rise">
              Pick what you’re here for and I’ll walk you to a tailored
              starting price, step by step. Prefer to talk? Call or text{" "}
              <a href={PHONE_HREF}>{PHONE}</a>.
            </p>
          </div>
          <div id="quote" className="pricing v2-quote-flow">
            <QuoteFlow checkout={stripeConfigured} />
          </div>
        </section>

        {/* ── About ── */}
        <section id="about" className="v2-about">
          <div className="v2-about-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/about-brandon.png" alt="Brandon Roth" loading="lazy" />
          </div>
          <div className="v2-about-text">
            <p className="v2-kick v2-rise">Behind the camera</p>
            <h2 className="v2-h2 v2-rise">Hi, I’m <em>Brandon.</em></h2>
            <p className="v2-rise">
              I’m all about candid work that feels real. The good moments
              usually happen in the flow — when you’re laughing, moving,
              working, or forgetting the camera is even there.
            </p>
            <p className="v2-rise">
              I’ll guide you when you need it, but I don’t do stiff, rigid
              posing. We keep it easy and relaxed.
            </p>
            <p className="v2-rise">I’m local to the Valley, and I’d love to work with you.</p>
            <p className="v2-sig v2-rise">— Brandon Roth</p>
          </div>
        </section>
      </main>

      <footer className="v2-footer">
        <div className="v2-footer-top">
          <p className="v2-footer-big" data-v2-slide>Let’s tell yours.</p>
          <a href="#quote" className="v2-pill v2-pill--light v2-pill--lg">Get my instant quote →</a>
        </div>
        <div className="v2-footer-row">
          <span>Waverly, NY — serving the Twin Tiers</span>
          <a href={PHONE_HREF}>{PHONE}</a>
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <SocialLinks />
          <Link href="/portal">Client login</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </div>
  );
}
