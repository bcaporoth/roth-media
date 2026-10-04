import Link from "next/link";
import "./theme/misc.css";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import { PACKAGES, money } from "../lib/packages";

export const metadata = { title: "Page not found" };

const wedFrom = Math.min(...PACKAGES.wedding.map((p) => p.price));
const bizFrom = Math.min(...PACKAGES.business.map((p) => p.price));

function Arrow() {
  return (
    <svg className="mx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The Cinema 404 — any URL that doesn't exist (and any page that calls notFound()).
export default function NotFound() {
  return (
    <>
      <SiteNav overHero />
      <main className="cx-page cx-page--hero mx-page mx-404">
        <header className="cx-hero cx-hero--short mx-404-hero">
          <div className="cx-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/24-wedding-a-world-of-their-own.jpg" alt="A bride and groom, small in the distance, alone in a wide open field" />
          </div>
          <div className="cx-hero-shade" />
          <div className="cx-wrap cx-wrap--mid cx-hero-body">
            <p className="cx-kick">404 · Page not found</p>
            <h1 className="cx-h1">That page isn’t here.</h1>
            <p className="cx-lede">The link may be old or mistyped. Here’s where to go next.</p>
          </div>
        </header>
        <section className="mx-404-doors">
          <div className="cx-wrap cx-wrap--mid">
            <ul className="mx-doors">
              <li><Link href="/"><strong>Home</strong><span>Films &amp; photographs, start to finish</span><Arrow /></Link></li>
              <li><Link href="/weddings"><strong>Weddings</strong><span><b>from {money(wedFrom)}</b></span><Arrow /></Link></li>
              <li><Link href="/business"><strong>Business</strong><span><b>from {money(bizFrom)}</b></span><Arrow /></Link></li>
              <li><Link href="/quote"><strong>Get a quote</strong><span>Real prices in about a minute</span><Arrow /></Link></li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter slim />
    </>
  );
}
