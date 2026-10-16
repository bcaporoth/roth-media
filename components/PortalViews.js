import "../app/theme/portal.css";
import Link from "next/link";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import Reveal from "./Reveal";
import PortalNav from "./PortalNav";
import PortalGallery from "./PortalGallery";
import GuestInvite from "./GuestInvite";
import { KIND_LABEL, STATUSES, STATUS_LABEL } from "../lib/content-plan";

// The client side of the portal, in the Cinema design: the lobby (signed
// out), the client home, the account page and the gallery "premiere".
// Pure presentation: pages fetch + sign everything and pass it in, so the
// same views render with real data or with a preview's sample data.

function Arrow() {
  return (
    <svg className="cx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownIcon() {
  return (
    <svg className="pt-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 4v11M6.5 10.5 12 16l5.5-5.5M5 20h14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Signed out: the lobby. Photo on one side, the desk on the other. ──
export function PortalLobby({ kicker = "Client Portal", title, lede, children }) {
  return (
    <>
      <SiteNav active="portal" cta={null} />
      <main className="cx-page pt-page pt-lobby">
        <figure className="pt-lobby-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/photos/22-wedding-the-first-dance.jpg"
            alt="A couple's first dance under string lights in a barn, in black and white"
            fetchPriority="high"
          />
          <figcaption>The first dance</figcaption>
        </figure>
        <section className="pt-lobby-desk">
          <div className="pt-lobby-inner">
            <p className="cx-kick">{kicker}</p>
            <h1 className="cx-h1 pt-lobby-title">{title}</h1>
            <p className="cx-lede">{lede}</p>
            {children}
          </div>
        </section>
      </main>
      <SiteFooter slim />
    </>
  );
}

// ── Signed in: app bar + page + slim footer. ──
export function PortalFrame({ nav, className = "", children }) {
  return (
    <>
      <div className="pt-root">
        {nav}
        <main className={`cx-page pt-page ${className}`}>{children}</main>
      </div>
      <SiteFooter slim />
    </>
  );
}

// Signed in, but nothing to show yet (no client record).
export function PortalNotice({ nav, kicker = "Client Portal", title, children }) {
  return (
    <PortalFrame nav={nav} className="pt-notice">
      <div className="cx-wrap cx-wrap--narrow pt-head">
        <p className="cx-kick">{kicker}</p>
        <h1 className="cx-h1 cx-h1--long">{title}</h1>
        <p className="cx-lede">{children}</p>
      </div>
    </PortalFrame>
  );
}

function galleryMeta(g) {
  return (
    <>
      {g.shared ? "Shared with you · " : ""}
      {g.media_count} items
      {g.event_date &&
        ` · ${new Date(g.event_date).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}`}
    </>
  );
}

// ── The shelf: newest album as the big poster, the rest underneath. ──
function GalleryShelf({ hostedGalleries, label = "Your galleries" }) {
  const [feature, ...rest] = hostedGalleries;
  return (
    <section className="cx-wrap pt-shelf" aria-label={label}>
      <Link href={`/portal/gallery/${feature.id}`} className="pt-feature">
        <span className="pt-feature-shot">
          {feature.coverUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={feature.coverUrl} alt="" />
              {feature.posterUrl && (
                <span
                  className="pt-feature-hd"
                  style={{ backgroundImage: `url(${feature.posterUrl})` }}
                  aria-hidden="true"
                />
              )}
            </>
          ) : (
            <span className="pt-poster-blank" aria-hidden="true" />
          )}
        </span>
        <span className="pt-feature-body">
          <span className="cx-kick">
            {feature.shared ? "Shared with you" : "Your gallery"}
          </span>
          <strong className="cx-h2 pt-feature-title">{feature.title}</strong>
          <span className="pt-feature-meta">{galleryMeta(feature)}</span>
          <span className="cx-btn cx-btn--light cx-btn--lg pt-feature-cta">
            Open gallery <Arrow />
          </span>
        </span>
      </Link>

      {rest.length > 0 && (
        <div className="pt-posters">
          {rest.map((g) => (
            <Link
              href={`/portal/gallery/${g.id}`}
              className="pt-poster cx-reveal"
              key={g.id}
            >
              <span className="pt-poster-shot">
                {g.coverUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={g.coverUrl} alt="" loading="lazy" />
                ) : (
                  <span className="pt-poster-blank" aria-hidden="true" />
                )}
              </span>
              <span className="pt-poster-caption">
                <strong>{g.title}</strong>
                <span>{galleryMeta(g)}</span>
              </span>
              <span className="pt-poster-go" aria-hidden="true">
                Open <Arrow />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Gallery links (outside albums) + payments. ──
function Ledger({ galleries, payments, total, money, dateFmt, hasHosted }) {
  const hasLinks = galleries.length > 0;
  const hasPayments = payments.length > 0;
  if (!hasLinks && !hasPayments) return null;
  return (
    <section
      className={
        "cx-wrap pt-ledger" + (hasLinks && hasPayments ? " pt-ledger--two" : "")
      }
    >
      {hasLinks && (
        <div className="pt-ledger-col cx-reveal">
          <h2 className="cx-kick pt-ledger-title">
            {hasHosted ? "More links" : "Your galleries"}
          </h2>
          <ul className="cx-rows pt-links">
            {galleries.map((g) => (
              <li key={g.id} className="cx-row">
                <a href={g.url} target="_blank" rel="noopener noreferrer">
                  <span className="cx-row-name">{g.title}</span>
                  <span className="pt-links-go" aria-hidden="true">Open ↗</span>
                </a>
                {g.note && <span className="pt-note">{g.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasPayments && (
        <div className="pt-ledger-col cx-reveal">
          <h2 className="cx-kick pt-ledger-title">Payments</h2>
          <ul className="cx-rows pt-payments">
            {payments.map((p) => (
              <li key={p.id} className="cx-row">
                <span className="pt-pay-what">
                  {dateFmt(p.paid_on)}
                  {p.note && <span className="pt-note"> — {p.note}</span>}
                </span>
                <span className="cx-row-price">{money(p.amount_cents)}</span>
              </li>
            ))}
          </ul>
          <p className="pt-total">
            <span>Total with Roth Media</span>
            <span className="cx-num">{money(total)}</span>
          </p>
        </div>
      )}
    </section>
  );
}

// ── Client home: galleries as posters, then links + payments. ──
export function PortalHome({
  nav,
  firstName,
  hostedGalleries = [],
  galleries = [],
  payments = [],
  total = 0,
  money,
  dateFmt,
  brief = null, // null = not shown; false = none yet; object = saved
}) {
  const hasHosted = hostedGalleries.length > 0;
  const hasLinks = galleries.length > 0;

  return (
    <PortalFrame nav={nav} className="pt-home">
      <Reveal />
      <header className="cx-wrap pt-head">
        <p className="cx-kick">Client Portal</p>
        <h1 className="cx-h1">Hi, {firstName}.</h1>
        <p className="cx-lede">
          Your photos and films, ready when you are — view, share, and download
          anytime.
        </p>
      </header>

      {hasHosted && <GalleryShelf hostedGalleries={hostedGalleries} />}

      {!hasHosted && !hasLinks && (
        <div className="cx-wrap">
          <p className="pt-empty">
            Your first gallery is on its way — it&apos;ll appear right here the
            moment it&apos;s ready.
          </p>
        </div>
      )}

      {brief !== null && (
        <section className="cx-wrap pt-brief-card cx-reveal" aria-label="Your shoot brief">
          <p className="cx-kick">Your shoot brief</p>
          <p className="pt-note">
            {brief
              ? "The questions I plan your day from — locations, the one shot you can't miss, outfits. Change anything, any time."
              : "Five minutes on the questions I plan your day from. Fill it in once; come back and change it any time."}
          </p>
          <Link href="/portal/brief" className="cx-btn cx-btn--light">{brief ? "Open my brief" : "Fill in my brief"} <Arrow /></Link>
        </section>
      )}

      <Ledger galleries={galleries} payments={payments} total={total} money={money} dateFmt={dateFmt} hasHosted={hasHosted} />
    </PortalFrame>
  );
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ── Business home: their content and their brand on one page. ──
// For clients with a brand palette (business clients). Two cards — the
// brand palette and the shoot brief — sit above the content while either
// still needs filling in, and drop below it once both are done, so the
// page always leads with what they most need right now.
//   brand: { done, of, next: [first missing label], colors: [{hex, role, name}],
//            logo: url|null, words: [string] }
//   brief: false (none yet) | { when: "October 3" }
export function PortalBusinessHome({
  nav,
  name,
  hostedGalleries = [],
  galleries = [],
  payments = [],
  total = 0,
  money,
  dateFmt,
  brand,
  brief = false,
  plan = null,
}) {
  const hasHosted = hostedGalleries.length > 0;
  const hasLinks = galleries.length > 0;
  const albums = hostedGalleries.length + galleries.length;
  const items = hostedGalleries.reduce((n, g) => n + (g.media_count || 0), 0);
  const essentialsDone = brand.done >= brand.of;
  const todo = !essentialsDone || !brief;

  const cards = (
    <section className={"cx-wrap pt-biz-cards" + (todo ? " is-todo" : "")} aria-labelledby="pt-biz-cards-h">
      <div className="pt-biz-sechead">
        <h2 id="pt-biz-cards-h" className="cx-kick">{todo ? "Start here" : "Your brand and brief"}</h2>
        {todo && <p className="pt-note">Two short forms I plan your shoots from. Both save as you go, and you can skip anything.</p>}
      </div>
      <div className="pt-biz-grid">
        <article className="pt-biz-card">
          <h3 className="pt-biz-title">Your brand</h3>
          <p className="pt-biz-what">Your logo, colors, customers and goals. I plan every shoot, edit and caption from it.</p>
          {(brand.logo || brand.colors.length > 0) && (
            <div className="pt-biz-look">
              {brand.logo && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={brand.logo} alt="Your logo" className="pt-biz-logo" />
              )}
              {brand.colors.map((c, i) => (
                <span key={i} className="pt-biz-swatch" style={{ background: c.hex }} title={`${c.name || c.role} ${c.hex}`} aria-hidden="true" />
              ))}
            </div>
          )}
          {brand.words.length > 0 && <p className="pt-biz-words">{brand.words.join(" · ")}</p>}
          <div className="pt-biz-meter">
            <span>Essentials: <strong>{brand.done} of {brand.of}</strong> filled in</span>
            <span className="pt-biz-bar" role="progressbar" aria-label="Essentials filled in" aria-valuemin={0} aria-valuemax={brand.of} aria-valuenow={brand.done}>
              <span style={{ width: `${brand.of ? Math.round((brand.done / brand.of) * 100) : 0}%` }} />
            </span>
          </div>
          <p className="pt-biz-stat">
            {essentialsDone
              ? "The essentials are done. Add more or change anything, any time."
              : <>{brand.of - brand.done} left. Next up: &ldquo;{brand.next[0]}&rdquo;</>}
          </p>
          <Link href="/portal/brand" className="cx-btn cx-btn--light cx-btn--lg pt-biz-btn">
            {brand.done === 0 ? "Start my brand" : essentialsDone ? "Open my brand" : "Finish my brand"} <Arrow />
          </Link>
        </article>

        <article className="pt-biz-card">
          <h3 className="pt-biz-title">Your shoot brief</h3>
          <p className="pt-biz-what">What the next shoot is for, where we&apos;re filming, who&apos;s on camera, and the shots you can&apos;t miss.</p>
          <p className="pt-biz-stat">
            {brief ? `Last saved ${brief.when}. Change it any time before the shoot.` : "Not filled in yet. It takes about five minutes."}
          </p>
          <Link href="/portal/brief" className={"cx-btn cx-btn--lg pt-biz-btn " + (brief ? "cx-btn--ghost" : "cx-btn--light")}>
            {brief ? "Update my brief" : "Fill in my brief"} <Arrow />
          </Link>
        </article>
      </div>
    </section>
  );

  return (
    <PortalFrame nav={nav} className="pt-home pt-biz">
      <Reveal />
      <header className="cx-wrap pt-head">
        <p className="cx-kick">Your business portal</p>
        <h1 className="cx-h1 cx-h1--long">{name}</h1>
        <p className="cx-lede">
          Your photos and videos, your brand, and your next shoot, in one
          place.
        </p>
      </header>

      {plan && <PlanSection plan={plan} />}

      {todo && cards}

      <section id="content" className="pt-biz-content" aria-labelledby="pt-biz-content-h">
        <div className="cx-wrap pt-biz-sechead">
          <h2 id="pt-biz-content-h" className="cx-kick">Your content</h2>
          <p className="pt-note">
            {albums
              ? `${plural(albums, "gallery", "galleries")}${items ? ` · ${plural(items, "photo or video", "photos and videos")}` : ""}. Newest first. Open one to watch it, save to your phone, or download the full files.`
              : "Photos and videos from your shoots land here."}
          </p>
        </div>
        {hasHosted && <GalleryShelf hostedGalleries={hostedGalleries} label="Your content" />}
        {!hasHosted && !hasLinks && (
          <div className="cx-wrap">
            <p className="pt-empty">
              Your first gallery is on its way — it&apos;ll appear right here the
              moment it&apos;s ready.
            </p>
          </div>
        )}
      </section>

      {!todo && cards}

      <Ledger galleries={galleries} payments={payments} total={total} money={money} dateFmt={dateFmt} hasHosted={hasHosted} />

      <p className="cx-wrap pt-biz-help">
        Need something changed, or can&apos;t find a file? Text me at{" "}
        <a href="tel:+18455494425">845-549-4425</a>.
      </p>
    </PortalFrame>
  );
}

// The content plan Brandon published from Studio (lib/content-plan.js):
// each piece, what gets filmed, and where it is right now.
function PlanSection({ plan }) {
  const done = plan.items.filter((it) => it.status === "delivered").length;
  // "Reel 1", "Reel 2", "Promo video": numbered within a kind when there's more than one.
  const per = plan.items.reduce((m, it) => ({ ...m, [it.kind]: (m[it.kind] || 0) + 1 }), {});
  const seen = {};
  const label = (it) => (per[it.kind] > 1 ? `${KIND_LABEL[it.kind]} ${(seen[it.kind] = (seen[it.kind] || 0) + 1)}` : KIND_LABEL[it.kind]);
  return (
    <section id="plan" className="cx-wrap pt-plan" aria-labelledby="pt-plan-h">
      <div className="pt-biz-sechead">
        <h2 id="pt-plan-h" className="cx-kick">Your content plan</h2>
        <div className="pt-plan-top">
          {plan.price && <span className="pt-plan-price">{plan.price}</span>}
          <span className="pt-note">{plural(plan.items.length, "piece", "pieces")} · {done} delivered</span>
        </div>
        {plan.intro && <p className="pt-plan-intro">{plan.intro}</p>}
      </div>
      <ol className="pt-plan-list">
        {plan.items.map((it) => {
          const step = STATUSES.findIndex((s) => s.id === it.status);
          return (
            <li key={it.id} className={`pt-plan-item is-${it.status}`}>
              <div className="pt-plan-head">
                <span className="pt-plan-kind">{label(it)}</span>
                <span className="pt-plan-status">{STATUS_LABEL[it.status]}</span>
              </div>
              <h3 className="pt-plan-title">{it.title || KIND_LABEL[it.kind]}</h3>
              <span className="pt-plan-steps" role="img" aria-label={`Step ${step + 1} of ${STATUSES.length}: ${STATUS_LABEL[it.status]}`}>
                {STATUSES.map((s, j) => <i key={s.id} className={j <= step ? "is-on" : ""} />)}
              </span>
              {it.idea && <p className="pt-plan-idea">{it.idea}</p>}
              {(it.length || it.when) && <p className="pt-plan-meta">{[it.length, it.when].filter(Boolean).join(" · ")}</p>}
              {(it.hook || it.shots.length > 0 || it.on_camera) && (
                <details className="pt-plan-more">
                  <summary>What we&apos;ll film</summary>
                  {it.hook && <p><strong>First two seconds:</strong> {it.hook}</p>}
                  {it.shots.length > 0 && <ul>{it.shots.map((sh, k) => <li key={k}>{sh}</li>)}</ul>}
                  {it.on_camera && <p><strong>On camera:</strong> {it.on_camera}</p>}
                </details>
              )}
            </li>
          );
        })}
      </ol>
      {plan.needs.length > 0 && (
        <div className="pt-plan-needs">
          <h3 className="pt-plan-title">What I need from you</h3>
          <ul>{plan.needs.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      )}
      <p className="pt-note pt-plan-change">Want something changed? Text me at <a href="tel:+18455494425">845-549-4425</a>.</p>
    </section>
  );
}

// ── Account: set or change the password. ──
export function PortalAccount({ nav, email, setup = false, children }) {
  return (
    <PortalFrame nav={nav} className="pt-account">
      <div className="cx-wrap cx-wrap--mid pt-account-grid">
        <header className="pt-account-head">
          <p className="cx-kick">Your account</p>
          <h1 className="cx-h1 cx-h1--long">
            {setup ? "Choose your password." : "Change your password."}
          </h1>
          <p className="cx-lede">
            {setup
              ? `You're in as ${email}. Pick a password and that's it — from then on you sign in with your email and password, no email links.`
              : `Signed in as ${email}. Set a new password below — it takes effect immediately.`}
          </p>
        </header>
        <div className="pt-account-form">{children}</div>
      </div>
    </PortalFrame>
  );
}

// ── Gallery: the premiere. Cover as the poster, downloads up front. ──
export function PortalPremiere({
  skin,
  email,
  isAdmin = false,
  gallery,
  eyebrow,
  items = [],
  coverUrl = null,
  coverThumbUrl = null,
  zipUrl = null,
  videoPoster = null,
  guestLink = null,
  hasBrand = false,
  children = null,
}) {
  const words = gallery.title.split(" ");
  return (
    <>
      {/* The app bar stays in the house fonts; the album's own design
          (font pairing + accent) starts below it. */}
      <div className="pt-root">
        <PortalNav
          email={email}
          isAdmin={isAdmin}
          brand={hasBrand}
          extra={
            zipUrl ? (
              <li className="pt-nav-extra">
                <a className="pnav-link" href={zipUrl}>Download all ↓</a>
              </li>
            ) : null
          }
        />
      </div>
      <div
        className={`${skin.className} pt-root pt-skin`}
        style={skin.style}
        data-accent={skin.design?.accent || "clay"}
      >
        {skin.fontHref && <link rel="stylesheet" href={skin.fontHref} />}

        <main className="cx-page pt-page pt-premiere">
          <header className={"cx-hero pt-prem-hero" + (coverUrl || coverThumbUrl ? "" : " pt-prem-hero--bare")}>
            {(coverUrl || coverThumbUrl) && (
              <div className="cx-hero-media pt-prem-media" aria-hidden="true">
                {coverThumbUrl && (
                  <div className="pt-prem-layer" style={{ backgroundImage: `url(${coverThumbUrl})` }} />
                )}
                {coverUrl && (
                  <div className="pt-prem-layer" style={{ backgroundImage: `url(${coverUrl})` }} />
                )}
              </div>
            )}
            <div className="cx-hero-shade" aria-hidden="true" />
            <div className="cx-wrap cx-hero-body">
              <p className="cx-kick pt-accent">{eyebrow}</p>
              <h1 className="cx-display pt-prem-title">
                {words.slice(0, -1).join(" ")} {words.slice(-1)}
              </h1>
              <p className="pt-prem-meta">
                {items.length} {items.length === 1 ? "item" : "items"} · yours to
                keep, forever
              </p>
              <div className="cx-cta-row">
                <a href="#grid" className="cx-btn cx-btn--light cx-btn--lg">
                  View gallery ↓
                </a>
                {zipUrl && (
                  <a href={zipUrl} className="cx-btn cx-btn--ghost cx-btn--lg">
                    <DownIcon /> Download everything
                  </a>
                )}
              </div>
            </div>
          </header>

          {(gallery.share_token || guestLink) && (
            <div className="pt-prem-strip">
              <div className={"cx-wrap pt-prem-strip-in" + (gallery.share_token && guestLink ? " pt-prem-strip-in--two" : "")}>
                {gallery.share_token && (
                  <div className="pt-share">
                    <p className="cx-kick">Share</p>
                    <p className="pt-share-text">
                      Share this gallery with family &amp; friends — no login needed:{" "}
                      <a href={`/g/${gallery.share_token}`}>
                        rothmediaco.com/g/{gallery.share_token.slice(0, 8)}…
                      </a>
                    </p>
                  </div>
                )}

                {guestLink && (
                  <div className="pt-guest">
                    <p className="cx-kick">From your guests</p>
                    <strong className="pt-guest-title">
                      {guestLink.count === 0
                        ? "Your guests' photos land here"
                        : `${guestLink.count} ${guestLink.count === 1 ? "upload" : "uploads"} from the people who were there`}
                    </strong>
                    <span className="pt-guest-sub">
                      {guestLink.open
                        ? "Anyone with the link can add their phone photos, videos, and a message — no app."
                        : "Uploads have closed, but everything they sent is here."}
                    </span>
                    <div className="pt-guest-actions">
                      <a className="cx-btn cx-btn--ghost cx-btn--sm" href={guestLink.href}>
                        Open guest gallery →
                      </a>
                      {guestLink.open && (
                        <GuestInvite slug={guestLink.slug} title={guestLink.title} className="pt-guest-invite" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <section id="grid" className="pt-prem-grid">
            <PortalGallery items={items} title={gallery.title} videoPoster={videoPoster} />
            {children}
          </section>
        </main>
      </div>
      <SiteFooter slim />
    </>
  );
}
