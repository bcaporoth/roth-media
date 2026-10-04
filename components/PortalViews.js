import "../app/theme/portal.css";
import Link from "next/link";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import Reveal from "./Reveal";
import PortalNav from "./PortalNav";
import PortalGallery from "./PortalGallery";
import GuestInvite from "./GuestInvite";

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
}) {
  const hasHosted = hostedGalleries.length > 0;
  const hasLinks = galleries.length > 0;
  const hasPayments = payments.length > 0;
  const [feature, ...rest] = hostedGalleries;

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

      {hasHosted && (
        <section className="cx-wrap pt-shelf" aria-label="Your galleries">
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
      )}

      {!hasHosted && !hasLinks && (
        <div className="cx-wrap">
          <p className="pt-empty">
            Your first gallery is on its way — it&apos;ll appear right here the
            moment it&apos;s ready.
          </p>
        </div>
      )}

      {(hasLinks || hasPayments) && (
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
      )}
    </PortalFrame>
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
