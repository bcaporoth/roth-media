"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import BrandMark from "./BrandMark";
import { PHONE } from "../lib/site";
import { PACKAGES, money } from "../lib/packages";

// The Cinema site header — the same plate the homepage wears, for every other page.
//
//   <SiteNav active="weddings" />                 solid plate (default)
//   <SiteNav active="business" overHero />        see-through while the page is at the top
//                                                 (use only when the first block is a .cx-hero photo)
//   <SiteNav cta={{ href: "/quote?for=wedding", label: "Build my quote" }} />
//   <SiteNav cta={null} />                        no button (e.g. on the quote page itself)
//
// active: "weddings" | "business" | "portraits" | "quote" | "portal" | ""
// It is position: fixed and var(--nav-h) tall: wrap the page in .cx-page (adds the top padding),
// or .cx-page.cx-page--hero when a .cx-hero runs underneath it.
// Works with no JS: the plate is solid, the phone menu is a <details>.

const PHONE_HREF = "tel:+18455494425";
const SMS_HREF = "sms:+18455494425";
const wedFrom = Math.min(...PACKAGES.wedding.map((p) => p.price));
const bizFrom = Math.min(...PACKAGES.business.map((p) => p.price));
const portraitFrom = PACKAGES.family[0].price;

export default function SiteNav({ active = "", overHero = false, cta = { href: "/quote", label: "Get a quote" } }) {
  const ref = useRef(null);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const menu = nav.querySelector(".cx-menu");
    const onScroll = () => nav.classList.toggle("is-top", window.scrollY < 24);
    const close = () => menu && menu.removeAttribute("open");
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const onClick = (e) => {
      if (!menu || !menu.hasAttribute("open")) return;
      // a link inside the panel, or a tap anywhere outside the header, closes the menu
      if (e.target.closest(".cx-menu-panel a") || !nav.contains(e.target)) close();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const cur = (key) => (active === key ? "page" : undefined);

  return (
    <header ref={ref} className={"cx-nav" + (overHero ? " cx-nav--over" : "")}>
      <Link href="/" className="cx-brand" aria-label="Roth Media — home">
        <BrandMark />
        <span>Roth Media</span>
      </Link>
      <nav className="cx-nav-links" aria-label="Main navigation">
        <Link href="/weddings" aria-current={cur("weddings")}>Weddings</Link>
        <Link href="/business" aria-current={cur("business")}>Business</Link>
        <Link href="/#families" aria-current={cur("portraits")}>Portraits</Link>
        <a href={PHONE_HREF} className="cx-nav-phone">{PHONE}</a>
        <Link href="/portal" className="cx-nav-login" aria-current={cur("portal")}>Client login</Link>
      </nav>
      {cta && <Link href={cta.href} className="cx-btn cx-btn--light cx-btn--sm cx-nav-quote">{cta.label}</Link>}
      <details className="cx-menu">
        <summary aria-label="Menu"><span aria-hidden="true" /><span aria-hidden="true" /></summary>
        <nav className="cx-menu-panel" aria-label="Menu">
          <Link href="/weddings" aria-current={cur("weddings")}>Weddings <em>from {money(wedFrom)}</em></Link>
          <Link href="/business" aria-current={cur("business")}>Business <em>from {money(bizFrom)}</em></Link>
          <Link href="/#families" aria-current={cur("portraits")}>Family &amp; portraits <em>from {money(portraitFrom)}</em></Link>
          <Link href="/#date">Check a wedding date <em>open Saturdays</em></Link>
          <Link href="/quote" aria-current={cur("quote")}>Get a quote <em>2 minutes</em></Link>
          <a href={SMS_HREF}>Text Brandon <em>{PHONE}</em></a>
          <a href={PHONE_HREF}>Call <em>{PHONE}</em></a>
          <Link href="/portal" className="cx-menu-login" aria-current={cur("portal")}>Client login</Link>
        </nav>
      </details>
    </header>
  );
}
