import LegalPage from "../../components/LegalPage";
import { CALENDLY, PHONE } from "../../lib/site";

export const metadata = {
  title: "Welcome — what to expect",
  description: "What working with Roth Media looks like, start to finish.",
  robots: { index: false },
};

// The Welcome Packet. Brandon sends this link himself once someone books
// (?for=wedding|business|portraits tailors the lists; family still works).
const NEED = {
  wedding: ["Your day-of timeline, as soon as you have one", "Your vendor list — planner, photographer or videographer, DJ", "The family shot list and the three moments you can't miss", "One point of contact for the day who isn't you two"],
  business: ["Your logo and brand colors", "What you want to promote — an offer, a dish, a service", "Any must-have shots, and anyone who'd rather not be on camera", "One point of contact for shoot day"],
  family: ["Who's in the photos (and the kids' ages, if any)", "A couple of location ideas, or I'll suggest some", "What you're wearing, roughly — I'll help you coordinate", "Any must-have groupings"],
};
const WHEN = {
  wedding: ["Sneak peek: within 48 hours", "Photo gallery: within 4 weeks", "Wedding film: within 6 weeks"],
  business: ["Sneak peek: within 48 hours", "Finished content: within 2 weeks", "One round of revisions included"],
  family: ["Sneak peeks: within 48 hours", "Full gallery: within 4 weeks", "A year of access in your client account, unlimited downloads"],
};

// One real photo behind the title, matched to what they booked.
const PHOTO = {
  wedding: { src: "/photos/25-wedding-the-veil-took-flight.jpg", alt: "A bride and groom in a field at sunset, her veil lifted by the wind" },
  business: { src: "/photos/42-gym-coach-and-client.jpg", alt: "A coach and her client talking between sets in a gym, in black and white" },
  family: { src: "/photos/07-senior-portrait-last-light.jpg", alt: "A senior portrait outdoors in the last light of the day" },
  "": { src: "/photos/40-wedding-just-married-mid-laugh.jpg", alt: "A just-married couple walking hand in hand, mid-laugh, in black and white" },
};

export default async function WelcomePage({ searchParams }) {
  const sp = await searchParams;
  const want = sp?.for === "portraits" ? "family" : sp?.for;
  const cat = ["wedding", "business", "family"].includes(want) ? want : "";
  const tel = PHONE.replace(/\D/g, "");
  const need = cat ? NEED[cat] : ["The short questionnaire, back within 3 days", "Any must-have shots or moments", "One point of contact for shoot day"];
  const when = cat ? WHEN[cat] : ["Sneak peek: within 48 hours", "Business content: within 2 weeks", "Photo galleries: within 4 weeks", "Wedding films: within 6 weeks"];

  return (
    <LegalPage kick="Welcome" title="Here's what to expect working with me." updated="" photo={PHOTO[cat]}>
      <p>
        I&apos;m Brandon. I plan it, shoot it, and edit it myself — no handoffs, and every message you get comes from me.
        This page is the whole road from today to delivery.
      </p>

      <h2>The journey</h2>
      <ol>
        <li><strong>Hello.</strong> You reach out; you hear back from me the same day.</li>
        <li><strong>First call.</strong> Fifteen minutes. I ask about {cat === "business" ? "your business" : "your day"} and what a win looks like.</li>
        <li><strong>Your plan.</strong> A written plan and a firm price, the same day as the call.</li>
        <li><strong>Booked.</strong> {cat === "wedding" || !cat ? "Weddings hold the date with a 50% retainer; the balance is due 14 days before." : "Booking locks your date."} I send a short questionnaire so I show up knowing your story.</li>
        <li><strong>Prep.</strong> One to two weeks out we confirm the shot list{cat === "wedding" ? " and the timeline" : ""}.</li>
        <li><strong>Shoot day.</strong> I arrive early and I direct. You just show up as yourself.</li>
        <li><strong>Delivery.</strong> A sneak peek first, then everything in your own private online gallery — save straight to your phone.</li>
        <li><strong>Give $100, get $100.</strong> Once you&apos;ve booked you get a friend code. A friend books a wedding or a business package with it, they get $100 off, and you get $100 back.</li>
      </ol>

      <h2>When you&apos;ll get it</h2>
      <ul>{when.map((w) => <li key={w}>{w}</li>)}</ul>

      <h2>What I need from you</h2>
      <ul>{need.map((n) => <li key={n}>{n}</li>)}</ul>

      <h2>Three promises</h2>
      <ol>
        <li>You&apos;ll always know what happens next and when.</li>
        <li>You&apos;ll never chase me for an update.</li>
        <li>If something changes, you hear it from me first.</li>
      </ol>

      <h2>How to reach me</h2>
      <p>
        Text or call <a href={`sms:+1${tel}`}>{PHONE}</a> — I reply the same day, Monday through Saturday.
        Want to talk something through? <a href={CALENDLY} target="_blank" rel="noopener noreferrer">Grab a 15-minute call</a>.
        The fine print lives on the <a href="/terms">terms</a> page.
      </p>
    </LegalPage>
  );
}
