// Color math for the brand palette: hex ⇄ RGB/CMYK, WCAG contrast, and the
// "colors from your logo" pull. Pure functions — the form, Studio and the
// printable brand sheet all use them.

export const HEX_RE = /^#[0-9a-f]{6}$/;

// "#ABC", "abc123", " #aabbcc " → "#aabbcc"; anything else → "".
export function normHex(v) {
  let s = String(v || "").trim().toLowerCase();
  if (!s.startsWith("#")) s = "#" + s;
  if (/^#[0-9a-f]{3}$/.test(s)) s = "#" + s.slice(1).split("").map((c) => c + c).join("");
  return HEX_RE.test(s) ? s : "";
}

export function hexToRgb(hex) {
  const h = normHex(hex);
  if (!h) return null;
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export const rgbToHex = (r, g, b) => "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("");

// Naive CMYK (no ICC profile) — a starting point for a print vendor, labelled as such.
export function hexToCmyk(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((n) => n / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 100];
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((n) => Math.round(n * 100));
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((n) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// WCAG 2 thresholds: 4.5 body text, 3 large text (18pt+, or 14pt bold).
export function contrastLabel(ratio) {
  if (ratio >= 7) return { grade: "AAA", ok: true, say: "Easy to read at any size" };
  if (ratio >= 4.5) return { grade: "AA", ok: true, say: "Readable for normal text" };
  if (ratio >= 3) return { grade: "AA large", ok: true, say: "Headlines only — too faint for small text" };
  return { grade: "Fails", ok: false, say: "Hard to read — don't put text in this pair" };
}

// Black or white, whichever reads better on this background.
export const inkOn = (hex) => (contrast(hex, "#000000") >= contrast(hex, "#ffffff") ? "#111111" : "#ffffff");

// The pairs worth checking: text on background, plus every other role on
// the background (buttons, headlines). Colors: [{ hex, role }].
export function contrastPairs(colors) {
  const list = (colors || []).filter((c) => normHex(c.hex));
  const bg = list.filter((c) => c.role === "background");
  const fg = list.filter((c) => c.role !== "background");
  const pairs = [];
  for (const b of bg) for (const f of fg) pairs.push({ fg: f, bg: b, ratio: contrast(f.hex, b.hex) });
  if (!bg.length) {
    // No background chosen yet: check text against white and against the primary.
    const text = list.find((c) => c.role === "text");
    const primary = list.find((c) => c.role === "primary");
    if (text && primary) pairs.push({ fg: text, bg: primary, ratio: contrast(text.hex, primary.hex) });
  }
  return pairs;
}

// Pull up to `max` distinct, non-background colors from raw RGBA pixels
// (a canvas getImageData().data). Buckets colors at 5 bits per channel,
// skips transparent pixels and specks, then merges buckets that look the
// same. White or black backgrounds stay in — they can be brand colors too,
// and the client only adds the ones they tap.
export function dominantColors(pixels, { max = 6 } = {}) {
  const counts = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 200) continue;
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const cur = counts.get(key);
    if (cur) { cur.n++; cur.r += r; cur.g += g; cur.b += b; } else counts.set(key, { n: 1, r, g, b });
  }
  const total = [...counts.values()].reduce((s, c) => s + c.n, 0) || 1;
  const buckets = [...counts.values()]
    .map((c) => ({ n: c.n, hex: rgbToHex(c.r / c.n, c.g / c.n, c.b / c.n) }))
    .filter((c) => c.n / total > 0.004)
    .sort((a, b) => b.n - a.n);
  const out = [];
  for (const c of buckets) {
    const rgb = hexToRgb(c.hex);
    const near = out.some((o) => {
      const p = hexToRgb(o);
      return Math.abs(p[0] - rgb[0]) + Math.abs(p[1] - rgb[1]) + Math.abs(p[2] - rgb[2]) < 60;
    });
    if (!near) out.push(c.hex);
    if (out.length >= max) break;
  }
  return out;
}
