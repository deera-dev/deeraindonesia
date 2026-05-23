/**
 * ThemeToggle.jsx
 * Scenic mountain toggle switch untuk light/dark mode.
 *
 * Light mode : thumb kanan, langit kuning-emas, matahari di kiri
 * Dark mode  : thumb kiri, langit biru-malam, bintang + bulan sabit
 *
 * Props:
 *   isDark    : boolean
 *   onToggle  : () => void
 */

const W = 60;   // lebar toggle (px)
const H = 30;   // tinggi toggle (px)
const TR = 12;  // jari-jari thumb
const TP = 3;   // padding thumb dari tepi

export default function ThemeToggle({ isDark, onToggle }) {
  // posisi tengah thumb: kanan (siang) ↔ kiri (malam)
  const thumbCX = isDark ? TR + TP : W - TR - TP;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={isDark ? "Mode terang" : "Mode gelap"}
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      style={{
        width: W,
        height: H,
        padding: 0,
        border: "none",
        borderRadius: H / 2,
        cursor: "pointer",
        overflow: "hidden",
        display: "block",
        flexShrink: 0,
        background: "transparent",
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={{ display: "block" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Clip ke bentuk pill */}
          <clipPath id="tt-pill">
            <rect x="0" y="0" width={W} height={H} rx={H / 2} ry={H / 2} />
          </clipPath>

          {/* Mask bulan sabit: lingkaran penuh dikurangi lingkaran offset */}
          <mask id="tt-moon">
            <circle cx="47" cy="11" r="5.5" fill="white" />
            <circle cx="49.5" cy="8.8" r="4.6" fill="black" />
          </mask>

          {/* Shadow halus untuk thumb */}
          <filter id="tt-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.22" />
          </filter>
        </defs>

        <g clipPath="url(#tt-pill)">

          {/* ── Langit ── */}
          <rect
            x="0" y="0" width={W} height={H}
            fill={isDark ? "#171136" : "#B87E30"}
            style={{ transition: "fill 0.5s ease" }}
          />

          {/* ── Siang: matahari ── */}
          <circle
            cx="13" cy="12" r="5.5"
            fill="#F5E060"
            style={{ opacity: isDark ? 0 : 1, transition: "opacity 0.35s ease" }}
          />
          {/* halo matahari (glow lebih lembut) */}
          <circle
            cx="13" cy="12" r="8"
            fill="#F5E060"
            fillOpacity="0.18"
            style={{ opacity: isDark ? 0 : 1, transition: "opacity 0.35s ease" }}
          />

          {/* ── Malam: bintang ── */}
          {[
            [33, 7,  0.9],
            [38, 11, 0.7],
            [43, 5,  1.0],
            [50, 15, 0.7],
            [46, 9,  0.8],
            [36, 15, 0.6],
          ].map(([x, y, r], i) => (
            <circle
              key={i} cx={x} cy={y} r={r}
              fill="white"
              style={{ opacity: isDark ? 0.9 : 0, transition: "opacity 0.45s ease" }}
            />
          ))}

          {/* ── Malam: bulan sabit ── */}
          <circle
            cx="47" cy="11" r="5.5"
            fill="white"
            mask="url(#tt-moon)"
            style={{ opacity: isDark ? 1 : 0, transition: "opacity 0.35s ease" }}
          />

          {/* ── Gunung layer 1 (belakang, paling terang) ── */}
          <path
            d="M0,22 L7,13 L14,18 L21,10 L27,15 L33,9 L39,14 L45,8 L51,13 L57,9 L60,12 L60,30 L0,30 Z"
            fill={isDark ? "#241756" : "#453880"}
            style={{ transition: "fill 0.5s ease" }}
          />

          {/* ── Gunung layer 2 (tengah) ── */}
          <path
            d="M0,26 L5,20 L11,24 L17,17 L23,22 L29,15 L35,21 L41,14 L47,20 L53,13 L59,18 L60,17 L60,30 L0,30 Z"
            fill={isDark ? "#322070" : "#564898"}
            style={{ transition: "fill 0.5s ease" }}
          />

          {/* ── Gunung layer 3 (depan, paling gelap) ── */}
          <path
            d="M0,30 L4,24 L9,28 L15,21 L22,27 L28,20 L34,26 L40,18 L46,25 L52,17 L57,23 L60,20 L60,30 Z"
            fill={isDark ? "#3E2880" : "#6658A8"}
            style={{ transition: "fill 0.5s ease" }}
          />

          {/* ── Thumb (lingkaran putih) ── */}
          {/* cx dianimasikan via CSS — didukung Chrome/FF/Safari modern */}
          <circle
            cx={thumbCX}
            cy={H / 2}
            r={TR}
            fill="white"
            filter="url(#tt-shadow)"
            style={{
              transition: "cx 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />

        </g>
      </svg>
    </button>
  );
}
