import Link from "next/link";
import QuoteForm from "../../components/QuoteForm";

export const metadata = {
  title: "Get an Instant Quote",
  description:
    "Answer a few questions and get matched to the right photography or videography package instantly — real prices, no obligation.",
};

const PHONE = "845-549-4425";
const PHONE_HREF = "tel:+18455494425";

export default async function QuotePage({ searchParams }) {
  const params = await searchParams;
  const service = ["photography", "videography", "both"].includes(
    params?.service
  )
    ? params.service
    : "";

  return (
    <>
      <nav className="rm-nav portal-nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          Roth <em>Media</em>
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/video">Video</Link>
          </li>
          <li>
            <Link href="/photo">Photo</Link>
          </li>
          <li>
            <a href={PHONE_HREF}>{PHONE}</a>
          </li>
        </ul>
      </nav>

      <main className="quote-wrap">
        <div className="kick">Instant quote</div>
        <h1>Find your package in two minutes.</h1>
        <p className="lead">
          Answer a few questions and this form matches you to the package
          people in your shoes actually book — live, as you click. Real
          prices, no obligation.
        </p>
        <QuoteForm initialService={service} />
      </main>

      <footer className="rm-footer">
        <div className="foot-inner">
          <div className="brand">
            Roth <em>Media</em>
          </div>
          <a href={PHONE_HREF}>{PHONE}</a>
          <span>© {new Date().getFullYear()} Roth Media</span>
        </div>
      </footer>
    </>
  );
}
