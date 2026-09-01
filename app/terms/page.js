import LegalPage from "../../components/LegalPage";

export const metadata = {
  title: "Terms",
  description: "The plain-English terms for quotes, bookings, galleries, and the giveaway at rothmediaco.com.",
};

export default function TermsPage() {
  return (
    <LegalPage kick="Terms" title="The short version of how we work." updated="September 1, 2026">
      <h2>Quotes</h2>
      <p>Prices on this site are real starting prices. The instant quote is an estimate; we confirm the final number in writing before anything is booked. Prices can change, but a number we&apos;ve confirmed to you in writing is locked.</p>

      <h2>Booking</h2>
      <p>A date is held once we&apos;ve both signed the agreement and the retainer is paid. The retainer is non-refundable because it takes the date off the calendar for everyone else. Everything else — payment schedule, rescheduling, cancellation, delivery timeline — is spelled out in that agreement, and the agreement wins if it ever disagrees with this page.</p>

      <h2>Delivery and rights</h2>
      <p>Wedding films are delivered online, ready to share, within six weeks; business content within two. You get a personal license to post and share what we deliver. Business clients get a license to use their content for their own marketing, including paid ads. Roth Media keeps the copyright and may show the work in its own portfolio unless we&apos;ve agreed otherwise in writing.</p>

      <h2>Music</h2>
      <p>Music in delivered videos is licensed through Epidemic Sound for the delivered video. The license does not cover pulling the track out and using it on its own.</p>

      <h2>Client galleries</h2>
      <p>Galleries are private. Share the link and password with whoever you like — that&apos;s what they&apos;re for — but the gallery stays yours, and we&apos;ll take it down whenever you ask.</p>

      <h2>Giveaway</h2>
      <p>The rules for any giveaway are on the giveaway page itself. No purchase necessary; entering doesn&apos;t obligate you to anything.</p>

      <h2>Sales tax</h2>
      <p>Where state law requires it, sales tax is added to the invoice and shown as its own line.</p>

      <h2>The legal bit</h2>
      <p>Roth Media is operated by Roth Ventures NY LLC, New York. If something goes wrong on our end, our liability is capped at what you paid us. These terms are governed by New York law.</p>
    </LegalPage>
  );
}
