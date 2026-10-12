// Real Google reviews, word for word (Roth Media on Google Maps, 5.0 ★).
// `quote` is the line that goes on the site; `full` is the whole review.
// Add new ones here only after they're live on Google — never paraphrase.

import { GOOGLE_PAGE_URL } from "./site";

export const GOOGLE_RATING = "5.0";
export const REVIEWS_URL = GOOGLE_PAGE_URL;

export const REVIEWS = [
  {
    id: "brady",
    name: "Brady",
    who: "a promo video for his business",
    kinds: ["business", "event"],
    quote: "He does an excellent job at getting everyone comfortable so that the end result is authentic.",
    full: "Brandon did a phenomenal job shooting a promotional video for our business. He does an excellent job at getting everyone comfortable so that the end result is authentic. We will continue to use Brandon for content within our business. He’s the best!",
  },
  {
    id: "kaitlyn",
    name: "Kaitlyn",
    who: "engagement photos",
    kinds: ["wedding", "engagement"],
    quote: "My fiancé and I can both be awkward but he made us so comfortable to get the best shots. Our friend loved our photos so much she’s going to use him for hers!",
    full: "Brandon knocked it out of the park with our engagement photos. My fiancé and I can both be awkward but he made us so comfortable to get the bests shots. Our friend loved our photos so much she’s going to use him for hers!",
  },
  {
    id: "tina",
    name: "Tina",
    who: "her daughter’s senior photos",
    kinds: ["family"],
    quote: "She was at ease and comfortable the whole time, which I think shows through in the final photos. He’s got an artist’s eye for sure!",
    full: "Brandon took my daughter’s Senior photos and he was phenomenal from beginning to end. He was thoughtful enough to bring waters and snacks in case needed throughout the session. She was at ease and comfortable the whole time which I think shown through in the final photos. We could not be happier with them! He’s got an artists eye for sure!",
  },
];

// The reviews for a page: the ones about this kind of work first, then the rest.
export function reviewsFor(kind, max = 3) {
  const hit = REVIEWS.filter((r) => r.kinds.includes(kind));
  const rest = REVIEWS.filter((r) => !r.kinds.includes(kind));
  return [...hit, ...rest].slice(0, max);
}
