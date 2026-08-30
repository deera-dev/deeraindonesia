/**
 * TagihanShareModal.jsx
 * Satu modal gabungan untuk membagikan tagihan bahan baku (belum lunas) —
 * SATU modal dengan 4 aksi: Salin Teks, Bagikan Teks (WA), Unduh Gambar,
 * Bagikan Gambar (permintaan Denny 2026-08: "terus share imagenya dibuat 1
 * modal aja dengan share text ini, dikasih pilihan aja mau share text,
 * share image, salin text dan simpan image").
 *
 * Menggantikan ShareTagihanModal.jsx (teks only) + TagihanImageShareModal.jsx
 * (gambar per-bulan) yang sebelumnya terpisah.
 *
 * Pilih Bulan: user bisa pilih SATU bulan tertentu, BEBERAPA bulan, atau
 * SEMUA bulan sekaligus sebelum share/unduh (permintaan Denny 2026-08:
 * "saya mau juga single month, bikin pilihan aja mau single month aja mau
 * month apa, atau seluruhnya, atau beberapa" — lalu "bikin dropdown aja
 * ya" — jadi UI-nya dropdown (tombol ringkasan + panel checklist), bukan
 * grid chip). Preview teks & gambar serta semua 4 aksi HANYA mencakup
 * bulan yang dipilih (filteredGroups), bukan selalu semua `groups`.
 *
 * Props:
 * - groups  : array hasil groupTagihanPerBulan() — [{ bulan, total, items }]
 * - onClose : () => void
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtRp, fmtBulan, generateTagihanWA } from "../utils";
import TagihanShareCard from "./TagihanShareCard";

export default function TagihanShareModal({ groups, onClose }) {
  const cardRef = useRef(null);
  const dropdownRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Default: semua bulan terpilih — kasus paling umum (share semua tagihan
  // yg belum lunas), user tinggal uncheck kalau mau bulan tertentu saja.
  const [selectedBulan, setSelectedBulan] = useState(() => new Set((groups ?? []).map((g) => g.bulan)));

  // Tutup dropdown saat klik di luar panel — pola sama seperti autocomplete
  // penerima di PengirimanForm.jsx.
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const filteredGroups = useMemo(
    () => (groups ?? []).filter((g) => selectedBulan.has(g.bulan)),
    [groups, selectedBulan],
  );
  const waText = generateTagihanWA(filteredGroups).replace(/\\n/g, "\n");
  const allSelected = (groups ?? []).length > 0 && (groups ?? []).every((g) => selectedBulan.has(g.bulan));
  const nothingSelected = filteredGroups.length === 0;
  const dropdownLabel = nothingSelected
    ? "Pilih Bulan"
    : allSelected
      ? "Semua Bulan"
      : selectedBulan.size === 1
        ? fmtBulan(`${filteredGroups[0].bulan}-01`)
        : `${selectedBulan.size} Bulan Dipilih`;

  function toggleBulan(bulan) {
    setSelectedBulan((prev) => {
      const next = new Set(prev);
      if (next.has(bulan)) next.delete(bulan);
      else next.add(bulan);
      return next;
    });
  }

  function selectAllBulan() {
    setSelectedBulan(new Set((groups ?? []).map((g) => g.bulan)));
  }

  function clearAllBulan() {
    setSelectedBulan(new Set());
  }

  function copyText() {
    navigator.clipboard.writeText(waText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareText() {
    window.open("https://wa.me/?text=" + encodeURIComponent(waText), "_blank");
  }

  async function downloadImage() {
    setGenerating(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "tagihan-bahan.png";
      a.click();
    } finally {
      setGenerating(false);
    }
  }

  async function shareImage() {
    setGenerating(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "tagihan-bahan.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Tagihan Bahan Baku — Deera" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
      }
    } catch (err) {
      if (err?.name !== "AbortError") throw err;
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full h-[100dvh] md:h-auto max-w-lg md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">Bagikan Tagihan</h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Pilih bulan — dropdown, satu/beberapa/semua bulan */}
          <div ref={dropdownRef} className="relative">
            <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3 mb-2">
              Pilih Bulan
            </p>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-skin-page border border-skin-bdr text-sm text-skin-text hover:border-[#CAB170] transition"
            >
              <span>{dropdownLabel}</span>
              <span className="text-skin-text3 text-xs">{dropdownOpen ? "▴" : "▾"}</span>
            </button>

            {dropdownOpen && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-skin-card border border-skin-bdr shadow-xl max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={allSelected ? clearAllBulan : selectAllBulan}
                  className="w-full text-left px-3 py-2 text-[11px] font-editorial tracking-[0.08em] uppercase text-[#CAB170] hover:bg-skin-page border-b border-skin-bdr-lt"
                >
                  {allSelected ? "Batal Pilih Semua" : "Pilih Semua"}
                </button>
                {(groups ?? []).map((g) => {
                  const isSelected = selectedBulan.has(g.bulan);
                  return (
                    <label
                      key={g.bulan}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-skin-text hover:bg-skin-page cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBulan(g.bulan)}
                        className="accent-[#CAB170]"
                      />
                      <span className="flex-1">{fmtBulan(`${g.bulan}-01`)}</span>
                      <span className="text-skin-text3 text-xs">{fmtRp(g.total)}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {nothingSelected ? (
            <p className="text-center text-sm text-skin-text4 py-8">Pilih minimal satu bulan.</p>
          ) : (
            <>
              {/* Preview gambar */}
              <div>
                <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3 mb-2">
                  Preview Gambar
                </p>
                <div className="flex justify-center">
                  <TagihanShareCard ref={cardRef} groups={filteredGroups} />
                </div>
              </div>

              {/* Preview teks */}
              <div>
                <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3 mb-2">
                  Preview Teks WhatsApp
                </p>
                <pre className="bg-skin-raised border border-skin-bdr px-3 py-3 text-xs text-skin-text font-mono whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                  {waText}
                </pre>
              </div>
            </>
          )}

          {/* 4 aksi: salin teks / bagikan teks / unduh gambar / bagikan gambar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={nothingSelected}
              onClick={copyText}
              className={`py-3 font-editorial text-xs tracking-[0.1em] uppercase border-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${copied ? "border-emerald-500 text-emerald-500" : "border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170]"}`}
            >
              {copied ? "✓ Disalin!" : "Salin Teks"}
            </button>
            <button
              disabled={nothingSelected}
              onClick={shareText}
              className="py-3 font-editorial text-xs tracking-[0.1em] uppercase bg-[#25D366] hover:bg-[#1eb558] text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Bagikan Teks
            </button>
            <button
              disabled={nothingSelected || generating}
              onClick={downloadImage}
              className="py-3 font-editorial text-xs tracking-[0.1em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? "Memproses..." : "Unduh Gambar"}
            </button>
            <button
              disabled={nothingSelected || generating}
              onClick={shareImage}
              className="py-3 font-editorial text-xs tracking-[0.1em] uppercase bg-[#CAB170] hover:bg-[#A8925A] text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Bagikan Gambar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
