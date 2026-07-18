/**
 * ProductOpnameCard.jsx — Kartu akordion satu produk di Stok Opname.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REDESIGN UX 2026-07 — instruksi eksplisit Denny: "informasi ukuran
 * redundant, informasi lokasi (gudang/cideng/tg) juga redundant, rentan
 * salah input". Sebelumnya tiap WARNA dirender sbg kartu terpisah dengan
 * label "Gudang/Cideng/TegalGubug" ditulis ULANG di setiap kartu — produk
 * dengan 5 warna berarti 15 label lokasi berulang di layar yang sama,
 * bikin mata cepat lelah scan pola berulang → risiko salah tap kolom.
 *
 * Perubahan (mockup disetujui Denny sebelum implementasi):
 *   1. Body kartu SEKARANG dikelompokkan per UKURAN (bukan per warna).
 *      Label ukuran ditulis SEKALI sbg judul grup (dulu berulang tiap
 *      baris warna).
 *   2. Label lokasi (Gudang/Cideng/TegalGubug) jadi HEADER KOLOM sebuah
 *      tabel ringkas, ditulis SEKALI per ukuran — bukan diulang di tiap
 *      baris warna. Nilai per warna tetap sejajar vertikal per kolom
 *      (pola "kartu stok"/spreadsheet yang sudah dikenal user).
 *   3. Seri Lengkap — lihat REVISI PUTARAN 2 di bawah, desainnya berubah
 *      total dari versi mockup awal.
 *   4. Mode fokus lokasi (prop `locFilter`, dikontrol dari GrandTotalStrip
 *      via StokOpnamePage) — saat aktif, tabel HANYA menampilkan 1 kolom
 *      lokasi (lebih lebar, lebih mudah ditekan), menghilangkan SAMA
 *      SEKALI risiko salah tap ke kolom lokasi lain. Sesuai realita kerja
 *      opname fisik: staf berdiri di 1 lokasi, hitung barang di situ saja.
 *   5. Input numerik: `inputMode="numeric"` + font 16px (`text-base`,
 *      BUKAN `text-sm`/14px) — mencegah iOS Safari auto-zoom saat fokus
 *      input (font <16px memicu zoom otomatis yang bikin layar "meloncat"
 *      dan rawan salah tap berikutnya).
 *   6. Setiap input tetap punya `aria-label` lengkap (lokasi + warna +
 *      ukuran) walau label visualnya cuma tampil sekali sbg header kolom
 *      — screen reader tetap dapat konteks penuh per field.
 *
 * REVISI PUTARAN 1 (2026-07, font & kontras): semua teks di body kartu
 * dinaikkan ke minimum 14px (`text-sm`), dan warna total per warna diganti
 * dari `text-skin-text4` (kontras terlalu rendah, nyaris menyatu dgn
 * background) ke `text-skin-text2` (≥4.5:1 di light & dark mode, dicek
 * manual dari packages/shared/styles/index.css). "Seri full" → "Seri
 * lengkap".
 *
 * REVISI PUTARAN 2 (2026-07, desain & penempatan Seri Lengkap): setelah
 * putaran 1, Denny masih tidak suka bentuk "Seri Lengkap G8 C0 T3" —
 * encoding huruf+angka (G/C/T) itu SENDIRI adalah "cipher" yang harus
 * dihafal/diterjemahkan, terlepas dari ukuran fontnya. User lain (bukan
 * pembuat fitur) tidak akan langsung paham "G8" artinya "Gudang: 8".
 *
 * Solusi: buang encoding huruf sama sekali. Seri Lengkap sekarang jadi
 * SATU BARIS TABEL tambahan yang memakai grid kolom PERSIS SAMA dengan
 * baris warna di bawahnya (gridColsClass yang sama) — jadi angkanya
 * otomatis "duduk" tepat di bawah header kolom GD/CD/TG yang sudah ada,
 * tanpa perlu label huruf tambahan sama sekali. Ini menghilangkan proses
 * "decode" sepenuhnya: posisi kolom SUDAH menjelaskan lokasi mana, sama
 * seperti baris warna biasa yang sudah dikenal user.
 *
 * Ditaruh SEBELUM rincian per warna (bukan sesudah, ala baris "total" di
 * struk) karena tugas utama di kartu ini bukan "cek bisa jual berapa set"
 * — itu levelnya konteks tambahan yang paling berguna DILIHAT DULUAN,
 * sebelum user menelusuri tiap warna satu-satu. Divalidasi via mockup
 * interaktif (2 opsi: atas vs bawah) — Denny pilih opsi atas.
 *
 * Ditandai visual beda dari baris warna biasa (bg-skin-gold +
 * border-skin-bdr-gold, pola "highlight" yang SUDAH dipakai di banyak
 * tempat lain di app ini — lihat WarnaSection.jsx, SizeSection.jsx,
 * TransferForm.jsx — supaya terasa konsisten, bukan komponen baru).
 * Prefix "✓" (bukan ikon library baru — app ini sudah pakai karakter
 * unicode polos spt ▲▼✏ di tempat lain, konsisten dgn itu).
 *
 * TIDAK ADA data yang dihilangkan — total per warna, seri lengkap, dan
 * breakdown per lokasi semuanya tetap ada, hanya disusun ulang & diperbesar
 * supaya tidak berulang dan tetap terbaca. Header kolaps (ringkasan
 * kode/nama/total) SENGAJA TIDAK diubah (dikonfirmasi ke Denny di ketiga
 * putaran revisi) — itu ringkasan sekilas, wajar menampilkan ulang total
 * dalam bentuk ringkas, beda dari pengulangan label di badan kartu yang
 * jadi keluhan utama.
 *
 * Props:
 *   product     — {kode, nama}
 *   rows         — baris stok_warna milik produk ini (sudah sorted)
 *   isOpen       — boolean accordion
 *   onToggle     — (kode) => void
 *   changed       — draft perubahan { [rowId]: {gudang?, cideng?, tegalgubug?} }
 *   getValue       — (row, loc) => number — nilai efektif (draft atau DB)
 *   onChangeRow     — (row, loc, val) => void
 *   locFilter        — null | "gudang" | "cideng" | "tegalgubug" — saat
 *                       terisi, tabel HANYA menampilkan kolom lokasi itu
 *                       ("mode fokus").
 */
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { LOCS, SIZE_COLORS } from "../utils";

const LOC_TEXT_CLASS = {
  gudang: "text-sky-500 dark:text-sky-400",
  cideng: "text-violet-500 dark:text-violet-400",
  tegalgubug: "text-rose-500 dark:text-rose-400",
};

const LOC_SHORT = { gudang: "GD", cideng: "CD", tegalgubug: "TG" };

export default function ProductOpnameCard({
  product,
  rows,
  isOpen,
  onToggle,
  changed,
  getValue,
  onChangeRow,
  locFilter = null,
}) {
  const hasChanges = rows.some((r) => changed[r.id]);

  const totalGudang = rows.reduce((s, r) => s + getValue(r, "gudang"), 0);
  const totalCideng = rows.reduce((s, r) => s + getValue(r, "cideng"), 0);
  const totalTegal = rows.reduce((s, r) => s + getValue(r, "tegalgubug"), 0);
  const totalStok = totalGudang + totalCideng + totalTegal;

  const bySize = {};
  for (const r of rows) {
    if (!bySize[r.size]) bySize[r.size] = 0;
    bySize[r.size] += getValue(r, "gudang") + getValue(r, "cideng") + getValue(r, "tegalgubug");
  }
  const sizes = SIZE_PRESETS.map((p) => p.size).filter((s) => bySize[s] !== undefined);

  // Baris dikelompokkan per ukuran — dipakai untuk render 1 tabel per grup
  // (lihat komentar redesign di atas).
  const rowsBySize = {};
  for (const r of rows) {
    if (!rowsBySize[r.size]) rowsBySize[r.size] = [];
    rowsBySize[r.size].push(r);
  }

  const visibleLocs = locFilter ? LOCS.filter((l) => l.key === locFilter) : LOCS;
  const gridColsClass = locFilter
    ? "grid grid-cols-[minmax(0,1fr)_92px] gap-2"
    : "grid grid-cols-[minmax(0,1fr)_52px_52px_52px] gap-1.5";

  return (
    <div className="bg-skin-card border border-skin-bdr overflow-hidden">
      {/* ── Product header (ringkasan kolaps — TIDAK diubah) ── */}
      <button
        onClick={() => onToggle(product.kode)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-skin-page transition"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-skin-text">{product.kode}</span>
            {hasChanges && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold tracking-wide uppercase">
                diubah
              </span>
            )}
          </div>
          <p className="text-xs text-skin-text3 truncate mt-0.5">{product.nama}</p>
          {rows.length > 0 && (
            <div className="flex gap-2 mt-1 flex-wrap">
              {sizes.map((size) => {
                const cls = SIZE_COLORS[size] ?? "text-skin-text3";
                return (
                  <span key={size} className={`text-xs font-black leading-none ${cls}`}>
                    {size} {bySize[size]}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <span
              className={`text-sm font-bold block ${totalStok === 0 ? "text-skin-text4" : "text-skin-text"}`}
            >
              {totalStok} pcs
            </span>
            <span className="flex items-center gap-2 justify-end mt-0.5">
              {[
                ["G", totalGudang, "text-sky-500 dark:text-sky-400"],
                ["C", totalCideng, "text-violet-500 dark:text-violet-400"],
                ["T", totalTegal, "text-rose-500 dark:text-rose-400"],
              ].map(([lbl, val, cls]) => (
                <span key={lbl} className={`text-xs font-black leading-none ${cls}`}>
                  {lbl}
                  {val}
                </span>
              ))}
            </span>
          </div>
          <span className="text-skin-text3 text-xs">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* ── Expanded: tabel per ukuran (redesign — lihat komentar atas) ──
          Semua teks di sini minimum text-sm (14px) per revisi putaran 1. */}
      {isOpen && (
        <div className="border-t border-skin-bdr divide-y divide-skin-bdr-lt">
          {rows.length === 0 ? (
            <p className="px-4 py-3 text-sm text-skin-text4 italic">
              Belum ada data stok untuk produk ini.
            </p>
          ) : (
            sizes.map((size) => {
              const sizeRows = rowsBySize[size] ?? [];
              const distinctWarna = new Set(sizeRows.map((r) => r.warna));
              const hasWarna = distinctWarna.size > 1;
              const seriLengkap = hasWarna
                ? {
                    gudang: Math.min(...sizeRows.map((r) => getValue(r, "gudang"))),
                    cideng: Math.min(...sizeRows.map((r) => getValue(r, "cideng"))),
                    tegalgubug: Math.min(...sizeRows.map((r) => getValue(r, "tegalgubug"))),
                  }
                : null;

              return (
                <div key={size} className="px-4 py-3">
                  {/* Judul grup ukuran — SEKALI per ukuran */}
                  <div className="mb-2">
                    <span className={`text-sm font-black uppercase ${SIZE_COLORS[size] ?? "text-skin-text"}`}>
                      {size}
                    </span>
                  </div>

                  {/* Header kolom lokasi — SEKALI per ukuran, bukan per warna */}
                  <div className={`${gridColsClass} pb-1.5 mb-1 border-b border-skin-bdr-lt`}>
                    <div />
                    {visibleLocs.map((loc) => (
                      <div
                        key={loc.key}
                        title={loc.label}
                        className={`text-sm font-bold uppercase tracking-wide text-center ${LOC_TEXT_CLASS[loc.key]}`}
                      >
                        {LOC_SHORT[loc.key]}
                      </div>
                    ))}
                  </div>

                  {/* Seri Lengkap — baris ringkasan sebelum rincian per warna
                      (revisi putaran 2). Grid sama persis dgn baris warna di
                      bawah, jadi angka otomatis sejajar di bawah header
                      kolom GD/CD/TG tanpa perlu label huruf tambahan. */}
                  {seriLengkap && (
                    <div
                      className={`${gridColsClass} py-2 mb-1.5 items-center bg-skin-gold border border-skin-bdr-gold`}
                    >
                      <div className="min-w-0 flex items-center gap-1.5">
                        <span className="text-sm font-medium text-skin-text">✓ Seri Lengkap</span>
                      </div>
                      {visibleLocs.map((loc) => (
                        <div
                          key={loc.key}
                          className={`text-center text-sm font-black ${LOC_TEXT_CLASS[loc.key]}`}
                        >
                          {seriLengkap[loc.key]}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Baris per warna */}
                  <div className="divide-y divide-skin-bdr-lt">
                    {sizeRows.map((row) => {
                      const isRowChanged = !!changed[row.id];
                      const total = LOCS.reduce((s, loc) => s + getValue(row, loc.key), 0);
                      const warnaLabel = row.warna && row.warna !== "_" ? row.warna : "—";
                      return (
                        <div
                          key={row.id}
                          className={`${gridColsClass} py-2 items-center ${isRowChanged ? "bg-amber-500/10" : ""}`}
                        >
                          <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm text-skin-text truncate">{warnaLabel}</span>
                            <span className="text-sm font-medium text-skin-text2 flex-shrink-0">
                              {total} pcs
                            </span>
                            {isRowChanged && (
                              <span className="text-sm px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold uppercase tracking-wide flex-shrink-0">
                                diubah
                              </span>
                            )}
                          </div>
                          {visibleLocs.map((loc) => (
                            <input
                              key={loc.key}
                              type="number"
                              inputMode="numeric"
                              min="0"
                              aria-label={`${loc.label}, warna ${warnaLabel === "—" ? "tanpa warna" : warnaLabel}, ukuran ${row.size}`}
                              value={
                                changed[row.id]?.[loc.key] !== undefined ? changed[row.id][loc.key] : ""
                              }
                              placeholder={String(row[loc.key] ?? 0)}
                              onChange={(e) => onChangeRow(row, loc.key, e.target.value)}
                              className={`w-full text-center py-2.5 px-1 text-base border focus:outline-none focus:border-[#CAB170] transition bg-skin-card text-skin-text placeholder:text-skin-text3 ${
                                isRowChanged ? "border-amber-500" : "border-skin-bdr"
                              }`}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
