"use client";

// The live brand preview (spec §3B): their name, logo, colors and fonts
// rendered as an Instagram post, a reel end card and a story, updating as
// they type. Nothing here is invented — empty spots say what goes there.

import { useEffect } from "react";
import { normHex, inkOn } from "../lib/brand-color";

const loaded = new Set();
// Loads a Google Font by name for the preview (no-op for blanks or repeats;
// a name Google doesn't know just falls back to the site font).
export function useGoogleFont(name) {
  useEffect(() => {
    const n = String(name || "").trim();
    if (!n || n.length > 60 || loaded.has(n) || !/^[\w\s-]+$/.test(n)) return;
    const t = setTimeout(() => {
      loaded.add(n);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(n).replace(/%20/g, "+")}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }, 500);
    return () => clearTimeout(t);
  }, [name]);
}

const pick = (colors, ...roles) => {
  for (const r of roles) {
    const c = colors.find((x) => x.role === r && normHex(x.hex));
    if (c) return normHex(c.hex);
  }
  return "";
};

export function brandLook(data = {}, assets = []) {
  const colors = data.visual?.colors || [];
  const bg = pick(colors, "background") || "#f4f1ea";
  const primary = pick(colors, "primary", "secondary", "accent") || "#3a3a3a";
  const accent = pick(colors, "accent", "highlight", "secondary") || primary;
  const text = pick(colors, "text") || inkOn(bg);
  const logos = assets.filter((a) => a.kind === "logo" && a.url && (/^image\//.test(a.mime || "") || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.filename || "")));
  const logo = logos.find((a) => a.label === "Main logo") || logos[0] || null;
  const icon = logos.find((a) => a.label === "Icon") || logo;
  const onPrimaryLogo = logos.find((a) => a.label === (inkOn(primary) === "#ffffff" ? "Light version" : "Dark version")) || logo;
  const f = data.visual?.fonts || {};
  return {
    name: data.business?.name || "",
    oneliner: data.business?.oneliner || "",
    link: data.business?.link || "",
    cta: data.voice?.cta || "",
    words: data.vibe?.words || [],
    bg, primary, accent, text, logo, icon, onPrimaryLogo,
    head: f.headline ? `"${f.headline}", var(--font-display), sans-serif` : "var(--font-display), sans-serif",
    body: f.body ? `"${f.body}", var(--font-body), sans-serif` : "var(--font-body), sans-serif",
    fontNames: [f.headline, f.body],
  };
}

export default function BrandPreview({ data, assets }) {
  const b = brandLook(data, assets);
  useGoogleFont(b.fontNames[0]);
  useGoogleFont(b.fontNames[1]);
  const name = b.name || "Your business name";
  const shortLink = b.link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return (
    <div className="bpv">
      <figure className="bpv-post" style={{ background: b.bg, color: b.text }}>
        <div className="bpv-post-top">
          {b.logo ? <img src={b.logo.url} alt="" className="bpv-logo" /> : <span className="bpv-logo bpv-logo--empty" style={{ borderColor: b.primary }}>Logo</span>}
        </div>
        <p className="bpv-name" style={{ fontFamily: b.head, color: b.primary === b.bg ? b.text : b.primary }}>{name}</p>
        <p className="bpv-line" style={{ fontFamily: b.body }}>{b.oneliner || "Your one-line bio shows here."}</p>
        {b.words.length > 0 && <p className="bpv-words" style={{ fontFamily: b.body }}>{b.words.map((w) => <span key={w} style={{ borderColor: b.accent }}>{w}</span>)}</p>}
        <span className="bpv-bar" style={{ background: b.accent }} />
        <figcaption>Instagram post</figcaption>
      </figure>
      <div className="bpv-tall">
        <figure className="bpv-end" style={{ background: b.primary, color: inkOn(b.primary) }}>
          {b.onPrimaryLogo ? <img src={b.onPrimaryLogo.url} alt="" className="bpv-logo bpv-logo--c" /> : null}
          <p className="bpv-name bpv-name--sm" style={{ fontFamily: b.head }}>{name}</p>
          <p className="bpv-cta" style={{ fontFamily: b.body, background: b.accent === b.primary ? inkOn(b.primary) : b.accent, color: inkOn(b.accent === b.primary ? inkOn(b.primary) : b.accent) }}>{b.cta || shortLink || "Your link"}</p>
          <figcaption>Reel end card</figcaption>
        </figure>
        <figure className="bpv-story" style={{ background: `linear-gradient(170deg, ${b.accent}, ${b.bg} 70%)`, color: b.text }}>
          <div className="bpv-story-head">
            {b.icon ? <img src={b.icon.url} alt="" className="bpv-avatar" /> : <span className="bpv-avatar" style={{ background: b.primary }} />}
            <span style={{ fontFamily: b.body }}>{name}</span>
          </div>
          <p className="bpv-name bpv-name--sm" style={{ fontFamily: b.head }}>{b.oneliner ? b.oneliner.split(/[.—–]/)[0] : name}</p>
          <span className="bpv-sticker" style={{ fontFamily: b.body }}>🔗 {shortLink || "your link"}</span>
          <figcaption>Story</figcaption>
        </figure>
      </div>
    </div>
  );
}
