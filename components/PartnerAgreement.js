import { PARTNER_EXTRAS, partnerPrice } from "../lib/partners";
import { money } from "../lib/packages";

// The partner agreement as it's signed on /partner/<slug>. Changing the
// wording? Bump AGREEMENT_VERSION in lib/partners.js.
export default function PartnerAgreement({ pct, months = 3 }) {
  const event = PARTNER_EXTRAS.find((e) => e.id === "event");
  return (
    <div className="pa-text">
      <p>This agreement is between <strong>Roth Ventures NY LLC</strong> (“Roth Ventures”) and the business named in the form above (“Client”). It starts the day Client signs.</p>

      <h4>1. Partner rate</h4>
      <p>For Client’s first {months} months ({months} monthly payments), Client pays {pct}% less than Roth Ventures’ list prices on everything in the plan Client picks, and on Event Coverage ({money(partnerPrice(event.once, pct))} per event, booked when Client needs it). The partner rate replaces any other discount; discounts don’t stack.</p>
      <p>Before the {months === 3 ? "third" : `${months}th`} monthly payment, Roth Ventures and Client review together how it’s going and agree on the rate from then on. Until a new rate is agreed in writing, the partner rate continues. Roth Ventures may change it with 30 days’ written notice, and Client may cancel within that notice period.</p>

      <h4>2. Content Days</h4>
      <ul>
        <li>On the schedule of the plan Client picked, Roth Ventures films and photographs Client’s business at a date and time both agree on, and delivers what the plan lists within 14 days, with one round of revisions.</li>
        <li>If Client cancels with less than 48 hours’ notice, that shoot is used. If Roth Ventures cancels, or weather stops an outdoor shoot, it’s rescheduled at no charge. An unused shoot can move to the next month once.</li>
        <li>Raw footage is included only with that add-on.</li>
      </ul>

      <h4>3. Paying</h4>
      <ul>
        <li>Client pays online by card. The monthly plan renews automatically each month until Client cancels; one-time items (the website build) are paid at signup.</li>
        <li>Events Client books go on the same card. Roth Ventures first sends Client the amount, and charges it 3 days later. Client can question it before then. By signing, Client authorizes these charges.</li>
        <li>Client can update the card, see every payment, or cancel at rothmediaco.com/billing.</li>
      </ul>

      <h4>4. Facebook &amp; Instagram ads (if picked)</h4>
      <p>Roth Ventures builds and runs ads from Client’s content, sends the ads to a sign-up page for Client’s business, tunes the ads weekly, and keeps a live report Client can open anytime (money spent, leads, cost per lead, new members), with a summary sent each month. Client pays Meta for the ad budget directly, in Client’s own ad account, and gives Roth Ventures partner access that Client can remove anytime. Client approves every offer and price in an ad before it runs.</p>

      <h4>5. Leads go straight to Client’s team</h4>
      <ul>
        <li>Each person who fills in the sign-up page is sent to Client’s management team as they come in: name, phone, email, and which ad they came from. Where Client provides a booking link, the page also lets them book an orientation themselves.</li>
        <li>Client’s team follows up and books orientations. Roth Ventures doesn’t call, text, or email leads, and charges no fee per lead or per new member.</li>
        <li>So the report can show what the ads earn, Client’s team marks on the report page which leads joined (one tap each).</li>
      </ul>

      <h4>6. Lead and member information</h4>
      <p>Every lead and member belongs to Client. Roth Ventures keeps their details only to deliver them to Client and run the report, never shares or sells them, and deletes its copies when this agreement ends. The sign-up page tells people that Client’s business may call, text, or email them about their request.</p>

      <h4>7. Who owns the content</h4>
      <p>Client may use everything delivered, forever, to promote Client’s business: social media, ads, website, print, and email. Roth Ventures keeps the copyright and may show the work in its portfolio unless Client asks it not to feature a specific person or clip. Music is licensed through Epidemic Sound and covers the videos as delivered.</p>

      <h4>8. Changing or ending it</h4>
      <p>It runs month to month. Either side can end it, or Client can switch plans or add-ons, with 30 days’ notice by text or email. Fees for a month already started aren’t refunded. When it ends, everything delivered stays Client’s.</p>

      <h4>9. The fine print</h4>
      <ul>
        <li><strong>No guaranteed results.</strong> Ads and sales depend on things outside anyone’s control. Roth Ventures does its best work but doesn’t promise a number of leads or members.</li>
        <li><strong>Independent business.</strong> Roth Ventures is an independent contractor, not an employee, and handles its own taxes and equipment.</li>
        <li><strong>Limit.</strong> Either side’s total responsibility under this agreement is limited to what Client paid Roth Ventures in the 3 months before the issue.</li>
        <li><strong>Everything else.</strong> The terms at rothmediaco.com/terms cover anything this doesn’t; where they conflict, this agreement wins. New York law applies. Changes must be in writing and agreed by both sides.</li>
      </ul>
    </div>
  );
}
