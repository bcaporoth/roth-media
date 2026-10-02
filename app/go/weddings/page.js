import AdLeadForm from "../../../components/AdLeadForm";
import DealPrice from "../../../components/DealPrice";
import { PACKAGES } from "../../../lib/packages";
import { videoUrl } from "../../../lib/media";

export const metadata = { title: { absolute: "Wedding photo & film — Roth Media" }, description: "Wedding photography and films across the Twin Tiers. Real prices. Check your date.", robots: { index: false } };
export const revalidate = 3600;

// Where wedding ads land: one video, real prices, one short form.
export default function WeddingAdPage() {
  const [photo, film] = PACKAGES.wedding;
  return (
    <main className="golead">
      <div className="golead-inner">
        <div className="golead-brand">Roth Media · Twin Tiers weddings</div>
        <h1>Your wedding, filmed the way it felt.</h1>
        <p className="golead-sub">Photo and film for Waverly, Sayre, Athens, Elmira, and Corning. Your real vows, the speeches, the dance floor. Real prices up front.</p>
        <video className="golead-video" src={videoUrl("/nolan-kennedy-wedding-hero.mp4")} poster="/nolan-kennedy-cover.png" autoPlay muted loop playsInline />
        <div className="golead-prices">
          <div><span>{photo.name}</span><strong><DealPrice price={photo.price} /></strong></div>
          <div><span>{film.name}</span><strong><DealPrice price={film.price} /></strong></div>
        </div>
        <p className="golead-proof">★★★★★ 5.0 on Google · sneak peek within 48 hours</p>
        <AdLeadForm category="wedding" label="weddings" cta="Check my date" extra={{ label: "Wedding date", placeholder: "June 14, 2027" }} />
      </div>
    </main>
  );
}
