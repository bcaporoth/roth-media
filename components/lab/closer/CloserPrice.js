"use client";

// The price, visible without a tap: packages with everything you get, add-ons
// with their prices, and a running total that counts to the new number.
// Renders complete on the server (first package selected) so it reads with JS off.

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { money } from "../../../lib/packages";
import { dealTotal } from "../../../lib/deals";

function useCountTo(value) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return;
    }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 520);
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round((start + (value - start) * e) / 10) * 10;
      from.current = v;
      setShown(k === 1 ? value : v);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

export default function CloserPrice({ aud, quoteFor, packages, addons, deal, cta, fine }) {
  const uid = useId();
  const first = packages.find((p) => p.popular) || packages[0];
  const [pkgId, setPkgId] = useState(first.id);
  const [picked, setPicked] = useState([]);
  const pkg = packages.find((p) => p.id === pkgId) || first;
  const chosen = addons.filter((a) => picked.includes(a.id));
  const items = [pkg, ...chosen];
  const total = items.reduce((s, i) => s + i.price, 0);
  const monthly = chosen.reduce((s, a) => s + (a.monthly || 0), 0);
  const shown = useCountTo(total);
  const withDeal = deal ? dealTotal(items, { pct: deal.pct }) : null;

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="clo-pb">
      <div className="clo-pb-main">
        <div className={`clo-pkgs clo-pkgs--${packages.length}`} role="radiogroup" aria-label="Package">
          {packages.map((p) => {
            const on = p.id === pkg.id;
            return (
              <label key={p.id} className={`clo-pkg clo-rise${on ? " is-on" : ""}`}>
                <input type="radio" name={`${uid}-pkg`} value={p.id} checked={on} onChange={() => setPkgId(p.id)} />
                <span className="clo-pkg-top">
                  <span className="clo-pkg-name">{p.name}</span>
                  {p.popular && <span className="clo-pkg-flag">Most booked</span>}
                </span>
                <span className="clo-pkg-price">{money(p.price)}</span>
                <span className="clo-pkg-scope">{p.scope}</span>
                <span className="clo-pkg-you">You get</span>
                <ul>
                  {p.get.map((g) => <li key={g}>{g}</li>)}
                </ul>
                {packages.length > 1 && <span className="clo-pkg-pick" aria-hidden="true">{on ? "In your quote" : "Choose this"}</span>}
              </label>
            );
          })}
        </div>

        <div className="clo-addons clo-rise">
          <p className="clo-addons-k">Add what fits — every add-on priced</p>
          {addons.map((a) => {
            const on = picked.includes(a.id);
            return (
              <label key={a.id} className={`clo-addon${on ? " is-on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(a.id)} />
                <span className="clo-check" aria-hidden="true" />
                <span className="clo-addon-text">
                  <strong>{a.name}</strong>
                  <span>{a.get}</span>
                </span>
                <span className="clo-addon-price">+{money(a.price)}{a.monthly ? <small> then {money(a.monthly)}/mo</small> : null}</span>
              </label>
            );
          })}
        </div>
      </div>

      <aside className="clo-receipt clo-rise" aria-live="polite">
        <p className="clo-receipt-k">Your number</p>
        <ul className="clo-receipt-lines">
          {items.map((i) => (
            <li key={i.id}><span>{i.name}</span><span>{money(i.price)}</span></li>
          ))}
        </ul>
        <p className="clo-receipt-total">
          <span>Starting at</span>
          <strong>{money(shown)}</strong>
        </p>
        {monthly > 0 && <p className="clo-receipt-note">Then {money(monthly)}/month for the website, starting 30 days out. Cancel anytime.</p>}
        {deal && withDeal !== null && withDeal < total && (
          <p className="clo-receipt-offer">
            Booked by {deal.endsLabel}: <strong>{money(withDeal)}</strong>. The launch offer is applied in your quote automatically.
          </p>
        )}
        <Link href={`/quote?for=${quoteFor}&pkg=${pkg.id}`} className="clo-btn clo-btn--acc clo-receipt-cta">
          {cta}
          <svg className="clo-arrow" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
        <p className="clo-receipt-fine">{fine} I confirm the exact number in writing before we shoot — no surprises.</p>
      </aside>
    </div>
  );
}
