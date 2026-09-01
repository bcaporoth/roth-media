"use client";

import { useRef, useState } from "react";

// ── Three screens. One way in, one way out. ─────────────────────────
// 1. What's it for  →  2. Pick a package (+ a couple of add-ons)  →
// 3. Your info + the quote.  Every number is the Roth Media rate card.

const CONTACT_EMAIL = "b.caporoth@gmail.com";
const ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

const CATEGORIES = [
  { id: "wedding", title: "A wedding or engagement", desc: "A cinematic film of your day — from the proposal to the last dance, with photos if you want them." },
  { id: "business", title: "My business", desc: "Branded content — a brand video and reels that bring customers through the door." },
];

// get: what the client walks away with — plain words, no jargon.
const PACKAGES = {
  wedding: [
    { id: "essential", name: "Essential", price: 2500, scope: "8 hours", get: ["A cinematic highlight film with your real vows and ceremony audio — exactly as long as it should be, never padded", "Your full ceremony, filmed and delivered", "Speeches and toasts, filmed and delivered", "Delivered online, ready to share, within 6 weeks"], includes: [] },
    { id: "signature", name: "Signature", price: 3500, scope: "10 hours", popular: true, get: ["Everything in Essential", "Drone footage of your venue and portraits", "Short vertical reels of your favorite moments, sized for Instagram and TikTok", "A next-day sneak peek to post while everyone's still talking about it"], includes: ["drone", "reels"] },
  ],
  business: [
    { id: "mini", name: "Mini Content Day", price: 750, scope: "One shoot day · the essentials", get: ["Your promo — a 60–90 second brand video for your website and ads", "3 vertical reels for Instagram, Facebook, and TikTok", "10 edited photos, licensed for web and social", "One round of revisions", "Delivered within two weeks, ready to post"], includes: [] },
    { id: "day", name: "Full Content Day", price: 1500, scope: "One shoot day · the full haul", popular: true, get: ["Your promo — a 60–90 second brand video for your website and ads", "10 vertical reels for Instagram, Facebook, and TikTok", "20–40 edited photos, licensed for web and social", "One round of revisions", "Delivered within two weeks, ready to post"], includes: [] },
    { id: "retainer", name: "Every Other Month", price: 1250, per: "/day", scope: "Six Content Days a year", get: ["A Full Content Day every other month — promo, 10 reels, 20–40 photos each visit", "Your feed never goes quiet", "Billed per shoot, no lump sum", "Priority scheduling"], includes: [] },
  ],
};

// Add-ons: three at most per path. Hidden when the package already has it.
const ADDONS = {
  wedding: [
    { id: "photo", name: "Add photo coverage", price: 1000, get: "Full edited gallery with print rights, sneak peeks in 72 hours" },
    { id: "second", name: "Second shooter", price: 500, get: "Two angles all day, both of you getting ready" },
    { id: "engagement", name: "Engagement session", price: 350, get: "An hour of photos before the big day — perfect for save-the-dates and your wedding website" },
    { id: "rehearsal", name: "Rehearsal dinner coverage", price: 400, get: "The night before, filmed — the toasts, the nerves, everyone arriving" },
    { id: "reels", name: "Social reels", price: 250, get: "Short vertical cuts of your favorite moments, sized for Instagram and TikTok" },
    { id: "raw", name: "Every raw moment", price: 300, get: "All the unedited footage from your day, delivered in full — nothing left behind" },
    { id: "drone", name: "Drone footage", price: 200, get: "Aerials of your venue and portraits" },
  ],
  business: [
    { id: "promo2", name: "Another promo video", price: 400, get: "A second 60–90 second cut from the same shoot — a different offer, season, or audience" },
    { id: "reels", name: "5 more reels", price: 250, get: "Five extra vertical reels on top of what your day includes" },
    { id: "photos", name: "20 more edited photos", price: 250, get: "Double the gallery, licensed for web and social" },
    { id: "drone", name: "Drone footage", price: 200, get: "Aerials of your location" },
    { id: "website", name: "Need a website?", price: 2000, from: true, get: "A full site built from your Content Day — the video, the photos, the words. We scope it together on a call." },
  ],
};

const DETAIL = {
  wedding: { date: "Your date", where: "Venue (or town if you're still deciding)" },
  business: { date: "When would you like to shoot?", where: "Business name and location" },
};

const STEPS = ["What it's for", "Your package", "Your info"];
const money = (n) => `$${n.toLocaleString("en-US")}`;

// "Everything in Essential" is fine on a card; on the final quote we spell it out.
function fullGet(category, pkg) {
  const [first, ...rest] = pkg.get;
  const m = /^Everything in (.+)$/.exec(first);
  if (!m) return pkg.get;
  const base = PACKAGES[category].find((p) => p.name === m[1]);
  return base ? [...fullGet(category, base), ...rest] : pkg.get;
}

export default function QuoteFlow({ initialCategory = "" }) {
  const formRef = useRef(null);
  const topRef = useRef(null);
  const valid = CATEGORIES.some((c) => c.id === initialCategory);
  const [step, setStep] = useState(valid ? 1 : 0);
  const [category, setCategory] = useState(valid ? initialCategory : "");
  const [pkgId, setPkgId] = useState("");
  const [addons, setAddons] = useState({});
  const [contactPref, setContactPref] = useState("Text me");
  const [status, setStatus] = useState("idle");
  const [sent, setSent] = useState(null);

  const packages = category ? PACKAGES[category] : [];
  const pkg = packages.find((p) => p.id === pkgId) || null;
  const addonList = pkg ? ADDONS[category].filter((a) => !pkg.includes.includes(a.id)) : [];
  const chosen = addonList.filter((a) => addons[a.id]);
  const estimate = pkg ? pkg.price + chosen.reduce((s, a) => s + a.price, 0) : 0;
  const catTitle = CATEGORIES.find((c) => c.id === category)?.title || "";

  function jump(n) {
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function pickCategory(id) { setCategory(id); setPkgId(""); setAddons({}); jump(1); }
  function pickPackage(id) { setPkgId(id); setAddons({}); }

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
    const payload = Object.fromEntries(Object.entries(rows).filter(([, v]) => v !== undefined && v !== ""));
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) !== "true") throw new Error("failed");
      setSent({ name: pkg.name, total: money(estimate) + (pkg.per || "") });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent" && sent) {
    return (
      <div className="cform-success qflow-exit" role="status" ref={topRef}>
        <p className="cform-success-title">Got it — I&apos;ll be in touch within 24 hours.</p>
        <p className="cform-success-body">
          {sent.name} for {catTitle.toLowerCase().replace(/^(a|my|an) /, "your ")}, starting at {sent.total}. I&apos;ll confirm the exact number and lock your date. Usually much faster than 24 hours.
        </p>
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
            <div className="qsvc two">
              {CATEGORIES.map((c) => (
                <button type="button" key={c.id} className={category === c.id ? "on" : ""} onClick={() => pickCategory(c.id)}>
                  <span className="qsvc-title">{c.title}</span>
                  <span className="qsvc-desc">{c.desc}</span>
                </button>
              ))}
            </div>
            <p className="qhelp qflow-foot">Just want photos? Pick the closest option and tell me in the notes — I&apos;ll quote it.</p>
          </div>
        )}

        {step === 1 && (
          <div className="qflow-step">
            <h3 className="qflow-q">Pick your package.</h3>
            <p className="qhelp">Real starting prices. You see exactly what you get before you send anything.</p>
            <div className={`qpkgs ${packages.length === 2 ? "two" : ""}`}>
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
                    <button type="button" className="qprimary" onClick={() => jump(2)}>Continue</button>
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
              <p className="qmatch-fineprint">This is your starting point. I confirm the exact number in writing before we shoot — no surprises.</p>
              <p className="qmatch-fineprint">All music is professionally licensed through Epidemic Sound. Your finished videos are fully cleared to post anywhere — socials, website, online ads. The license covers songs as they appear in your delivered videos, not the tracks on their own.</p>
            </div>
          )}
          <h3 className="qflow-q">Where should I send it?</h3>
          <div className="qf-grid">
            <div className="qf-field"><label htmlFor="qf-first">First name *</label><input id="qf-first" name="firstName" required={step === 2} autoComplete="given-name" /></div>
            <div className="qf-field"><label htmlFor="qf-last">Last name *</label><input id="qf-last" name="lastName" required={step === 2} autoComplete="family-name" /></div>
            <div className="qf-field"><label htmlFor="qf-email">Email *</label><input id="qf-email" name="email" type="email" required={step === 2} autoComplete="email" /></div>
            <div className="qf-field"><label htmlFor="qf-phone">Phone *</label><input id="qf-phone" name="phone" type="tel" required={step === 2} autoComplete="tel" /></div>
            <div className="qf-field"><label htmlFor="qf-date">{DETAIL[category || "wedding"].date}</label><input id="qf-date" name="date" type="text" placeholder={category === "business" ? "Next month, a Saturday, ASAP…" : "June 14, 2027 — or a month if you're still deciding"} /></div>
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
          <div className="qnav-row">
            <button type="button" className="qsecondary" onClick={() => jump(1)}>Back</button>
            <button type="submit" className="qprimary" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send my quote"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
