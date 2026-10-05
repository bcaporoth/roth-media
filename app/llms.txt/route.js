// /llms.txt — a plain-text description of the business for AI assistants
// and other machine readers (llmstxt.org convention). Facts only, pulled
// from the same modules the site renders from, so a price change here is
// the same price change everywhere. Re-generated hourly.
import { CITIES } from "../../lib/cities";
import { PACKAGES, ADDONS, TRAVEL, money } from "../../lib/packages";
import { EMAIL, PHONE, OWNER_NAME, GOOGLE_PAGE_URL, SOCIAL, CALENDLY } from "../../lib/site";

export const revalidate = 3600;

const SITE = "https://rothmediaco.com";

export function GET() {
  const [photo, film] = PACKAGES.wedding;
  const biz = (id) => PACKAGES.business.find((p) => p.id === id);
  const portrait = PACKAGES.family[0];
  const wAdd = (id) => ADDONS.wedding.find((a) => a.id === id);
  const bAdd = (id) => ADDONS.business.find((a) => a.id === id);
  const towns = CITIES.map((c) => `${c.name}, ${c.state}`).join("; ");

  const lines = [
    "# Roth Media",
    "",
    `> Photographer and videographer based in Waverly, NY, working across the Twin Tiers and the southern Finger Lakes (New York and Pennsylvania). Wedding photography and wedding films, brand video for local businesses, event coverage, and portraits. Owner-operated by ${OWNER_NAME}. All prices are public on the website.`,
    "",
    "## What we do",
    `- Wedding photography — ${money(photo.price)}, full day: ${photo.get[0].toLowerCase()}; sneak peek gallery within 48 hours.`,
    `- Wedding videography — ${money(film.price)}, full day: two short films (1–3 minutes each), the full ceremony and speeches with clean audio; sneak peek within 48 hours. Full delivery online within six weeks.`,
    `- Wedding add-ons: second shooter ${money(wAdd("second").price)}; guest photos & video messages (QR card on every table) ${money(wAdd("guest").price)}; engagement session free with any wedding.`,
    `- Full Content Day for businesses — ${money(biz("day").price)}: one shoot day at your business; a 45–90 second promo, 8 vertical reels, 15–30 edited photos. Delivered within two weeks, cleared for ads.`,
    `- Mini Content Day — ${money(biz("mini").price)}: 8 vertical reels and 10–20 edited photos, no promo.`,
    `- Event coverage — ${money(biz("event").price)}: up to 3 hours, a 45–90 second highlight short and 50+ edited photos.`,
    `- Business add-ons: all raw footage ${money(bAdd("raw").price)}; Facebook ads + lead generation ${money(bAdd("ads").price)}; a website built from your content ${money(bAdd("website").price)} then ${money(bAdd("website").monthly)}/month.`,
    `- Portrait session (engagement, senior, family, couples) — ${money(portrait.price)}: one hour, one location, 30+ edited photos, sneak peeks within 48 hours.`,
    "",
    "## Where we work",
    `Based in Waverly, NY (Tioga County), at the New York–Pennsylvania line. Towns with their own page: ${towns}. Also Horseheads, Big Flats, Painted Post, Bath, Hammondsport, Watkins Glen, Vestal, Johnson City, Endicott, Wyalusing, Troy, and the rest of the Twin Tiers.`,
    TRAVEL.line,
    "",
    "## How booking works",
    "- Build a quote online in about two minutes; the exact number is confirmed in writing before the shoot.",
    "- A 50% retainer holds a wedding date; the balance is due 14 days before. One free reschedule with 30 days' notice.",
    "- Payments are by card online (Stripe).",
    "- All music is licensed through Epidemic Sound; finished films are cleared for social media, websites, and ads.",
    "- Finished galleries live in a private client account for a year, with unlimited downloads.",
    "",
    "## Contact",
    `- Phone / text: ${PHONE}`,
    `- Email: ${EMAIL}`,
    `- Book a 15-minute call: ${CALENDLY}`,
    `- Google Business Profile (reviews): ${GOOGLE_PAGE_URL}`,
    ...SOCIAL.map((s) => `- ${s.label}: ${s.url}`),
    "",
    "## Key pages",
    `- Home: ${SITE}/`,
    `- Weddings (prices, films, FAQ): ${SITE}/weddings`,
    `- Open wedding dates: ${SITE}/weddings/open-dates`,
    `- Business — Content Days and events: ${SITE}/business`,
    `- Instant quote: ${SITE}/quote`,
    ...CITIES.map((c) => `- ${c.name}, ${c.state}: ${SITE}/${c.slug}`),
    `- Sitemap: ${SITE}/sitemap.xml`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
