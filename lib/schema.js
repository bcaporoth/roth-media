// Schema.org building blocks shared by the homepage, /weddings, /business,
// and the city pages — one place for who Roth Media is, so every page tells
// search engines and AI assistants the same facts. Only things that are
// true and visible on the site go here.
import { CITIES } from "./cities";
import { PACKAGES } from "./packages";
import { EMAIL, SAME_AS, GOOGLE_PAGE_URL, OWNER_NAME } from "./site";

export const SITE = "https://rothmediaco.com";
export const BUSINESS_ID = `${SITE}/#business`;

// Every town with a landing page, plus the nearby towns each page names.
export const AREA_SERVED = Array.from(
  new Set(CITIES.flatMap((c) => [`${c.name} ${c.state}`, ...c.nearby.map((n) => `${n} ${c.state}`)])),
);

export const SERVICES = [
  "Wedding photography",
  "Wedding videography",
  "Brand video and content days for local businesses",
  "Event photography and video",
  "Portrait, senior, engagement, and family photography",
];

const offer = (p, extra = "") => ({
  "@type": "Offer",
  name: extra ? `${p.name} — ${extra}` : p.name,
  price: p.price,
  priceCurrency: "USD",
  availability: "https://schema.org/InStock",
});

export const OFFER_CATALOG = {
  "@type": "OfferCatalog",
  name: "Roth Media packages",
  itemListElement: [
    ...PACKAGES.wedding.map((p) => offer(p, "full day")),
    ...PACKAGES.business.map((p) => offer(p)),
    ...PACKAGES.family.map((p) => offer(p)),
  ],
};

// The business itself. `url` and `description` change per page; the facts don't.
export function businessLd({ url = SITE, description, areaServed = AREA_SERVED } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": ["ProfessionalService", "LocalBusiness"],
    "@id": BUSINESS_ID,
    name: "Roth Media",
    url,
    image: `${SITE}/og-card.png`,
    logo: `${SITE}/icon.svg`,
    telephone: "+1-845-549-4425",
    email: EMAIL,
    sameAs: [...SAME_AS, GOOGLE_PAGE_URL],
    hasMap: GOOGLE_PAGE_URL,
    description:
      description ||
      "Photographer and videographer based in Waverly, NY, serving the Twin Tiers and southern Finger Lakes — Sayre, Athens, Elmira, Corning, Ithaca, Owego, Towanda, and Binghamton. Wedding photography and films, brand video for local businesses, events, and portraits. Prices are public.",
    address: { "@type": "PostalAddress", addressLocality: "Waverly", addressRegion: "NY", addressCountry: "US" },
    geo: { "@type": "GeoCoordinates", latitude: 42.0106, longitude: -76.5272 },
    areaServed,
    founder: { "@type": "Person", name: OWNER_NAME, jobTitle: "Photographer & videographer" },
    knowsAbout: SERVICES,
    priceRange: "$300–$3,500",
    paymentAccepted: "Credit card, debit card",
    currenciesAccepted: "USD",
    hasOfferCatalog: OFFER_CATALOG,
  };
}

// Breadcrumbs: [{ name, path }] → BreadcrumbList.
export function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

export const faqLd = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});
