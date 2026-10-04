import "../app/theme/share.css";
import Link from "next/link";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import Reveal from "./Reveal";
import BrandMark from "./BrandMark";
import PortalGallery from "./PortalGallery";
import PremiereGate from "./PremiereGate";
import GuestInvite from "./GuestInvite";
import GuestUpload from "./GuestUpload";

// Everything a couple shares with other people, in the Cinema design:
// the shared album (/g/[token]), its pre-premiere waiting room, and the
// guest upload pages (/guest/[slug], /gallery, /sign).
// Pure presentation: pages fetch + sign everything and pass it in, so the
// same views render with real data or with a preview's sample data.

const QUOTE_CTA = { href: "/quote", label: "Book your own shoot" };

function Arrow() {
  return (
    <svg className="cx-arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownIcon() {
  return (
    <svg className="sh-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 4v11M6.5 10.5 12 16l5.5-5.5M5 20h14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Skin({ skin, children }) {
  return (
    <div
      className={`${skin.className} sh-skin`}
      style={skin.style}
      data-accent={skin.design?.accent || "clay"}
    >
      {skin.fontHref && <link rel="stylesheet" href={skin.fontHref} />}
      {children}
    </div>
  );
}

function HeroMedia({ coverUrl }) {
  if (!coverUrl) return null;
  return (
    <>
      <div className="cx-hero-media sh-hero-media" aria-hidden="true">
        <div className="sh-hero-layer" style={{ backgroundImage: `url(${coverUrl})` }} />
      </div>
      <div className="cx-hero-shade" aria-hidden="true" />
    </>
  );
}

// ── /g/[token] before the premiere: no media leaves the server, guests
//    get the title, the sign-up and (once signed up) the countdown. ──
export function SharedPremiereWait({ skin, gallery, token, eyebrow, coverUrl = null }) {
  return (
    <>
      <SiteNav overHero={Boolean(coverUrl)} cta={QUOTE_CTA} />
      <Skin skin={skin}>
        <main className="cx-page cx-page--hero sh-page sh-wait">
          <header className={"cx-hero cx-hero--full sh-hero sh-wait-hero" + (coverUrl ? "" : " sh-hero--bare")}>
            <HeroMedia coverUrl={coverUrl} />
            <div className="cx-wrap cx-hero-body sh-wait-body">
              <div className="sh-wait-head">
                <p className="cx-kick sh-accent">{eyebrow}</p>
                <h1 className="cx-display sh-title">{gallery.title}</h1>
              </div>
              <PremiereGate
                mode="inline"
                galleryId={gallery.id}
                token={token}
                title={gallery.title}
                revealAt={gallery.reveal_at}
              />
            </div>
          </header>
        </main>
      </Skin>
      <SiteFooter slim />
    </>
  );
}

// ── /g/[token]: the album a couple sends to family. ──
export function SharedAlbum({
  skin,
  gallery,
  token,
  eyebrow,
  items = [],
  coverUrl = null,
  zipUrl = null,
  guestLink = null,
  videoPoster = null,
  premiereActive = false,
  reviewUrl = null,
  children = null,
}) {
  return (
    <>
      <SiteNav overHero={Boolean(coverUrl)} cta={QUOTE_CTA} />
      <Skin skin={skin}>
        {premiereActive && (
          <PremiereGate
            mode="overlay"
            galleryId={gallery.id}
            token={token}
            title={gallery.title}
            revealAt={gallery.reveal_at}
          />
        )}
        <main className="cx-page cx-page--hero sh-page sh-album">
          <Reveal />
          <header className={"cx-hero sh-hero" + (coverUrl ? "" : " sh-hero--bare")}>
            <HeroMedia coverUrl={coverUrl} />
            <div className="cx-wrap cx-hero-body">
              <p className="cx-kick sh-accent">{eyebrow}</p>
              <h1 className="cx-display sh-title">{gallery.title}</h1>
              <p className="sh-meta">
                {items.length} {items.length === 1 ? "item" : "items"} · filmed
                &amp; photographed by Roth Media
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

          <div className="sh-body">
            {guestLink && (
              <div className="sh-strip">
                <div className="cx-wrap sh-guestcard">
                  <div className="sh-guestcard-copy">
                    <p className="cx-kick sh-accent">From your guests</p>
                    <strong className="sh-guestcard-title">
                      {guestLink.count === 0
                        ? "Your guests' photos land here"
                        : `${guestLink.count} ${guestLink.count === 1 ? "upload" : "uploads"} from the people who were there`}
                    </strong>
                    <span className="sh-guestcard-sub">
                      {guestLink.open
                        ? "Anyone with the link can add their phone photos, videos, and a message — no app."
                        : "Uploads have closed, but everything they sent is here."}
                    </span>
                  </div>
                  <div className="sh-guestcard-actions">
                    <a className="cx-btn cx-btn--ghost cx-btn--sm" href={guestLink.href}>
                      Open guest gallery →
                    </a>
                    {guestLink.open && <GuestInvite slug={guestLink.slug} title={guestLink.title} />}
                  </div>
                </div>
              </div>
            )}

            <section id="grid" className="sh-grid">
              <PortalGallery items={items} title={gallery.title} videoPoster={videoPoster} />
              {children}
            </section>

            <section className="sh-close">
              <div className="cx-wrap sh-close-in cx-reveal">
                <div className="sh-close-copy">
                  <p className="cx-kick sh-accent">Loved these?</p>
                  <h2 className="cx-h1 sh-close-title">Book your own shoot.</h2>
                </div>
                <div className="sh-close-act">
                  <p className="cx-lede">
                    Weddings, seniors, brands, events — get an instant quote in two
                    minutes.
                  </p>
                  <div className="cx-cta-row">
                    <Link href="/quote" className="cx-btn cx-btn--light cx-btn--lg">
                      Get my instant quote <Arrow />
                    </Link>
                  </div>
                  {reviewUrl && (
                    <p className="sh-review">
                      Had a great experience with us?{" "}
                      <a href={reviewUrl} target="_blank" rel="noopener noreferrer">
                        Leave a Google review ★
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </Skin>
      <SiteFooter slim />
    </>
  );
}

// ── Guest pages: no site nav (the QR on the table lands here) — just a
//    quiet brand bar so nothing competes with the upload button. ──
function GuestBar({ label }) {
  return (
    <header className="sh-bar">
      <Link href="/" className="cx-brand sh-bar-brand">
        <BrandMark />
        <span>Roth Media</span>
      </Link>
      <span className="sh-bar-label">{label}</span>
    </header>
  );
}

// ── /guest/[slug]: used one-handed, on a phone, in a dark room. ──
export function GuestUploadView({ ev, open, closesAt }) {
  return (
    <main className="cx-page sh-page sh-guest">
      <GuestBar label="No app · no account" />
      <div className="sh-guest-col">
        <div className="sh-guest-head">
          <p className="cx-kick">Guest photos</p>
          <h1 className="cx-h1 sh-guest-title">{ev.title}</h1>
          <p className="cx-lede sh-guest-lede">
            Got a great shot today? Send it straight to the couple — pick from your camera roll, no app, no account. Photos, videos, or a quick message for them.
          </p>
        </div>
        <div className="sh-guest-panel">
          <GuestUpload slug={ev.slug} title={ev.title} open={open} closesAt={closesAt} />
        </div>
        <p className="sh-guest-foot">
          Filmed by <Link href="/">Roth Media</Link> · <Link href="/privacy">Privacy</Link>
        </p>
      </div>
    </main>
  );
}

// ── /guest/[slug]/gallery?k=… : the couple's private view. ──
export function GuestGalleryView({ ev, items = [], stillOpen = false, when }) {
  const messages = items.filter((i) => i.kind === "message");
  const media = items.filter((i) => i.kind !== "message");
  const guests = new Set(items.map((i) => i.guest_name).filter(Boolean)).size;
  return (
    <main className="cx-page sh-page sh-guest sh-guestgal">
      <GuestBar label="Private link" />
      <div className="cx-wrap">
        <header className="sh-gg-head">
          <p className="cx-kick">From your guests</p>
          <h1 className="cx-h1 sh-guest-title">{ev.title}</h1>
          <p className="cx-lede sh-gg-lede">
            {items.length} {items.length === 1 ? "upload" : "uploads"} from {guests} {guests === 1 ? "guest" : "guests"}
            {messages.length ? ` · ${messages.length} video ${messages.length === 1 ? "message" : "messages"}` : ""}
            {stillOpen ? " · still coming in" : ""}. Tap anything to download the original.
          </p>
          {stillOpen && <GuestInvite slug={ev.slug} title={ev.title} className="guest-invite-top" />}
        </header>

        {messages.length > 0 && (
          <section className="sh-gg-sec">
            <h2 className="sh-gg-h">
              Video messages <span className="sh-gg-count">{String(messages.length).padStart(2, "0")}</span>
            </h2>
            <div className="sh-msgs">
              {messages.map((m) => (
                <figure key={m.id} className="sh-msg">
                  <video src={m.viewUrl} controls playsInline preload="metadata" />
                  <figcaption>
                    <strong>{m.guest_name || "A guest"}</strong>{" "}
                    <span>· {when(m.created_at)} · <a href={m.downloadUrl}>Download</a></span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <section className="sh-gg-sec">
          <h2 className="sh-gg-h">
            Photos &amp; videos{" "}
            {media.length > 0 && <span className="sh-gg-count">{String(media.length).padStart(2, "0")}</span>}
          </h2>
          {media.length === 0 && <p className="sh-empty">Nothing yet — the QR signs are working on it.</p>}
          <div className="sh-cells">
            {media.map((m) => (
              <a key={m.id} href={m.downloadUrl} className="sh-cell" title={`${m.guest_name || "A guest"} · ${when(m.created_at)}`}>
                {m.kind === "video" ? (
                  <video src={m.viewUrl} muted playsInline preload="metadata" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={m.viewUrl} alt="" loading="lazy" />
                )}
                <span className="sh-cell-name">{m.guest_name || "A guest"}{m.kind === "video" ? " · ▶" : ""}</span>
              </a>
            ))}
          </div>
        </section>
        <p className="sh-guest-foot">
          Filmed by <Link href="/">Roth Media</Link>. Keep this link private — anyone with it can see everything here.
        </p>
      </div>
    </main>
  );
}

// ── /guest/[slug]/sign : the printable QR table card. The card itself is
//    always ink on white — on screen it sits on the dark page as a proof. ──
export function GuestSignView({ ev, qr, url, big = false }) {
  return (
    <div className={"gsign sh-sign" + (big ? " gsign-big sh-sign--big" : "")}>
      <div className="sh-sign-stage">
        <div className="gsign-card">
          <div className="gsign-kick">Got a great shot?</div>
          <h1 className="gsign-title">Share your photos<br />with {ev.title.replace(/ wedding$/i, "")}</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code for ${url}`} className="gsign-qr" />
          <p className="gsign-how">Scan with your camera · pick from your camera roll · done.<br />No app. Videos and 60-second messages welcome.</p>
          <p className="gsign-url">{url.replace("https://", "")}</p>
          <p className="gsign-credit">Photos &amp; film by Roth Media</p>
        </div>
      </div>
      <p className="gsign-print no-print">
        Print this page — it&apos;s sized 4×6. <a href={`/guest/${ev.slug}/sign?big=1`}>Full-page version</a> · Press ⌘P / Ctrl+P.
      </p>
    </div>
  );
}
