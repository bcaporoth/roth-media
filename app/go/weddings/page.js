import "../../theme/weddings.css";
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
    <main className="cx-page cx-page--hero wd-page wd-go">
      <div className="wd-go-grid">
        <div className="wd-go-media">
          <video src={videoUrl("/matt-april-loop.mp4")} poster="/matt-april-cover.jpg" autoPlay muted loop playsInline />
        </div>
        <div className="wd-go-body">
          <p className="cx-kick">Roth Media · Twin Tiers weddings</p>
          <h1 className="cx-h1 wd-go-h1">Your wedding, filmed the way it felt.</h1>
          <p className="cx-lede">Photo and film for Waverly, Sayre, Athens, Elmira, and Corning. Your real vows, the speeches, the dance floor. Real prices up front.</p>
          <ul className="cx-rows wd-go-prices">
            <li className="cx-row"><span className="cx-row-name">{photo.name}</span><strong className="cx-row-price"><DealPrice price={photo.price} /></strong></li>
            <li className="cx-row"><span className="cx-row-name">{film.name}</span><strong className="cx-row-price"><DealPrice price={film.price} /></strong></li>
          </ul>
          <p className="wd-go-proof">★★★★★ 5.0 on Google · sneak peek within 48 hours</p>
          <AdLeadForm category="wedding" label="weddings" cta="Check my date" extra={{ label: "Wedding date", placeholder: "June 14, 2027" }} />
        </div>
      </div>
    </main>
  );
}
