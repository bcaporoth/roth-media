"use client";

// The client Shop (/portal/shop): pick a category, a package and extras; the
// cart on the side keeps the total and saves itself. "Review & pay" opens the
// normal /pay/cart page (it re-prices everything and applies deals, the
// wedding retainer and friend codes). Already booked and just want extras?
// "Send these to Brandon" lands in his Inbox. "Ask Brandon" sends a question.

import { useEffect, useRef, useState } from "react";
import { PACKAGES, money } from "../lib/packages";
import { cartUrl } from "../lib/cart";
import { SHOP_LABEL, cleanCart, shopAddons, cartTotals } from "../lib/shop";

const priceText = (a) => (a.price === 0 ? `Free${a.was ? ` (was ${money(a.was)})` : ""}` : `${money(a.price)}${a.monthly ? ` + ${money(a.monthly)}/mo` : ""}`);

async function api(payload) {
  const res = await fetch("/api/portal/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "That didn't go through");
  return j;
}

export default function ShopBoard({ categories, initial, name = "", email = "", phone = "" }) {
  const [cart, setCart] = useState(() => cleanCart(initial));
  const [cat, setCat] = useState(initial.category || categories[0]);
  const [saved, setSaved] = useState("");
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const first = useRef(true);

  // Save the cart a moment after each change (Brandon sees it in Studio).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaved("Saving…");
    const t = setTimeout(() => { api({ action: "save", cart }).then(() => setSaved("Saved")).catch(() => setSaved("")); }, 600);
    return () => clearTimeout(t);
  }, [cart]);

  const pkgs = PACKAGES[cat] || [];
  const inCat = cart.category === cat;
  const pkg = inCat ? pkgs.find((p) => p.id === cart.packageId) || null : null;
  const extras = shopAddons(cat, pkg);
  const { pkg: cartPkg, list, once, monthly } = cartTotals(cart);
  const empty = !cartPkg && !list.length;

  // Switching category starts that category's cart fresh (a cart is one kind of shoot).
  const pickPkg = (id) => setCart((c) => cleanCart({ category: cat, packageId: c.category === cat && c.packageId === id ? "" : id, addons: c.category === cat ? c.addons : [] }));
  const toggle = (id) => setCart((c) => {
    const base = c.category === cat ? c : { category: cat, packageId: "", addons: [] };
    return cleanCart({ ...base, addons: base.addons.includes(id) ? base.addons.filter((x) => x !== id) : [...base.addons, id] });
  });
  const remove = (id) => setCart((c) => cleanCart({ ...c, addons: c.addons.filter((x) => x !== id) }));
  const clearPkg = () => setCart((c) => cleanCart({ ...c, packageId: "" }));

  async function send(kind) {
    setBusy(true); setMsg("");
    try {
      await api({ action: "ask", kind, cart, note });
      setMsg(kind === "addons" ? "Sent. Brandon will add these to your booking and send you a way to pay." : "Sent. Brandon got your question and will get back to you.");
      setNote(""); setAsking(false);
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  const payHref = cartPkg ? cartUrl({ category: cart.category, packageId: cart.packageId, addons: cart.addons, name, email, phone }).replace("https://rothmediaco.com", "") : "";

  return (
    <div className="shop">
      <div className="shop-main">
        <div className="cx-pills shop-cats" role="tablist" aria-label="What kind of shoot">
          {categories.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={cat === c} className={"cx-pill" + (cat === c ? " is-on" : "")} onClick={() => setCat(c)}>{SHOP_LABEL[c]}</button>
          ))}
        </div>

        <h2 className="cx-kick shop-h">Packages</h2>
        <ul className="shop-grid">
          {pkgs.map((p) => {
            const on = pkg?.id === p.id;
            return (
              <li key={p.id}>
                <button type="button" className={"shop-card" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => pickPkg(p.id)}>
                  <span className="shop-top"><strong>{p.name}</strong><span className="shop-price">{money(p.price)}</span></span>
                  <span className="shop-scope">{p.scope}</span>
                  <ul className="shop-gets">{p.get.slice(0, 3).map((g) => <li key={g}>{g}</li>)}</ul>
                  <span className="shop-tick">{on ? "✓ In your cart" : "+ Add to cart"}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {extras.length > 0 && (
          <>
            <h2 className="cx-kick shop-h">Extras</h2>
            <p className="pt-note shop-note">{pkg ? `What you can add to ${pkg.name}.` : "Add them to a package, or on their own if you're already booked."}</p>
            <ul className="shop-grid shop-grid--small">
              {extras.map((a) => {
                const on = inCat && cart.addons.includes(a.id);
                return (
                  <li key={a.id}>
                    <button type="button" className={"shop-card" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => toggle(a.id)}>
                      <span className="shop-top"><strong>{a.name}</strong><span className="shop-price">{priceText(a)}</span></span>
                      <span className="shop-scope">{a.get}</span>
                      <span className="shop-tick">{on ? "✓ In your cart" : "+ Add"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Phones: the cart sits under the cards, so a bar keeps the total in view. */}
      {!empty && <a className="shop-peek" href="#shop-cart">Your cart · <strong>{money(once)}{monthly ? ` + ${money(monthly)}/mo` : ""}</strong> <span aria-hidden="true">↓</span></a>}

      <aside className="shop-cart" id="shop-cart" aria-label="Your cart">
        <div className="shop-cart-head">
          <h2 className="cx-kick">Your cart</h2>
          {saved && <span className="shop-saved" role="status">{saved}</span>}
        </div>
        {empty ? (
          <p className="pt-note">Nothing in it yet. Tap a package or an extra to add it.</p>
        ) : (
          <>
            <p className="shop-cart-cat">{SHOP_LABEL[cart.category]}</p>
            <ul className="shop-lines">
              {cartPkg && <li><span>{cartPkg.name}</span><span>{money(cartPkg.price)}</span><button type="button" className="shop-x" aria-label={`Remove ${cartPkg.name}`} onClick={clearPkg}>×</button></li>}
              {list.map((a) => <li key={a.id}><span>{a.name}</span><span>{priceText(a)}</span><button type="button" className="shop-x" aria-label={`Remove ${a.name}`} onClick={() => remove(a.id)}>×</button></li>)}
            </ul>
            <p className="shop-total"><span>Total</span><strong>{money(once)}{monthly ? ` + ${money(monthly)}/mo` : ""}</strong></p>
            <p className="shop-fine">{cart.category === "wedding" ? "Weddings start with a 50% retainer; the rest is due later. " : ""}Deals and friend codes are applied on the next page.</p>
          </>
        )}

        <div className="shop-acts">
          {cartPkg ? (
            <a className="cx-btn cx-btn--light cx-btn--block" href={payHref}>Review &amp; pay →</a>
          ) : list.length > 0 ? (
            <>
              <button type="button" className="cx-btn cx-btn--light cx-btn--block" disabled={busy} onClick={() => send("addons")}>{busy ? "Sending…" : "Send these to Brandon"}</button>
              <p className="shop-fine">Already booked? Brandon adds these to your booking and sends you a way to pay. Booking something new? Add a package above.</p>
            </>
          ) : null}
          <button type="button" className="cx-btn cx-btn--ghost cx-btn--block" aria-expanded={asking} onClick={() => setAsking((v) => !v)}>{asking ? "Never mind" : "Ask Brandon about this"}</button>
          {asking && (
            <div className="shop-ask">
              <textarea className="cx-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything: a question about a package, a custom idea, a different date…" spellCheck autoCorrect="on" autoCapitalize="sentences" />
              <button type="button" className="cx-btn cx-btn--light" disabled={busy || !note.trim()} onClick={() => send("question")}>{busy ? "Sending…" : "Send"}</button>
            </div>
          )}
          <a className="cx-link shop-date" href="/portal#calendar">Pick a date on your calendar →</a>
          {msg && <p className="shop-msg" role="status">{msg}</p>}
        </div>
      </aside>
    </div>
  );
}
