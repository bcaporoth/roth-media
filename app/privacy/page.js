import LegalPage from "../../components/LegalPage";

export const metadata = {
  title: "Privacy Policy",
  description: "What Roth Media collects when you ask for a quote, enter a giveaway, or use a client gallery — and what we do with it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage kick="Privacy" title="What we collect, and what we do with it." updated="September 1, 2026">
      <h2>Who this covers</h2>
      <p>Roth Media is the video and photography business of Roth Ventures NY LLC, based in Waverly, New York. This policy covers rothmediaco.com, the client portal, shared galleries, and the emails and texts we send.</p>

      <h2>What we collect</h2>
      <p><strong>Quote requests.</strong> Your name, email, phone, event date and location, and the package you built. We use it to reply to you and to follow up about the job you asked about.</p>
      <p><strong>Giveaway entries.</strong> Your business name, your name, town, phone, email, social handle, and what you wrote. We use it to run the draw, contact the winner, and send entrants an offer related to the giveaway.</p>
      <p><strong>Same-night premiere sign-ups.</strong> When you scan a QR code at a wedding to watch the film, we collect your name and email so we can send you the link when it&apos;s ready, plus a few follow-up emails from Roth Media. Every one has a way to opt out.</p>
      <p><strong>Client portal.</strong> Your email and a password you choose, so only you and the people you share with can see your gallery.</p>
      <p><strong>Site analytics.</strong> We use Vercel Web Analytics, which counts page views and a handful of events (like &quot;quote sent&quot;) without cookies and without identifying you personally.</p>

      <h2>How we use it</h2>
      <p>To answer you, deliver your work, and tell you about Roth Media offers you asked to hear about. We do not sell your information, and we do not share it with anyone except the services that run the site: Vercel (hosting), Supabase (database and login), Cloudflare (file storage), Resend (email), and FormSubmit (form delivery).</p>

      <h2>Texts and email</h2>
      <p>If you give us your number or email on a form, you&apos;re okay with Roth Media contacting you about that request by text and email. Reply STOP to any text, or use the opt-out line in any email, and we&apos;ll stop.</p>

      <h2>Photos and video of you</h2>
      <p>Wedding and event footage belongs to the client who hired us and is shared through private galleries. We only use a client&apos;s footage in our own marketing with their permission (it&apos;s in the contract).</p>

      <h2>Keeping it and deleting it</h2>
      <p>We keep quote and giveaway details for up to two years, and client galleries for as long as the client wants them online. Email <a href="mailto:brandon@rothventures.co">brandon@rothventures.co</a> to see, correct, or delete what we have about you, and we&apos;ll do it within 30 days.</p>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top changes with it.</p>
    </LegalPage>
  );
}
