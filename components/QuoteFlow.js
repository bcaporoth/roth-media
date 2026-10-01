"use client";

import { track } from "../lib/track";
import { submitLead } from "../lib/submit-lead";
import BookCall from "./BookCall";
import { useRef, useState } from "react";
import { CATEGORIES, PACKAGES, ADDONS, DETAIL, money } from "../lib/packages";

// ── Three screens. One way in, one way out. ─────────────────────────
// 1. What's it for  →  2. Pick a package (+ a couple of add-ons)  →
// 3. Your info + the quote.  Every number lives in lib/packages.js.


const STEPS = ["What it's for", "Your package", "Your info"];

// "Everything in Essential" is fine on a card; on the final quote we spell it out.
function fullGet(category, pkg) {
  const [first, ...rest] = pkg.get;
  const m = /^Everything in (.+)$/.exec(first);
  if (!m) return pkg.get;
  const base = PACKAGES[category].find((p) => p.name === m[1]);
  return base ? [...fullGet(category, base), ...rest] : pkg.get;
}

const RETAINER_RATE = 0.3; // weddings pay this today; matches /terms and lib/payments.js

export default function QuoteFlow({ initialCategory = "", checkout = false, promo = null }) {
  const formRef = useRef(null);
  const topRef = useRef(null);
  const valid = CATEGORIES.some((c) => c.id === initialCategory);
  const [step, setStep] = useState(valid ? 1 : 0);
  const [category, setCategory] = useState(valid ? initialCategory : "");
  const [pkgId, setPkgId] = useState(valid && PACKAGES[initialCategory].length === 1 ? PACKAGES[initialCategory][0].id : "");
  const [addons, setAddons] = useState({});
  const [contactPref, setContactPref] = useState("Text me");
  const [status, setStatus] = useState("idle");
  const [sent, setSent] = useState(null);
  const [bookError, setBookError] = useState("");

  const packages = category ? PACKAGES[category] : [];
  const pkg = packages.find((p) => p.id === pkgId) || null;
  const addonList = pkg ? ADDONS[category].filter((a) => !pkg.includes.includes(a.id)) : [];
  const chosen = addonList.filter((a) => addons[a.id]);
  const estimate = pkg ? pkg.price + chosen.reduce((s, a) => s + a.price, 0) : 0;
  const catTitle = CATEGORIES.find((c) => c.id === category)?.title || "";
  // Book-it-now: what they'd pay today. "from" add-ons (scoped on a call) can't be bought.
  const buyable = checkout && pkg && !chosen.some((a) => a.from);
  const retainer = category === "wedding";
  const dueToday = retainer ? Math.round(estimate * RETAINER_RATE) : estimate;
  // Campaign code from the landing page (?code=): show the math; Stripe applies it.
  const promoPct = promo && category === "wedding" ? promo.percent : 0;
  const discounted = promoPct ? Math.round(dueToday * (1 - promoPct / 100)) : dueToday;

  function jump(n) {
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function pickCategory(id) { markStarted(id); setCategory(id); setPkgId(PACKAGES[id].length === 1 ? PACKAGES[id][0].id : ""); setAddons({}); jump(1); }
  const startedRef = useRef(false);
  function markStarted(id) { if (!startedRef.current) { startedRef.current = true; track("quote_started", { category: id }); } }
  function pickPackage(id) { markStarted(category); setPkgId(id); setAddons({}); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (step !== 2) return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data._honey) return;
    setStatus("sending");
    const L = DETAIL[category];
    const rows = {
      _subject: `Quote — ${data.firstName} ${data.lastName} · ${catTitle} · ${pkg.name} (${money(estimate)}${pkg.per || ""})`,
      _template: "table",
      "what it's for": catTitle,
      package: `${pkg.name} — ${money(pkg.price)}${pkg.per || ""}`,
      "add-ons": chosen.length ? chosen.map((a) => `${a.name} (${money(a.price)})`).join("; ") : "none",
      "starting price": money(estimate) + (pkg.per || ""),
      "they get": [...fullGet(category, pkg), ...chosen.map((a) => a.get)].join(" · "),
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      "best way to reach": contactPref,
      [L.date.toLowerCase()]: data.date,
      [L.where.toLowerCase()]: data.where,
      "anything else": data.notes,
    };
    const { _subject, _template, ...fieldRows } = rows;
    try {
      await submitLead({
        kind: "quote",
        category,
        cart: { category, packageId: pkg.id, addons: chosen.map((a) => a.id) },
        name: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        phone: data.phone,
        subject: _subject,
        summary: `${catTitle} · ${pkg.name} · ${money(estimate)}${pkg.per || ""}`,
        fields: Object.entries(fieldRows),
      });
      setSent({ name: pkg.name, total: money(estimate) + (pkg.per || ""), who: `${data.firstName} ${data.lastName}`.trim(), email: data.email });
      track("quote_sent", { category, package: pkg.id, total: estimate });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  async function bookNow() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data._honey) return;
    setStatus("booking");
    track("book_now_click", { category, package: pkg.id, total: estimate, today: dueToday });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, packageId: pkg.id, addons: chosen.map((a) => a.id), name: `${data.firstName} ${data.lastName}`.trim(), email: data.email, phone: data.phone, date: data.date, where: data.where, notes: data.notes, contactPref }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || "Checkout didn't open");
      window.location.href = json.url;
    } catch (err) {
      setStatus("bookerror");
      setBookError(err.message);
    }
  }

  if (status === "sent" && sent) {
    return (
      <div className="cform-success qflow-exit" role="status" ref={topRef}>
        <p className="cform-success-title">Got it — your quote is on its way.</p>
        <p className="cform-success-body">
          {sent.name} for {catTitle.toLowerCase().replace(/^(a|my|an) /, "your ")}, starting at {sent.total}. Check your email — the details are already there.
        </p>
        <BookCall name={sent.who} email={sent.email} from="quote" />
      </div>
    );
  }

  return (
    <div className="qflow" ref={topRef}>
      <ol className="qsteps qflow-steps three" aria-label="Quote progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "active" : i < step ? "done" : ""}>
            {i < step ? <button type="button" onClick={() => jump(i)}>{i + 1}. {s}</button> : <span>{i + 1}. {s}</span>}
          </li>
        ))}
      </ol>

      <form ref={formRef} className="quote-form qflow-form" onSubmit={handleSubmit}>
        <input type="text" name="_honey" className="cform-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        {step === 0 && (
          <div className="qflow-step qflow-entry">
            <h3 className="qflow-q">What are we filming?</h3>
            <div className={`qsvc ${CATEGORIES.length === 3 ? "three" : "two"}`}>
              {CATEGORIES.map((c) => (
                <button type="button" key={c.id} className={category === c.id ? "on" : ""} onClick={() => pickCategory(c.id)}>
                  <span className="qsvc-title">{c.title}</span>
                  <span className="qsvc-desc">{c.desc}</span>
                </button>
              ))}
            </div>
            <p className="qhelp qflow-foot">Something else — seniors, headshots, an event? Pick the closest option and tell me in the notes — I&apos;ll quote it.</p>
          </div>
        )}

        {step === 1 && (
          <div className="qflow-step">
            <h3 className="qflow-q">{packages.length === 1 ? "One package. Everything you need." : "Pick your package."}</h3>
            <p className="qhelp">{packages.length === 1 ? "One real price, everything included — then add extras only if you want them." : "Real starting prices. You see exactly what you get before you send anything."}</p>
            <div className={`qpkgs ${packages.length === 2 ? "two" : packages.length === 1 ? "one" : ""}`}>
              {packages.map((p) => (
                <button type="button" key={p.id} className={`qpkg ${pkgId === p.id ? "on" : ""} ${p.popular ? "popular" : ""}`} onClick={() => pickPackage(p.id)} aria-pressed={pkgId === p.id}>
                  {p.popular && <span className="qpkg-flag">Most booked</span>}
                  <span className="qpkg-name">{p.name}</span>
                  <span className="qpkg-price">{money(p.price)}{p.per || ""} <small>starting at</small></span>
                  <span className="qpkg-scope">{p.scope}</span>
                  <span className="qpkg-you">You get</span>
                  <ul>{p.get.map((g) => <li key={g}>{g}</li>)}</ul>
                </button>
              ))}
            </div>

            {pkg && (
              <div className="qflow-addwrap">
                <h4 className="qflow-sub">Want to add anything to {pkg.name}?</h4>
                <div className="qaddons">
                  {addonList.map((a) => (
                    <div key={a.id} className={`qaddon ${addons[a.id] ? "on" : ""}`}>
                      <label className="qaddon-main">
                        <input type="checkbox" checked={!!addons[a.id]} onChange={(e) => setAddons((s) => ({ ...s, [a.id]: e.target.checked }))} />
                        <span className="qaddon-name">{a.name}<small>{a.get}</small></span>
                        <span className="qaddon-price">{a.from ? "from " : ""}+{money(a.price)}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="qnav-row">
                  <button type="button" className="qsecondary" onClick={() => jump(0)}>Back</button>
                  <div className="qflow-go">
                    <span className="qflow-total">Starting at <strong>{money(estimate)}{pkg.per || ""}</strong></span>
                    <button type="button" className="qprimary" onClick={() => { markStarted(category); jump(2); }}>Continue</button>
                  </div>
                </div>
              </div>
            )}
            {!pkg && (
              <div className="qnav-row">
                <button type="button" className="qsecondary" onClick={() => jump(0)}>Back</button>
              </div>
            )}
          </div>
        )}

        <div className="qflow-step" hidden={step !== 2}>
          {pkg && (
            <div className="qmatch qflow-summary">
              <div className="qmatch-kick">Your quote</div>
              <div className="qmatch-name"><span>{pkg.name}{chosen.length ? ` + ${chosen.map((a) => a.name.replace(/^Add /, "").toLowerCase()).join(", ")}` : ""}</span><span className="qmatch-price">starting at {money(estimate)}{pkg.per || ""}</span></div>
              <ul className="qflow-get">
                {fullGet(category, pkg).map((g) => <li key={g}>{g}</li>)}
                {chosen.map((a) => <li key={a.id}><strong>{a.name}:</strong> {a.get}</li>)}
              </ul>
              {buyable ? (
                <p className="qmatch-today">
                  {promoPct ? <><strong>{money(discounted)} today</strong> with code <code>{promo.code}</code> ({promoPct}% off — enter it on the payment screen). </> : <><strong>{money(dueToday)} today</strong></>}
                  {retainer ? `${promoPct ? "That's the 30% retainer that" : " —"} holds your date; the balance is due 14 days before.` : " — paid in full, done."}
                  {!promoPct && " Have a promo code? Enter it on the payment screen."}
                </p>
              ) : (
                <p className="qmatch-fineprint">This is your starting point. I confirm the exact number in writing before we shoot — no surprises.</p>
              )}
              <p className="qmatch-fineprint">All music is professionally licensed through Epidemic Sound. Your finished videos are fully cleared to post anywhere — socials, website, online ads. The license covers songs as they appear in your delivered videos, not the tracks on their own.</p>
            </div>
          )}
          <h3 className="qflow-q">Where should I send it?</h3>
          <div className="qf-grid">
            <div className="qf-field"><label htmlFor="qf-first">First name *</label><input id="qf-first" name="firstName" required={step === 2} autoComplete="given-name" /></div>
            <div className="qf-field"><label htmlFor="qf-last">Last name *</label><input id="qf-last" name="lastName" required={step === 2} autoComplete="family-name" /></div>
            <div className="qf-field"><label htmlFor="qf-email">Email *</label><input id="qf-email" name="email" type="email" required={step === 2} autoComplete="email" /></div>
            <div className="qf-field"><label htmlFor="qf-phone">Phone *</label><input id="qf-phone" name="phone" type="tel" required={step === 2} autoComplete="tel" /></div>
            <div className="qf-field"><label htmlFor="qf-date">{DETAIL[category || "wedding"].date}</label><input id="qf-date" name="date" type="text" placeholder={category === "business" ? "Next month, a Saturday, ASAP…" : category === "family" ? "A weekend in October, golden hour if we can…" : "June 14, 2027 — or a month if you're still deciding"} /></div>
            <div className="qf-field"><label htmlFor="qf-where">{DETAIL[category || "wedding"].where}</label><input id="qf-where" name="where" /></div>
            <div className="qf-field wide"><label htmlFor="qf-notes">Anything I should know?</label><textarea id="qf-notes" name="notes" rows={3} placeholder="Must-have moments, a second location, photos only, a tight deadline…" /></div>
          </div>
          <div className="qgroup">
            <span className="qgroup-label">Best way to reach you</span>
            <div className="qtoggle" role="radiogroup" aria-label="Best way to reach you">
              {["Text me", "Call me", "Email me"].map((o) => (
                <button type="button" key={o} className={contactPref === o ? "on" : ""} aria-pressed={contactPref === o} onClick={() => setContactPref(o)}>{o}</button>
              ))}
            </div>
          </div>
          {status === "error" && <p className="cform-error">That didn&apos;t send. Try again, or text me at 845-549-4425.</p>}
          {status === "bookerror" && <p className="cform-error">{bookError || "Checkout didn't open."} You can still send the quote below, or text 845-549-4425.</p>}
          <div className="qnav-row">
            <button type="button" className="qsecondary" onClick={() => jump(1)}>Back</button>
            <p className="consent">
              {buyable ? <>Booking means you agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">terms</a>{retainer ? " (the retainer is non-refundable; one free reschedule with 30 days' notice)" : ""}. </> : null}
              By sending this you&apos;re okay with Roth Media texting or emailing you about your quote. No spam, no list — just me getting back to you. <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
            </p>
            <div className="qflow-go qflow-buy">
              {buyable && <button type="button" className="qprimary" onClick={bookNow} disabled={status === "booking" || status === "sending"}>{status === "booking" ? "Opening checkout…" : `Book it — ${money(discounted)} today`}</button>}
              <button type="submit" className={buyable ? "qsecondary" : "qprimary"} disabled={status === "sending" || status === "booking"}>{status === "sending" ? "Sending…" : buyable ? "Just send me the quote" : "Send my quote"}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
