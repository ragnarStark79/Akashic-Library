interface WhyAkashicSealLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Authentic Akashic Brand Seal Emblem.
 * Replaces the original Aardvark animal drawing with the canonical Akashic Library crest:
 * - Hand-crafted organic circular framing ring.
 * - Archival open folio crest with celestial sparkles and radiating knowledge rays.
 */
export function WhyAkashicSealLogo({
  className = '',
  width = 568,
  height = 568,
}: WhyAkashicSealLogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 568 568"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Akashic Store Brand Seal"
      role="img"
    >
      {/* Organic Hand-Drawn Circular Outer Ring */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M290.543 0C450.963 0 568 130.65 568 291.916C568 453.183 450.963 568 290.543 568C130.123 568 0 453.183 0 291.916C0 130.65 130.123 0 290.543 0ZM452.825 111.457C354.721 15.7809 195.556 13.7951 99.4655 111.457C3.37494 209.118 14.4513 357.712 112.553 453.388C210.655 549.062 375.05 566.681 471.141 469.019C567.232 371.359 550.909 207.133 452.825 111.457Z"
        fill="#000000"
      />

      {/* Central Akashic Crest: Archival Open Folio & Sanctuary Rays */}
      <g transform="translate(144, 144) scale(1.4)">
        {/* Radiating Celestial Sunburst / Knowledge Rays */}
        <path
          d="M100 20 L100 36 M100 164 L100 180 M20 100 L36 100 M164 100 L180 100 M43.4 43.4 L54.7 54.7 M145.3 145.3 L156.6 156.6 M43.4 156.6 L54.7 145.3 M145.3 54.7 L156.6 43.4"
          stroke="#000000"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Akashic Four-Point Astral Sparkles */}
        <path
          d="M100 50 Q100 70 120 70 Q100 70 100 90 Q100 70 80 70 Q100 70 100 50 Z"
          fill="#000000"
        />

        {/* Archival Open Book Folio */}
        <path
          d="M48 132 C72 120 92 124 100 138 C108 124 128 120 152 132 L152 152 C128 140 108 144 100 158 C92 144 72 140 48 152 Z"
          fill="#000000"
        />

        {/* Central Spine Pillar */}
        <rect x="97" y="138" width="6" height="24" rx="3" fill="#000000" />
      </g>
    </svg>
  );
}
