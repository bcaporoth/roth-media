// Contact + social identity — one place for the footer, the schema, and
// the promo page. Plain module so server pages can import it.
export const EMAIL = "brandon@rothventures.co";
export const SOCIAL = [
  { id: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@coachcaporoth" },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/caporoth" },
  { id: "facebook", label: "Facebook", url: "https://www.facebook.com/brandon.caporoth" },
];
export const SAME_AS = SOCIAL.map((s) => s.url);

// Booking + reviews. REVIEW_URL stays empty until the Google Business
// Profile is verified — everything that uses it hides when it's blank.
export const CALENDLY = "https://calendly.com/b-caporoth/30min";
export const REVIEW_URL = "https://g.page/r/CXjb0VR-ZPb3EBM/review";
