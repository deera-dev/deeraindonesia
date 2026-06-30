/**
 * LaporanPasar.jsx
 *
 * Laporan harian hari pasar — Hari Ini + History pasar sebelumnya.
 * Props:
 *   sales — array transaksi dari Laporan.jsx
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { toPng } from "html-to-image";
import { getTodayInfo } from "@deera/shared/lib/marketDay";
import { formatHarga } from "@deera/shared/lib/constants";
import { supabase } from "@deera/shared/lib/supabase";
import { effectiveQty, itemProfit } from "../../../shared/lib/salesUtils";

// ── Kalkulasi ringkasan dari array sales ─────────────────────────────────────
function calcRingkasan(rows, loc) {
  const lokasiFilt = rows.filter((s) => s.location === loc && s.type !== "retur");
  const returFilt = rows.filter((s) => s.location === loc && s.type === "retur");
  const omset = lokasiFilt.reduce((s, t) => s + (t.total ?? 0), 0);
  const keuntungan = lokasiFilt.reduce(
    (s, t) => s + (t.items ?? []).reduce((ss, item) => ss + itemProfit(item), 0),
    0,
  );
  const totalRetur = returFilt.reduce((s, t) => s + (t.total ?? 0), 0);
  const marginPct = omset > 0 ? Math.round((keuntungan / omset) * 100) : 0;
  const prodMap = {};
  for (const sale of lokasiFilt) {
    for (const item of sale.items ?? []) {
      const qty = effectiveQty(item);
      if (!prodMap[item.kode]) prodMap[item.kode] = { kode: item.kode, qty: 0, omset: 0 };
      prodMap[item.kode].qty += qty;
      prodMap[item.kode].omset += qty * item.harga;
    }
  }
  const topProds = Object.values(prodMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  return { lokasiFilt, returFilt, omset, keuntungan, totalRetur, marginPct, topProds };
}

// ── StatCard helper ───────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  const accent =
    color === "gold"
      ? "text-[#CAB170]"
      : color === "green"
        ? "text-emerald-500"
        : "text-skin-text";
  return (
    <div className="bg-skin-raised border border-skin-bdr px-3 py-2.5 space-y-0.5">
      <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.1em]">
        {label}
      </p>
      <p className={"font-headline text-base leading-tight " + accent}>{value}</p>
      {sub && <p className="text-[10px] text-skin-text4">{sub}</p>}
    </div>
  );
}

export default function LaporanPasar({ sales }) {
  const reportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [mode, setMode] = useState("hari-ini"); // "hari-ini" | "history"
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const { loc, label: locLabel, day } = getTodayInfo();
  const isMarketDay = loc !== "gudang";

  const today = new Date().toISOString().split("T")[0];
  const todaySales = sales.filter((s) => (s.date ?? s.created_at?.split("T")[0]) === today);

  // Load history dari Supabase (90 hari terakhir, lokasi pasar saja)
  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("sales")
        .select("id, date, created_at, type, location, total, items, discount")
        .in("location", ["cideng", "tegalgubug"])
        .gte("date", since)
        .lt("date", today)
        .order("date", { ascending: false });
      // Group by date x location
      const grouped = {};
      for (const s of data ?? []) {
        const d = s.date ?? s.created_at?.split("T")[0];
        const key = `${d}|${s.location}`;
        if (!grouped[key]) grouped[key] = { date: d, location: s.location, rows: [] };
        grouped[key].rows.push(s);
      }
      // Keep only days with actual sales (type="sale")
      const days = Object.values(grouped)
        .filter((g) => g.rows.some((r) => r.type !== "retur"))
        .sort((a, b) => b.date.localeCompare(a.date));
      setHistory(days);
    } catch (err) {
      console.error("History load failed:", err);
    }
    setHistLoading(false);
  }, [today]);

  useEffect(() => {
    if (mode === "history") loadHistory();
  }, [mode, loadHistory]);

  const LOC_LABEL = { cideng: "Cideng", tegalgubug: "Tegalgubug" };

  function fmtDate(dateStr) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ── HISTORY VIEW ──────────────────────────────────────────────────────────
  const historyView = (
    <div className="space-y-3">
      {histLoading ? (
        <p className="text-sm text-skin-text3 text-center py-10">Memuat history...</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-skin-text4 text-center py-10">Belum ada history pasar.</p>
      ) : (
        history.map((g) => {
          const r = calcRingkasan(g.rows, g.location);
          const isOpen = expanded === `${g.date}|${g.location}`;
          return (
            <div key={`${g.date}|${g.location}`} className="bg-skin-card border border-skin-bdr">
              {/* Header row — klik untuk expand */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : `${g.date}|${g.location}`)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="font-editorial text-sm font-semibold text-skin-text">
                    {LOC_LABEL[g.location] ?? g.location}
                  </p>
                  <p className="font-editorial text-xs text-skin-text3">{fmtDate(g.date)}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-headline text-[#CAB170] text-base leading-none">
                    {formatHarga(r.omset)}
                  </p>
                  <p className="font-editorial text-[10px] text-skin-text3 mt-0.5">
                    {r.lokasiFilt.length} transaksi
                  </p>
                </div>
              </button>
              {/* Detail expanded */}
              {isOpen && (
                <div className="border-t border-skin-bdr px-4 pb-4 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard label="Omset" value={`Rp ${formatHarga(r.omset)}`} color="gold" />
                    <StatCard
                      label="Keuntungan"
                      value={r.keuntungan > 0 ? `Rp ${formatHarga(r.keuntungan)}` : "—"}
                      sub={`Margin ${r.marginPct}%`}
                      color="green"
                    />
                    <StatCard
                      label="Transaksi"
                      value={String(r.lokasiFilt.length)}
                      color="neutral"
                    />
                    <StatCard
                      label="Retur"
                      value={r.totalRetur > 0 ? `Rp ${formatHarga(r.totalRetur)}` : "—"}
                      sub={r.returFilt.length > 0 ? `${r.returFilt.length} retur` : "tidak ada"}
                      color="neutral"
                    />
                  </div>
                  {r.topProds.length > 0 && (
                    <div className="border border-skin-bdr">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-skin-text3 uppercase tracking-wide border-b border-skin-bdr">
                        Top Produk
                      </p>
                      {r.topProds.map((p, i) => (
                        <div
                          key={p.kode}
                          className="flex items-center justify-between px-3 py-2 border-b border-skin-bdr-lt last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-skin-gold/60 flex items-center justify-center text-[10px] font-bold text-[#CAB170]">
                              {i + 1}
                            </span>
                            <span className="text-xs text-skin-text">{p.kode}</span>
                          </div>
                          <span className="text-xs font-semibold text-skin-text">{p.qty} pcs</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  // ── NON-MARKET DAY ────────────────────────────────────────────────────────
  if (!isMarketDay && mode === "hari-ini") {
    return (
      <div className="p-4 space-y-4">
        {/* Toggle */}
        <div className="flex gap-1">
          {["hari-ini", "history"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 font-editorial text-xs tracking-[0.12em] uppercase border transition ${
                mode === m
                  ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                  : "border-skin-bdr text-skin-text3"
              }`}
            >
              {m === "hari-ini" ? "Hari Ini" : "History"}
            </button>
          ))}
        </div>
        {mode === "history" ? (
          historyView
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <p className="text-sm font-semibold text-skin-text3 uppercase tracking-[0.12em]">
              Bukan Hari Pasar
            </p>
            <p className="text-xs text-skin-text4 mt-1">
              Hari ini ({day}) tidak ada jadwal pasar.
            </p>
            <p className="text-xs text-skin-text4 mt-0.5">
              Pasar aktif: Senin &amp; Kamis (Cideng), Jumat (Tegalgubug)
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── HARI INI ──────────────────────────────────────────────────────────────
  const { lokasiFilt, returFilt, omset, keuntungan, totalRetur, marginPct, topProds } =
    calcRingkasan(todaySales, loc);
  const allLocSales = todaySales.filter((s) => s.location === loc);

  function buildShareText() {
    const dateStr = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const lines = [
      `Laporan Pasar ${locLabel}`,
      dateStr,
      "",
      `Omset     : Rp ${formatHarga(omset)}`,
      `Keuntungan: Rp ${formatHarga(keuntungan)} (${marginPct}%)`,
      `Transaksi : ${lokasiFilt.length}`,
    ];
    if (totalRetur > 0) lines.push(`Retur     : Rp ${formatHarga(totalRetur)}`);
    if (topProds.length > 0) {
      lines.push("", "Top produk:");
      topProds.forEach((p, i) => lines.push(`  ${i + 1}. ${p.kode} - ${p.qty} pcs`));
    }
    return lines.join("\n");
  }

  async function handleDownload() {
    if (!reportRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `laporan-pasar-${loc}-${today}.png`;
      a.click();
    } catch (err) {
      console.warn("Download failed:", err);
    }
    setDownloading(false);
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    const text = buildShareText();
    try {
      if (navigator.canShare && reportRef.current) {
        try {
          const dataUrl = await toPng(reportRef.current, {
            quality: 1,
            pixelRatio: 2,
            backgroundColor: "#ffffff",
          });
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `laporan-pasar-${loc}.png`, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Laporan Pasar ${locLabel}`, text });
            setSharing(false);
            return;
          }
        } catch {
          /* fallback */
        }
      }
      if (navigator.share) {
        await navigator.share({ title: `Laporan Pasar ${locLabel}`, text });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      }
    } catch (err) {
      if (err?.name !== "AbortError") console.warn("Share failed:", err);
    }
    setSharing(false);
  }

  const dateLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4 space-y-4">
      {/* Toggle Hari Ini / History */}
      <div className="flex gap-1">
        {["hari-ini", "history"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 font-editorial text-xs tracking-[0.12em] uppercase border transition ${
              mode === m
                ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                : "border-skin-bdr text-skin-text3"
            }`}
          >
            {m === "hari-ini" ? "Hari Ini" : "History"}
          </button>
        ))}
      </div>

      {mode === "history" ? (
        historyView
      ) : (
        <>
          {/* Judul hari pasar */}
          <div className="bg-skin-gold/40 border-2 border-[#CAB170]/60 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#CAB170]/20 flex items-center justify-center flex-shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#CAB170"
                strokeWidth="2"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 2.495a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#CAB170] uppercase tracking-[0.1em]">
                Pasar {locLabel}
              </p>
              <p className="text-xs text-skin-text3">{dateLabel}</p>
            </div>
          </div>

          {/* Tombol aksi */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || allLocSales.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-skin-bdr text-sm font-semibold text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] disabled:opacity-40 disabled:pointer-events-none transition uppercase tracking-[0.08em]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {downloading ? "Menyimpan..." : "Simpan PNG"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing || allLocSales.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-skin-bdr text-sm font-semibold text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] disabled:opacity-40 disabled:pointer-events-none transition uppercase tracking-[0.08em]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              {sharing ? "Berbagi..." : "Bagikan"}
            </button>
          </div>

          {/* Area yang di-capture untuk PNG */}
          <div ref={reportRef} className="space-y-3 bg-skin-card p-1 rounded">
            <div className="border-2 border-[#CAB170]/40 bg-[#CAB170]/5 px-4 py-2.5">
              <p className="text-xs font-bold text-[#CAB170] uppercase tracking-[0.12em]">
                Laporan Hari Pasar · {locLabel}
              </p>
              <p className="text-xs text-skin-text3 mt-0.5">{dateLabel}</p>
            </div>

            {lokasiFilt.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-skin-text4">
                  Belum ada transaksi di {locLabel} hari ini
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Omset" value={`Rp ${formatHarga(omset)}`} color="gold" />
                  <StatCard
                    label="Keuntungan"
                    value={keuntungan > 0 ? `Rp ${formatHarga(keuntungan)}` : "—"}
                    sub={`Margin ${marginPct}%`}
                    color="green"
                  />
                  <StatCard
                    label="Transaksi"
                    value={String(lokasiFilt.length)}
                    color="neutral"
                  />
                  <StatCard
                    label="Retur"
                    value={totalRetur > 0 ? `Rp ${formatHarga(totalRetur)}` : "—"}
                    sub={returFilt.length > 0 ? `${returFilt.length} retur` : "tidak ada"}
                    color="neutral"
                  />
                </div>

                {topProds.length > 0 && (
                  <div className="bg-skin-card border-2 border-skin-bdr">
                    <div className="px-4 py-2 border-b border-skin-bdr">
                      <p className="text-xs font-semibold text-skin-text3 uppercase tracking-[0.1em]">
                        Top Produk Terjual
                      </p>
                    </div>
                    <div className="divide-y divide-skin-bdr-lt">
                      {topProds.map((p, i) => (
                        <div
                          key={p.kode}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-skin-gold/60 flex items-center justify-center text-xs font-bold text-[#CAB170]">
                              {i + 1}
                            </span>
                            <span className="text-xs text-skin-text">{p.kode}</span>
                          </div>
                          <span className="text-xs font-semibold text-skin-text">
                            {p.qty} pcs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
