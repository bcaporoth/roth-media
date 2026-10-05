"use client";

import { track } from "../lib/track";
import { submitLead } from "../lib/submit-lead";
import BookCall from "./BookCall";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, PACKAGES, ADDONS, DETAIL, TRAVEL, money } from "../lib/packages";
import { bestDeal, applyDeal, codeDeal, upcomingCode, dealTotal, freebie, isFreebieCode } from "../lib/deals";
import { REFERRAL_AMOUNT, isFriendCode, referralEligible } from "../lib/referral-rules";

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

const RETAINER_RATE = 0.5; // weddings pay this today; matches /terms and lib/payments.js

// ── Cinema look (pass `cinema`; styles in app/theme/quote.css). Same state, same numbers, new markup. ──
// A real photo for each door on the first screen (decorative: the button text names it).
const DOOR_PHOTO = {
  wedding: { src: "/photos/40-wedding-just-married-mid-laugh.jpg", pos: "50% 28%" },
  business: { src: "/photos/43-gym-between-the-reps.jpg", pos: "62% 35%" },
  family: { src: "/photos/07-senior-portrait-last-light.jpg", pos: "50% 22%" },
};
function Arrow({ back = false }) {
  return (
    <svg className={back ? "qt-arrow-back" : "cx-arrow"} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d={back ? "M20 12H5M11 6l-6 6 6 6" : "M4 12h15M13 6l6 6-6 6"} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Check() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// "Wedding Videography" with a deal: the new price, the old one struck through.
function Price({ list, deal, now = applyDeal(list, deal) }) {
  return <>{money(now)}{now !== list && <> <s>{money(list)}</s></>}</>;
}

export default function QuoteFlow({ initialCategory = "", checkout = false, code: initialCode = "", initialPkg = "", initialDate = "", cinema = false }) {
  const formRef = useRef(null);
  const topRef = useRef(null);
  const valid = CATEGORIES.some((c) => c.id === initialCategory);
  const [step, setStep] = useState(valid ? 1 : 0);
  const [category, setCategory] = useState(valid ? initialCategory : "");
  // A campaign link can arrive with the package already chosen (?pkg=film) and a date (?date=).
  const [pkgId, setPkgId] = useState(valid && PACKAGES[initialCategory].some((p) => p.id === initialPkg) ? initialPkg : valid && PACKAGES[initialCategory].length === 1 ? PACKAGES[initialCategory][0].id : "");
  const [addons, setAddons] = useState({});
  const [contactPref, setContactPref] = useState("Text me");
  const [status, setStatus] = useState("idle");
  const [sent, setSent] = useState(null);
  const [bookError, setBookError] = useState("");
  const [code, setCode] = useState(initialCode);
  // Cinema view only: once the quote is sent, bring the confirmation into view (the form above it is gone).
  useEffect(() => { if (cinema && status === "sent") topRef.current?.scrollIntoView({ block: "start" }); }, [cinema, status]);

  const packages = category ? PACKAGES[category] : [];
  const pkg = packages.find((p) => p.id === pkgId) || null;
  const addonList = pkg ? ADDONS[category].filter((a) => !pkg.includes.includes(a.id) && !a.hidden) : [];
  // Biggest live deal wins (lib/deals.js); checkout re-checks it on the server.
  const deal = pkg ? bestDeal({ category, packageId: pkg.id, code }) : null;
  // An included add-on (the launch bonus, or a code like GUEST) rides along whether or not it's ticked.
  const freeCode = pkg ? freebie({ code, category, packageId: pkg.id }) : null;
  const freeAddon = freeCode ? addonList.find((a) => a.id === freeCode.addon) : null;
  const free = freeAddon ? freeCode : null;
  const chosen = addonList.filter((a) => addons[a.id] || (free && a.id === free.addon));
  const list = pkg ? pkg.price + chosen.reduce((s, a) => s + a.price, 0) : 0;
  // A friend code (give $100, get $100) shows $100 off here; the cart and checkout check it for real.
  const friend = pkg && isFriendCode(code) && referralEligible(pkg) ? REFERRAL_AMOUNT : 0;
  const estimate = pkg ? Math.max(0, dealTotal([pkg, ...chosen], deal, free) - friend) : 0;
  const dealBase = pkg ? [pkg, ...chosen].filter((i) => !i.noDeal && !(free && i.id === free.addon)).reduce((s, i) => s + i.price, 0) : 0;
  const typed = code.trim().toUpperCase();
  const codeNote = !typed ? "" : isFriendCode(typed) ? (friend ? `Friend code: $${REFERRAL_AMOUNT} off — checked at checkout. Your friend gets $${REFERRAL_AMOUNT} too.` : "Friend codes work on weddings and business packages ($600 and up).") : free && free.code === typed ? `${free.label}: ${freeAddon.name} is included.` : free && isFreebieCode(typed) ? `${freeAddon.name} is already included (${free.label.toLowerCase()}) — no code needed.` : isFreebieCode(typed) ? "That code doesn't cover this package." : deal?.code === typed ? `${deal.pct}% off applied.` : upcomingCode(typed) ? `${typed} opens ${upcomingCode(typed).startsLabel} — right now you're getting ${deal ? `the ${deal.pct}% ${deal.label.toLowerCase()}` : "today's price"}.` : !codeDeal(typed) ? "That code isn't active." : deal ? `The ${deal.label.toLowerCase()} is the bigger discount — that's the one you get.` : `That code doesn't cover ${pkg?.name || "this package"}.`;
  const monthly = chosen.filter((a) => a.monthly);
  const catTitle = CATEGORIES.find((c) => c.id === category)?.title || "";
  // Book-it-now: what they'd pay today. "from" add-ons (scoped on a call) can't be bought.
  const buyable = checkout && pkg && !chosen.some((a) => a.from);
  const retainer = category === "wedding";
  const dueToday = retainer ? Math.round(estimate * RETAINER_RATE) : estimate;

  function jump(n) {
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function pickCategory(id) { markStarted(id); setCategory(id); setPkgId(PACKAGES[id].length === 1 ? PACKAGES[id][0].id : ""); setAddons({}); jump(1); }
  const startedRef = useRef(false);
  function markStarted(id) { if (!startedRef.current) { startedRef.current = true; track("quote_started", { category: id }); } }
  function pickPackage(id) { markStarted(category); setPkgId(id); setAddons({}); }

  // The package's own questions (lib/packages.js → intake), answered ones only.
  function intakeRows(data) {
    return (pkg?.intake || []).map((f) => [f.label.replace(/\?$/, "").toLowerCase(), String(data[`intake_${f.id}`] || "").trim()]).filter(([, v]) => v);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (step !== 2) return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data._honey) return;
    setStatus("sending");
    const L = DETAIL[category];
    const intake = intakeRows(data);
    const rows = {
      _subject: `Quote — ${data.firstName} ${data.lastName} · ${catTitle} · ${pkg.name} (${money(estimate)}${pkg.per || ""})`,
      _template: "table",
      "what it's for": catTitle,
      package: `${pkg.name} — ${money(pkg.price)}${pkg.per || ""}`,
      "add-ons": chosen.length ? chosen.map((a) => `${a.name} (${money(a.price)})`).join("; ") : "none",
      "starting price": money(estimate) + (pkg.per || "") + (deal ? ` (${deal.label}, ${deal.pct}% off ${money(list)})` : "") + (free ? ` (${freeAddon.name} included — ${free.label})` : ""),
      "they get": [...fullGet(category, pkg), ...chosen.map((a) => a.get)].join(" · "),
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      "best way to reach": contactPref,
      [L.date.toLowerCase()]: data.date,
      [L.where.toLowerCase()]: data.where,
      ...Object.fromEntries(intake),
      "anything else": data.notes,
    };
    const { _subject, _template, ...fieldRows } = rows;
    try {
      await submitLead({
        kind: "quote",
        category,
        cart: { category, packageId: pkg.id, addons: chosen.map((a) => a.id), code: typed },
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
        body: JSON.stringify({ category, packageId: pkg.id, addons: chosen.map((a) => a.id), code: typed, name: `${data.firstName} ${data.lastName}`.trim(), email: data.email, phone: data.phone, date: data.date, where: data.where, notes: data.notes, intake: intakeRows(data).map(([k, v]) => `${k}: ${v}`).join(" · "), contactPref }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || "Checkout didn't open");
      window.location.href = json.url;
    } catch (err) {
      setStatus("bookerror");
      setBookError(err.message);
    }
  }

  // ── Cinema view (the /quote page). Everything above is shared; only the markup differs. ──
  if (cinema && status === "sent" && sent) {
    return (
      <div className="qt-sent" role="status" ref={topRef}>
        <p className="cx-kick">Quote sent</p>
        <h2 className="cx-h2">Got it — your quote is on its way.</h2>
        <p className="cx-lede">
          {sent.name} for {catTitle.toLowerCase().replace(/^(a|my|an) /, "your ")}, starting at {sent.total}. I have the details and I'll be in touch soon.
        </p>
        <BookCall name={sent.who} email={sent.email} from="quote" />
      </div>
    );
  }

  if (cinema) {
    return (
      <div className="qt-flow" ref={topRef} data-step={step}>
        <ol className="qt-steps" aria-label="Quote progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? "is-active" : i < step ? "is-done" : ""} aria-current={i === step ? "step" : undefined}>
              {i < step ? (
                <button type="button" onClick={() => jump(i)}><b>0{i + 1}</b><span>{s}</span></button>
              ) : (
                <span className="qt-steps-item"><b>0{i + 1}</b><span>{s}</span></span>
              )}
            </li>
          ))}
        </ol>

        <form ref={formRef} className="qt-form" onSubmit={handleSubmit}>
          <input type="text" name="_honey" className="cform-honey qt-honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          {step === 0 && (
            <div className="qt-pane">
              <h2 className="cx-h2 qt-q">What are we filming?</h2>
              <div className="qt-doors">
                {CATEGORIES.map((c) => (
                  <button type="button" key={c.id} className={`qt-door${category === c.id ? " is-on" : ""}`} onClick={() => pickCategory(c.id)}>
                    {DOOR_PHOTO[c.id] && (
                      <span className="qt-door-media">
                        <img src={DOOR_PHOTO[c.id].src} alt="" loading="lazy" style={{ objectPosition: DOOR_PHOTO[c.id].pos }} />
                      </span>
                    )}
                    <span className="qt-door-body">
                      <span className="qt-door-title">{c.title}</span>
                      <span className="qt-door-desc">{c.desc}</span>
                      <span className="qt-door-go">Start <Arrow /></span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="cx-fine qt-foot">Something else — headshots, a team photo? Pick the closest option and tell me in the notes — I&apos;ll quote it.</p>
            </div>
          )}

          {step === 1 && (
            <div className="qt-pane">
              <h2 className="cx-h2 qt-q">{packages.length === 1 ? "One package. Everything you need." : "Pick your package."}</h2>
              <p className="cx-lede qt-help">{packages.length === 1 ? "One real price, everything included — then add extras only if you want them." : "Real starting prices. You see exactly what you get before you send anything."}</p>
              <div className={`qt-pkgs qt-pkgs--${packages.length}`}>
                {packages.map((p) => {
                  const on = pkgId === p.id;
                  return (
                    <button type="button" key={p.id} className={`qt-pkg${on ? " is-on" : ""}${p.popular ? " is-popular" : ""}`} onClick={() => pickPackage(p.id)} aria-pressed={on}>
                      {p.popular && <span className="cx-flag cx-flag--solid qt-pkg-flag">Most booked</span>}
                      <span className="qt-pkg-top">
                        <span className="qt-pkg-name">{p.name}</span>
                        <span className="qt-radio" aria-hidden="true"><Check /></span>
                      </span>
                      <span className="qt-pkg-scope">{p.scope}</span>
                      <span className="qt-pkg-price"><span className="cx-num"><Price list={p.price} deal={bestDeal({ category, packageId: p.id, code })} />{p.per || ""}</span> <small>starting at</small></span>
                      <span className="qt-pkg-you">You get</span>
                      <ul className="cx-list">{p.get.map((g) => <li key={g}>{g}</li>)}</ul>
                      <span className="qt-pkg-pick">{on ? <><Check /> Selected</> : "Choose this one"}</span>
                    </button>
                  );
                })}
              </div>

              {pkg && (
                <div className="qt-addwrap">
                  <h3 className="cx-h3 qt-sub">Want to add anything to {pkg.name}?</h3>
                  <div className="qt-addons">
                    {addonList.map((a) => (
                      <label key={a.id} className={`qt-addon${addons[a.id] ? " is-on" : ""}`}>
                        <input type="checkbox" checked={!!addons[a.id] || Boolean(free && a.id === free.addon)} disabled={Boolean(free && a.id === free.addon)} onChange={(e) => setAddons((s) => ({ ...s, [a.id]: e.target.checked }))} />
                        <span className="qt-box" aria-hidden="true"><Check /></span>
                        <span className="qt-addon-name">{a.name}<small>{a.get}</small></span>
                        <span className="qt-addon-price">{free && a.id === free.addon ? <>included <s>{money(a.price)}</s></> : a.price === 0 ? <>free{a.was ? <> <s>{money(a.was)}</s></> : null}</> : `${a.from ? "from " : ""}+${money(a.price)}`}{a.monthly ? <small>then {money(a.monthly)}/mo</small> : null}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className={`qt-bar${pkg ? " is-live" : ""}`}>
                <button type="button" className="cx-btn cx-btn--ghost qt-back" onClick={() => jump(0)} aria-label="Back"><Arrow back /><span>Back</span></button>
                {pkg && (
                  <>
                    <p className="qt-total">
                      <span className="qt-total-label">Starting at</span>
                      <strong className="cx-num"><Price list={list} now={estimate} />{pkg.per || ""}</strong>
                      {deal ? <small className="qt-deal">{deal.label} · {deal.pct}% off</small> : free ? <small className="qt-deal">{freeAddon.name} included</small> : null}
                    </p>
                    <button type="button" className="cx-btn cx-btn--light cx-btn--lg qt-continue" onClick={() => { markStarted(category); jump(2); }}>Continue <Arrow /></button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="qt-pane qt-final" hidden={step !== 2}>
            {pkg && (
              <aside className="qt-sum" aria-label="Your quote">
                <p className="cx-kick">Your quote</p>
                <p className="qt-sum-name">{pkg.name}{chosen.length ? ` + ${chosen.map((a) => a.name.replace(/^Add /, "").toLowerCase()).join(", ")}` : ""}</p>
                <p className="qt-sum-price"><small>starting at</small> <span className="cx-num"><Price list={list} now={estimate} />{pkg.per || ""}</span></p>
                <ul className="cx-list qt-sum-get">
                  {fullGet(category, pkg).map((g) => <li key={g}>{g}</li>)}
                  {chosen.map((a) => <li key={a.id}><strong>{a.name}:</strong> {a.get}</li>)}
                </ul>
                {buyable ? (
                  <p className="qt-sum-today">
                    <strong>{money(dueToday)} today</strong>
                    {retainer ? " — the 50% retainer holds your date; the balance is due 14 days before." : " — paid in full, done."}
                  </p>
                ) : (
                  <p className="qt-fine">This is your starting point. I confirm the exact number in writing before we shoot — no surprises.</p>
                )}
                {deal && <p className="qt-fine"><strong>{deal.label}:</strong> {deal.pct}% off {money(dealBase)}{dealBase < list ? " (travel, websites, and ads aren't discounted)" : ""}{deal.endsLabel ? ` — ends ${deal.endsLabel}` : ""}.</p>}
                {free && <p className="qt-fine"><strong>{free.label}:</strong> {freeAddon.name} ({money(freeAddon.price)}) is included{free.code ? ` with code ${free.code}` : ""}{free.endsLabel ? ` — book by ${free.endsLabel}` : ""}.</p>}
                {friend > 0 && <p className="qt-fine"><strong>Friend code {typed}:</strong> {money(friend)} off, confirmed at checkout — and your friend gets {money(friend)} too.</p>}
                {monthly.map((a) => <p key={a.id} className="qt-fine">{a.name}: then {money(a.monthly)}/month, starting 30 days after you pay — manage or cancel anytime at rothmediaco.com/billing.</p>)}
                {category !== "business" || pkg.id === "event" ? <p className="qt-fine">{TRAVEL.line}</p> : null}
                <p className="qt-fine">All music is professionally licensed through Epidemic Sound. Your finished videos are fully cleared to post anywhere — socials, website, online ads. The license covers songs as they appear in your delivered videos, not the tracks on their own.</p>
              </aside>
            )}

            <div className="qt-fields">
              <h2 className="cx-h2 qt-q">Where should I send it?</h2>
              <div className="qt-grid">
                <div className="cx-field"><label className="cx-label" htmlFor="qf-first">First name *</label><input className="cx-input" id="qf-first" name="firstName" required={step === 2} autoComplete="given-name" /></div>
                <div className="cx-field"><label className="cx-label" htmlFor="qf-last">Last name *</label><input className="cx-input" id="qf-last" name="lastName" required={step === 2} autoComplete="family-name" /></div>
                <div className="cx-field"><label className="cx-label" htmlFor="qf-email">Email *</label><input className="cx-input" id="qf-email" name="email" type="email" required={step === 2} autoComplete="email" /></div>
                <div className="cx-field"><label className="cx-label" htmlFor="qf-phone">Phone *</label><input className="cx-input" id="qf-phone" name="phone" type="tel" required={step === 2} autoComplete="tel" /></div>
                <div className="cx-field"><label className="cx-label" htmlFor="qf-date">{DETAIL[category || "wedding"].date}</label><input className="cx-input" id="qf-date" name="date" type="text" defaultValue={initialDate} placeholder={category === "business" ? "Next month, a Saturday, ASAP…" : category === "family" ? "A weekend in October, golden hour if we can…" : "June 14, 2027 — or a month if you're still deciding"} /></div>
                <div className="cx-field"><label className="cx-label" htmlFor="qf-where">{DETAIL[category || "wedding"].where}</label><input className="cx-input" id="qf-where" name="where" /></div>
                {(pkg?.intake || []).map((f) => (
                  <div className="cx-field qt-wide" key={`${pkg.id}-${f.id}`}>
                    <label className="cx-label" htmlFor={`qf-i-${f.id}`}>{f.label}</label>
                    {f.options ? (
                      <select className="cx-select" id={`qf-i-${f.id}`} name={`intake_${f.id}`} defaultValue="">
                        <option value="" disabled>Pick one</option>
                        {f.options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input className="cx-input" id={`qf-i-${f.id}`} name={`intake_${f.id}`} placeholder={f.placeholder} />
                    )}
                  </div>
                ))}
                <div className="cx-field qt-wide"><label className="cx-label" htmlFor="qf-notes">Anything I should know?</label><textarea className="cx-textarea" id="qf-notes" name="notes" rows={3} placeholder="Must-have moments, a second location, photos only, a tight deadline…" /></div>
              </div>

              <div className="qt-extras">
                <div className="qt-reach">
                  <span className="cx-label" id="qf-reach-label">Best way to reach you</span>
                  <div className="cx-pills" role="radiogroup" aria-label="Best way to reach you">
                    {["Text me", "Call me", "Email me"].map((o) => (
                      <button type="button" key={o} className={`cx-pill${contactPref === o ? " is-on" : ""}`} aria-pressed={contactPref === o} onClick={() => setContactPref(o)}>{o}</button>
                    ))}
                  </div>
                </div>
                {pkg && (
                  <div className="cx-field qt-code">
                    <label className="cx-label" htmlFor="qf-code">Promo code</label>
                    <input className="cx-input" id="qf-code" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" />
                    {codeNote && <small className="cx-help">{codeNote}</small>}
                  </div>
                )}
              </div>

              {status === "error" && <p className="cx-error" role="alert">That didn&apos;t send. Try again, or text me at 845-549-4425.</p>}
              {status === "bookerror" && <p className="cx-error" role="alert">{bookError || "Checkout didn't open."} You can still send the quote below, or text 845-549-4425.</p>}

              <div className="qt-actions">
                <div className="qt-buy">
                  {buyable && <button type="button" className="cx-btn cx-btn--light cx-btn--xl cx-btn--block" onClick={bookNow} disabled={status === "booking" || status === "sending"}>{status === "booking" ? "Opening checkout…" : `Book it — ${money(dueToday)} today`}</button>}
                  <p className="qt-promise">No pressure, no surprises. You see the real number first, and we&rsquo;ll have a good time from there.</p>
                  <button type="submit" className={`cx-btn cx-btn--block ${buyable ? "cx-btn--ghost cx-btn--lg" : "cx-btn--light cx-btn--xl"}`} disabled={status === "sending" || status === "booking"}>{status === "sending" ? "Sending…" : buyable ? "Just send me the quote" : "Send my quote"}</button>
                </div>
                <p className="qt-consent">
                  {buyable ? <>Booking means you agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">terms</a>{retainer ? " (the retainer is non-refundable; one free reschedule with 30 days' notice)" : ""}. </> : null}
                  By sending this you&apos;re okay with Roth Media texting or emailing you about your quote. No spam, no list — just me getting back to you. <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
                </p>
                <button type="button" className="cx-btn cx-btn--ghost cx-btn--sm qt-back qt-back--final" onClick={() => jump(1)}><Arrow back /><span>Back</span></button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (status === "sent" && sent) {
    return (
      <div className="cform-success qflow-exit" role="status" ref={topRef}>
        <p className="cform-success-title">Got it — your quote is on its way.</p>
        <p className="cform-success-body">
          {sent.name} for {catTitle.toLowerCase().replace(/^(a|my|an) /, "your ")}, starting at {sent.total}. I have the details and I'll be in touch soon.
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
            <p className="qhelp qflow-foot">Something else — headshots, a team photo? Pick the closest option and tell me in the notes — I&apos;ll quote it.</p>
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
                  <span className="qpkg-price"><Price list={p.price} deal={bestDeal({ category, packageId: p.id, code })} />{p.per || ""} <small>starting at</small></span>
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
                        <input type="checkbox" checked={!!addons[a.id] || Boolean(free && a.id === free.addon)} disabled={Boolean(free && a.id === free.addon)} onChange={(e) => setAddons((s) => ({ ...s, [a.id]: e.target.checked }))} />
                        <span className="qaddon-name">{a.name}<small>{a.get}</small></span>
                        <span className="qaddon-price">{free && a.id === free.addon ? <>included <s>{money(a.price)}</s></> : a.price === 0 ? <>free{a.was ? <> <s>{money(a.was)}</s></> : null}</> : `${a.from ? "from " : ""}+${money(a.price)}`}{a.monthly ? <small>then {money(a.monthly)}/mo</small> : null}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="qnav-row">
                  <button type="button" className="qsecondary" onClick={() => jump(0)}>Back</button>
                  <div className="qflow-go">
                    <span className="qflow-total">Starting at <strong><Price list={list} now={estimate} />{pkg.per || ""}</strong>{deal ? <small className="qdeal-tag">{deal.label} · {deal.pct}% off</small> : free ? <small className="qdeal-tag">{freeAddon.name} included</small> : null}</span>
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
              <div className="qmatch-name"><span>{pkg.name}{chosen.length ? ` + ${chosen.map((a) => a.name.replace(/^Add /, "").toLowerCase()).join(", ")}` : ""}</span><span className="qmatch-price">starting at <Price list={list} now={estimate} />{pkg.per || ""}</span></div>
              <ul className="qflow-get">
                {fullGet(category, pkg).map((g) => <li key={g}>{g}</li>)}
                {chosen.map((a) => <li key={a.id}><strong>{a.name}:</strong> {a.get}</li>)}
              </ul>
              {buyable ? (
                <p className="qmatch-today">
                  <strong>{money(dueToday)} today</strong>
                  {retainer ? " — the 50% retainer holds your date; the balance is due 14 days before." : " — paid in full, done."}
                </p>
              ) : (
                <p className="qmatch-fineprint">This is your starting point. I confirm the exact number in writing before we shoot — no surprises.</p>
              )}
              {deal && <p className="qmatch-fineprint"><strong>{deal.label}:</strong> {deal.pct}% off {money(dealBase)}{dealBase < list ? " (travel, websites, and ads aren't discounted)" : ""}{deal.endsLabel ? ` — ends ${deal.endsLabel}` : ""}.</p>}
              {free && <p className="qmatch-fineprint"><strong>{free.label}:</strong> {freeAddon.name} ({money(freeAddon.price)}) is included{free.code ? ` with code ${free.code}` : ""}{free.endsLabel ? ` — book by ${free.endsLabel}` : ""}.</p>}
              {friend > 0 && <p className="qmatch-fineprint"><strong>Friend code {typed}:</strong> {money(friend)} off, confirmed at checkout — and your friend gets {money(friend)} too.</p>}
              {monthly.map((a) => <p key={a.id} className="qmatch-fineprint">{a.name}: then {money(a.monthly)}/month, starting 30 days after you pay — manage or cancel anytime at rothmediaco.com/billing.</p>)}
              {category !== "business" || pkg.id === "event" ? <p className="qmatch-fineprint">{TRAVEL.line}</p> : null}
              <p className="qmatch-fineprint">All music is professionally licensed through Epidemic Sound. Your finished videos are fully cleared to post anywhere — socials, website, online ads. The license covers songs as they appear in your delivered videos, not the tracks on their own.</p>
            </div>
          )}
          <h3 className="qflow-q">Where should I send it?</h3>
          <div className="qf-grid">
            <div className="qf-field"><label htmlFor="qf-first">First name *</label><input id="qf-first" name="firstName" required={step === 2} autoComplete="given-name" /></div>
            <div className="qf-field"><label htmlFor="qf-last">Last name *</label><input id="qf-last" name="lastName" required={step === 2} autoComplete="family-name" /></div>
            <div className="qf-field"><label htmlFor="qf-email">Email *</label><input id="qf-email" name="email" type="email" required={step === 2} autoComplete="email" /></div>
            <div className="qf-field"><label htmlFor="qf-phone">Phone *</label><input id="qf-phone" name="phone" type="tel" required={step === 2} autoComplete="tel" /></div>
            <div className="qf-field"><label htmlFor="qf-date">{DETAIL[category || "wedding"].date}</label><input id="qf-date" name="date" type="text" defaultValue={initialDate} placeholder={category === "business" ? "Next month, a Saturday, ASAP…" : category === "family" ? "A weekend in October, golden hour if we can…" : "June 14, 2027 — or a month if you're still deciding"} /></div>
            <div className="qf-field"><label htmlFor="qf-where">{DETAIL[category || "wedding"].where}</label><input id="qf-where" name="where" /></div>
            {(pkg?.intake || []).map((f) => (
              <div className="qf-field wide" key={`${pkg.id}-${f.id}`}>
                <label htmlFor={`qf-i-${f.id}`}>{f.label}</label>
                {f.options ? (
                  <select id={`qf-i-${f.id}`} name={`intake_${f.id}`} defaultValue="">
                    <option value="" disabled>Pick one</option>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input id={`qf-i-${f.id}`} name={`intake_${f.id}`} placeholder={f.placeholder} />
                )}
              </div>
            ))}
            <div className="qf-field wide"><label htmlFor="qf-notes">Anything I should know?</label><textarea id="qf-notes" name="notes" rows={3} placeholder="Must-have moments, a second location, photos only, a tight deadline…" /></div>
          </div>
          {pkg && (
            <div className="qf-field qcode">
              <label htmlFor="qf-code">Promo code</label>
              <input id="qf-code" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" />
              {codeNote && <small>{codeNote}</small>}
            </div>
          )}
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
              {buyable && <button type="button" className="qprimary" onClick={bookNow} disabled={status === "booking" || status === "sending"}>{status === "booking" ? "Opening checkout…" : `Book it — ${money(dueToday)} today`}</button>}
              <button type="submit" className={buyable ? "qsecondary" : "qprimary"} disabled={status === "sending" || status === "booking"}>{status === "sending" ? "Sending…" : buyable ? "Just send me the quote" : "Send my quote"}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
