/**
 * shared/TrendChart.jsx — grafik trend berbasis Recharts (requirement
 * change 2026-07, menggantikan implementasi SVG murni sebelumnya).
 *
 * ── Kenapa Recharts ──────────────────────────────────────────────────────
 * Dipilih sesuai prioritas eksplisit Denny. Alasan teknis: React-native
 * (bukan wrapper canvas), composable (ComposedChart + Line + dual YAxis
 * cocok untuk kombinasi Rupiah + qty dalam 1 chart tanpa kerja ekstra),
 * `ResponsiveContainer` bawaan menangani resize/mobile tanpa listener
 * manual, `Legend` mendukung `onClick` bawaan (dipakai di sini untuk
 * toggle show/hide per series — persis requirement R5), aktif
 * maintained, dan ukurannya jauh lebih ringan dari alternatif seperti
 * Victory/Nivo untuk kebutuhan line/area/bar sederhana ini.
 *
 * Komponen ini TETAP hanya presentasi — TIDAK ada SUM/AVG/GROUP BY di
 * sini, seluruh angka sudah final dari RPC (dilewatkan lewat props
 * `data`/`series` oleh pemanggil).
 *
 * Props:
 *   data    Array<object>  — 1 object per titik x, WAJIB punya field
 *                            `xKey` (default "label") + 1 field per
 *                            series.dataKey.
 *   series  [{ dataKey, label, color, yAxisId?: "left"|"right" (default
 *            "left"), formatter?: (value) => string }]
 *            — yAxisId dipakai untuk dual-axis (mis. Revenue/Profit di
 *              kiri skala Rupiah, Qty di kanan skala angka biasa) supaya
 *              1 chart bisa menggabungkan skala yang jauh berbeda tanpa
 *              salah satu series "mendatar" secara visual.
 *   xKey    string (default "label")
 *   height  number (px, default 260)
 *
 * Interaksi:
 *   - Hover (desktop) / tap (mobile) → Tooltip custom, baris per series
 *     yang sedang tidak di-hide, pakai `formatter` masing-masing kalau ada.
 *   - Klik item Legend → toggle sembunyikan/tampilkan series itu (state
 *     lokal `hidden`, TIDAK persist — reset tiap kali komponen remount,
 *     sesuai instruksi "tidak perlu pinch/zoom" — cukup show/hide dasar).
 *   - Animasi transisi bawaan Recharts (`isAnimationActive`, durasi 400ms)
 *     untuk kesan halus saat data/granularity berubah.
 */
import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function CustomTooltip({ active, payload, label, series, hidden }) {
  if (!active || !payload || payload.length === 0) return null;
  const visibleSeries = series.filter((s) => !hidden.has(s.dataKey));
  return (
    <div className="bg-skin-card border border-skin-bdr px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-skin-text mb-1.5">{label}</p>
      <div className="space-y-1">
        {visibleSeries.map((s) => {
          const item = payload.find((p) => p.dataKey === s.dataKey);
          if (!item) return null;
          const text = s.formatter ? s.formatter(item.value) : item.value;
          return (
            <p key={s.dataKey} className="flex items-center gap-1.5 text-[11px] text-skin-text3">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span>{s.label}:</span>
              <span className="font-semibold text-skin-text2">{text}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
}

export default function TrendChart({ data = [], series = [], xKey = "label", height = 260 }) {
  const [hidden, setHidden] = useState(() => new Set());

  const hasData = data.length > 0 && series.length > 0;
  if (!hasData) {
    return <p className="text-sm text-skin-text3 text-center py-8">Belum ada data untuk periode ini.</p>;
  }

  function toggle(dataKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  }

  const hasLeft = series.some((s) => (s.yAxisId ?? "left") === "left");
  const hasRight = series.some((s) => s.yAxisId === "right");

  return (
    <div className="w-full text-skin-text3" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 10, fill: "currentColor" }}
            stroke="currentColor"
            strokeOpacity={0.3}
            tickLine={false}
          />
          {hasLeft && (
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: "currentColor" }}
              stroke="currentColor"
              strokeOpacity={0.3}
              tickLine={false}
              width={48}
            />
          )}
          {hasRight && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "currentColor" }}
              stroke="currentColor"
              strokeOpacity={0.3}
              tickLine={false}
              width={40}
            />
          )}
          <Tooltip content={<CustomTooltip series={series} hidden={hidden} />} cursor={{ strokeOpacity: 0.2 }} />
          <Legend
            onClick={(e) => toggle(e.dataKey)}
            wrapperStyle={{ fontSize: 11, cursor: "pointer", paddingTop: 8 }}
            formatter={(value, entry) => (
              <span
                style={{
                  color: hidden.has(entry.dataKey) ? "var(--skin-text4, #9CA3AF)" : "var(--skin-text3)",
                  textDecoration: hidden.has(entry.dataKey) ? "line-through" : "none",
                }}
              >
                {value}
              </span>
            )}
          />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              yAxisId={s.yAxisId ?? "left"}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              hide={hidden.has(s.dataKey)}
              isAnimationActive
              animationDuration={400}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
