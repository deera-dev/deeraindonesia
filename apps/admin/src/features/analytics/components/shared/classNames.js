/**
 * shared/classNames.js — konstanta Tailwind class yang DIULANG di banyak
 * tab (Overview/Products/Markets/MarketDetailPanel/Trends/Customers).
 *
 * Phase 5 (Dashboard Polish, "Audit consistency"): sebelum file ini ada,
 * setiap tab men-define ulang string yang PERSIS SAMA (`sectionTitleCls`,
 * `subTitleCls`, statistik label/value class untuk grid KPI 2 kolom) —
 * bukan pelanggaran fungsional (tidak ada bug), tapi pelanggaran DRY yang
 * membuat perubahan visual (mis. ukuran font) harus diulang di 6 file
 * berbeda. Modul ini SATU-SATUNYA sumber kebenaran untuk string-string
 * tsb — tab TIDAK PERLU memakai semuanya (boleh override lokal kalau
 * memang beda), tapi kalau classnya identik dengan salah satu di sini,
 * WAJIB import dari sini, bukan menulis ulang literalnya.
 *
 * File ini PURE CONSTANTS — tidak ada logic, tidak ada komponen React,
 * tidak ada I/O. Aman diimpor dari komponen mana pun tanpa efek samping.
 */

// Judul section besar (mis. "KPI Utama", "Leaderboard", "Insight").
export const sectionTitleCls =
  "font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-2.5 sm:mb-3 border-b border-skin-bdr-lt pb-2";

// Sub-judul di dalam section (mis. "Produk Terlaris", "Revenue Tertinggi").
export const subTitleCls = "text-xs font-semibold text-skin-text2 mb-2";

// Label kecil di atas angka pada grid statistik 2-4 kolom (mis. kartu
// Market Summary, KPI kecil MarketDetailPanel, kartu Ranking Customer).
export const statLabelCls = "text-[10px] tracking-[0.1em] uppercase text-skin-text3 leading-[1.15]";

// Nilai angka pada grid statistik yang sama (default abu-abu netral;
// dipakai untuk Revenue/Qty/Customer/Transaksi — Profit biasanya override
// warna gold di tempat pemanggilan karena butuh font-bold + text-[#CAB170]).
export const statValueCls = "text-sm sm:text-base font-semibold text-skin-text2 mt-1 break-words";
