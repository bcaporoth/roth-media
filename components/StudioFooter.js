import BrandMark from "./BrandMark";

export default function StudioFooter() {
  return (
    <footer className="rm-footer">
      <div className="foot-inner">
        <div className="brand">
          <BrandMark />
          Roth <em>Media</em>
        </div>
        <span>© {new Date().getFullYear()} Roth Media</span>
      </div>
    </footer>
  );
}
