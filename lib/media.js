// ── Where the marketing videos are served from. ──
// Videos are the heaviest thing the site hands out, and Vercel bills every
// byte of it. Cloudflare R2 egress is free, so once NEXT_PUBLIC_MEDIA_BASE
// points at a public R2 bucket, every video below is served from there and
// costs Vercel nothing. Unset, it falls back to the copies in public/ —
// so the site works either way and the switch is one env var.
//
// Public bucket only: the galleries bucket holds private client photos and
// must never be made public. See scripts/upload-site-videos.mjs.

const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE || "").replace(/\/$/, "");

// Only the big files move; posters and images are small enough to stay put.
export const VIDEOS = [
  "/hero-loop.mp4",
  "/nolan-kennedy-wedding-hero.mp4",
  "/reel.mp4",
  "/reels/bake-against-the-grain.mp4",
  "/reels/nicole-golden-zumba-promo.mp4",
  "/reels/womens-powerlifting-club.mp4",
];

export const videoUrl = (path) => `${BASE}${path}`;

export const mediaOffloaded = Boolean(BASE);
