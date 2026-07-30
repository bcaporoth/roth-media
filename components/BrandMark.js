export default function BrandMark({ accent = false }) {
  return (
    <svg className="brand-mark" viewBox="0 0 100 130" aria-hidden="true">
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M18 122 V8 H58 a34 34 0 0 1 12.5 65.6 L94 122 H66 L46.5 76 H40 V122 Z M40 30 V56 h16 a13 13 0 0 0 0 -26 Z"
      />
      {accent && <path fill="#b06a4f" d="M40 30 L62 43 L40 56 Z" />}
    </svg>
  );
}
