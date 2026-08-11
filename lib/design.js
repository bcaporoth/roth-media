// Per-album design system: curated font pairings, light/dark mood, accent.
// Stored on galleries.design as jsonb: { font, mode, accent }.
// Shared by the Studio Admin panel and the public share page.

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

export const DESIGN_ACCENTS = {
  clay: { label: "Clay", main: "#b06a4f", soft: "#cd9075" },
  sage: { label: "Sage", main: "#71835f", soft: "#96a687" },
  gold: { label: "Gold", main: "#b08d3f", soft: "#cbb06a" },
  wine: { label: "Wine", main: "#8d4a43", soft: "#b0766e" },
};

export function resolveDesign(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  return {
    font: DESIGN_FONTS[d.font] ? d.font : "signature",
    mode: DESIGN_MODES[d.mode] ? d.mode : "light",
    accent: DESIGN_ACCENTS[d.accent] ? d.accent : "clay",
  };
}

// CSS custom-property overrides for the album wrapper (only non-defaults).
export function designSkin(raw) {
  const design = resolveDesign(raw);
  const font = DESIGN_FONTS[design.font];
  const accent = DESIGN_ACCENTS[design.accent];
  const style = {};
  if (font.display) {
    style["--font-display"] = font.display;
    style["--font-body"] = font.body;
  }
  if (design.accent !== "clay") {
    style["--clay"] = accent.main;
    style["--clay-soft"] = accent.soft;
  }
  return {
    design,
    style,
    fontHref: font.href,
    className: `album-skin${design.mode === "dark" ? " skin-dark" : ""}`,
  };
}
