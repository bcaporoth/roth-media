// Contact + social identity — one place for the footer, the schema, and
// the promo page. Plain module so server pages can import it.
export const EMAIL = "brandon@rothventures.co";
export const SOCIAL = [
  { id: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@coachcaporoth" },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/caporoth" },
  { id: "facebook", label: "Facebook", url: "https://www.facebook.com/profile.php?id=61595016275555" }, // the Roth Media Page (made 2026-10-05)
];
export const SAME_AS = SOCIAL.map((s) => s.url);

// Booking + reviews. REVIEW_URL stays empty until the Google Business
// Profile is verified — everything that uses it hides when it's blank.
export const CALENDLY = "https://calendly.com/b-caporoth/30min";
export const REVIEW_URL = "https://g.page/r/CXjb0VR-ZPb3EBM/review";
// The public listing, where the reviews are read.
export const GOOGLE_PAGE_URL = "https://g.page/r/CXjb0VR-ZPb3EBM";

// Public-facing phone (tap-to-call on the business card) and the Google
// calendars shown in Studio admin → Calendar. The embed only shows events
// to someone signed into a Google account that can see these calendars.
export const PHONE = "845-549-4425";
export const OWNER_NAME = "Brandon Roth";
export const GOOGLE_CALENDARS = ["b.caporoth@gmail.com", "brandon@rothventures.co"];
// Where the business-card QR points; ?src=qr is how Stats counts scans.
export const CARD_QR_URL = "https://rothmediaco.com/card?src=qr";
