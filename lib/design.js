// Per-album design system: curated font pairings, light/dark mood, accent.
// Stored on galleries.design as jsonb: { font, mode, accent }.
// Shared by the Studio Admin panel and the public share page.
//
// The site is the dark "Cinema" look, so an album with nothing saved is
// Cinema: house fonts, dark mood, gold labels. "Light" is still a real
// choice — it sets its own paper palette explicitly (app/theme/share.css,
// .skin-light) instead of inheriting the page colours.

export const DESIGN_FONTS = {
  signature: {
    label: "Signature",
    sub: "Syne · Manrope",
    href: null, // house fonts, already loaded via next/font
    display: null,
    body: null,
  },
  timeless: {
    label: "Timeless",
    sub: "Playfair Display · Source Sans",
    href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Source+Sans+3:wght@300;400;600&display=swap",
    display: "'Playfair Display', Georgia, serif",
    body: "'Source Sans 3', 'Helvetica Neue', Arial, sans-serif",
  },
  editorial: {
    label: "Editorial",
    sub: "Cormorant Garamond · Inter",
    href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;600&display=swap",
    display: "'Cormorant Garamond', Georgia, serif",
    body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  },
  bold: {
    label: "Bold",
    sub: "Fraunces · Work Sans",
    href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Work+Sans:wght@300;400;600&display=swap",
    display: "'Fraunces', Georgia, serif",
    body: "'Work Sans', 'Helvetica Neue', Arial, sans-serif",
  },
};

export const DESIGN_MODES = {
  light: { label: "Light" },
  dark: { label: "Dark" },
};

// main / soft: the swatches the Studio shows and the legacy --clay tokens.
// onDark / onLight: the same hue tuned to stay readable (WCAG AA) as small
// label text on the Cinema dark base and on the light paper skin.
export const DESIGN_ACCENTS = {
  clay: { label: "Clay", main: "#b06a4f", soft: "#cd9075", onDark: "#dcbd7a", onLight: "#8c4c34" },
  sage: { label: "Sage", main: "#71835f", soft: "#96a687", onDark: "#96a687", onLight: "#536443" },
  gold: { label: "Gold", main: "#b08d3f", soft: "#cbb06a", onDark: "#cbb06a", onLight: "#7a601f" },
  wine: { label: "Wine", main: "#8d4a43", soft: "#b0766e", onDark: "#c98f87", onLight: "#7e3d37" },
};

export function resolveDesign(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  return {
    font: DESIGN_FONTS[d.font] ? d.font : "signature",
    mode: DESIGN_MODES[d.mode] ? d.mode : "dark",
    accent: DESIGN_ACCENTS[d.accent] ? d.accent : "clay",
  };
}

// CSS custom-property overrides for the album wrapper.
//   className  album-skin + skin-cinema (dark, the default) | skin-light
//   style      --font-display/--font-body for a non-house pairing,
//              --skin-accent (label colour, readable in this mood),
//              --clay/--clay-soft for a non-default accent (legacy tokens)
export function designSkin(raw) {
  const design = resolveDesign(raw);
  const font = DESIGN_FONTS[design.font];
  const accent = DESIGN_ACCENTS[design.accent];
  const light = design.mode === "light";
  const style = {};
  if (font.display) {
    style["--font-display"] = font.display;
    style["--font-body"] = font.body;
  }
  style["--skin-accent"] = light ? accent.onLight : accent.onDark;
  if (design.accent !== "clay") {
    // On the dark base the deep "main" swatch is too dim to read, so the
    // legacy tokens carry the readable tone there.
    style["--clay"] = light ? accent.main : accent.onDark;
    style["--clay-soft"] = light ? accent.soft : accent.onDark;
  }
  return {
    design,
    style,
    fontHref: font.href,
    className: `album-skin ${light ? "skin-light" : "skin-cinema"}`,
  };
}
