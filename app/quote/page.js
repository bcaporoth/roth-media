import "../theme/quote.css";
import SiteNav from "../../components/SiteNav";
import SiteFooter from "../../components/SiteFooter";
import { stripeConfigured } from "../../lib/stripe";
import QuoteFlow from "../../components/QuoteFlow";

export const metadata = {
  title: "Get an Instant Quote",
  description:
    "Answer a few questions and get matched to the right photography or videography package instantly — real prices, no obligation.",
};

// The photo behind the title follows what they came for.
const HERO = {
  wedding: { src: "/photos/25-wedding-the-veil-took-flight.jpg", alt: "A bride's veil lifting in the wind as the couple hold each other in a field at dusk", pos: "60% 26%" },
  business: { src: "/photos/41-gym-mid-set-laughter.jpg", alt: "A lifter laughing mid-set at the squat rack, black and white", pos: "50% 40%" },
  family: { src: "/photos/04-senior-portrait-golden-hour.jpg", alt: "A senior portrait — a young woman sitting on steel steps holding a volleyball, backlit by the evening sun", pos: "50% 24%" },
  "": { src: "/photos/10-wedding-before-the-guests.jpg", alt: "A barn reception set before the guests arrive, strings of lights overhead, in black and white", pos: "50% 45%" },
};

export default async function QuotePage({ searchParams }) {
  const params = await searchParams;
  // ?for=portraits (and the old ?for=family) → the portrait session.
  const want = params?.for === "portraits" ? "family" : params?.for;
  const category = ["wedding", "business", "family"].includes(want) ? want : "";
  const code = String(params?.code || params?.ref || "").trim().toUpperCase().slice(0, 30);
  const pkg = String(params?.pkg || "").replace(/[^a-z0-9-]/gi, "").slice(0, 30);
  const date = String(params?.date || "").replace(/[^\w ,.\/-]/g, "").trim().slice(0, 40);
  const hero = HERO[category];

  return (
    <>
      <SiteNav active="quote" cta={null} overHero />

      <main className="cx-page cx-page--hero qt-page">
        <header className="cx-hero qt-hero">
          <div className="cx-hero-media">
            <img src={hero.src} alt={hero.alt} fetchPriority="high" style={{ objectPosition: hero.pos }} />
          </div>
          <div className="cx-hero-shade" />
          <div className="cx-wrap cx-hero-body">
            <p className="cx-kick">Instant quote</p>
            <h1 className="cx-h1 cx-h1--long">Build your quote in two minutes.</h1>
            <p className="cx-lede">
              Pick what you need and I&apos;ll walk you to a tailored starting
              price, step by step. Real prices, no obligation.
            </p>
            <p className="qt-rely">&ldquo;He made us so comfortable.&rdquo; &mdash; Kaitlyn, Google review</p>
          </div>
        </header>

        <section className="qt-stage">
          <div className="cx-wrap">
            <QuoteFlow cinema initialCategory={category} checkout={stripeConfigured} code={code} initialPkg={pkg} initialDate={date} />
          </div>
        </section>
      </main>

      <SiteFooter slim />
    </>
  );
}
