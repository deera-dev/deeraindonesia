/**
 * shared/InsightCard.jsx — kartu untuk section "Quick Insight".
 *
 * BARU (redesign mobile-first 2026-07): dipisah dari KpiCard karena
 * kontennya secara fundamental berbeda — KpiCard menampilkan ANGKA besar
 * sebagai fokus utama, sedangkan Quick Insight menampilkan NAMA (produk/
 * pasar/customer, bisa panjang — mis. "Gamis Anggun Mewah Original") SEBAGAI
 * fokus utama, dengan satu angka pendukung (metric) di bawahnya. Memaksakan
 * nama panjang ke ukuran font sebesar KPI (text-2xl/3xl) akan terlihat
 * janggal & makin mendorong ke arah truncate — jadi dipisah komponennya,
 * bukan dipaksa satu komponen serba-guna.
 *
 * Tidak ada truncate/ellipsis/nowrap di mana pun — `primary` (nama) BEBAS
 * membungkus ke banyak baris.
 *
 * Phase 5 (Dashboard Polish, perf ringan): dibungkus `React.memo`, pola
 * sama seperti KpiCard.jsx — presentational murni, tidak ada perubahan
 * visual/behavior.
 */
import { memo } from "react";

function InsightCard({ label, primary, metric, accent }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3 sm:p-4 min-w-0 flex flex-col gap-1.5">
      <p className="text-[10px] sm:text-xs font-editorial tracking-[0.12em] sm:tracking-[0.15em] uppercase text-skin-text3 leading-[1.15] break-words">
        {label}
      </p>
      <p className="text-base sm:text-lg font-semibold text-skin-text leading-snug break-words">
        {primary}
      </p>
      {metric && (
        <p
          className={`text-sm sm:text-base font-bold leading-snug break-words ${
            accent ? "text-[#CAB170]" : "text-skin-text2"
          }`}
        >
          {metric}
        </p>
      )}
    </div>
  );
}

export default memo(InsightCard);
