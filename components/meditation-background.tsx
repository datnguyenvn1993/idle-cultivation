// Nền sân thiền (SVG). Tách riêng + có `variant` để sau này đổi skin / mở khóa
// cảnh nền, hoặc gắn option tăng tốc tu luyện.

type Variant = "mountain";

export function MeditationBackground({ variant = "mountain" as Variant }: { variant?: Variant }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2140" />
            <stop offset="55%" stopColor="#101830" />
            <stop offset="100%" stopColor="#0b0f14" />
          </linearGradient>
          <radialGradient id="moon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fdf6d8" />
            <stop offset="60%" stopColor="#f3e6a8" />
            <stop offset="100%" stopColor="#f3e6a8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* trời đêm */}
        <rect width="300" height="300" fill="url(#sky)" />

        {/* trăng + quầng sáng */}
        <circle cx="222" cy="70" r="46" fill="url(#moon)" opacity="0.5" />
        <circle cx="222" cy="70" r="22" fill="#fbf3cf" opacity="0.85" />

        {/* sao */}
        {[
          [40, 40], [70, 66], [110, 34], [160, 54], [255, 130], [30, 96], [190, 30], [130, 70],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} fill="#dfe7ff" opacity="0.7" />
        ))}

        {/* núi xa */}
        <path d="M0 210 L60 150 L110 200 L160 140 L215 205 L300 155 L300 300 L0 300 Z" fill="#232c4d" opacity="0.85" />
        {/* núi gần */}
        <path d="M0 250 L55 205 L120 250 L175 210 L245 255 L300 220 L300 300 L0 300 Z" fill="#1a2138" />

        {/* sương */}
        <rect x="0" y="238" width="300" height="30" fill="#3a4570" opacity="0.18" />
        <rect x="0" y="262" width="300" height="24" fill="#3a4570" opacity="0.12" />
      </svg>
      {/* làm tối đáy để tôn nhân vật */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
    </div>
  );
}
