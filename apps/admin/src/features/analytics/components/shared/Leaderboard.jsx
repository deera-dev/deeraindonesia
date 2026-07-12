/**
 * shared/Leaderboard.jsx — daftar ranking generik (baris: nomor urut +
 * label + value), dipakai berulang di tab Products (Leaderboard/Harga/
 * Movement/Inventory), tab Markets (MarketDetailPanel via Produk Terlaris),
 * dan tab Customers (Phase 4) — ANALYTICS_ARCHITECTURE_PLAN.md §6 menyebut
 * `LeaderboardTable` sebagai komponen reusable lintas-tab, ini
 * implementasinya.
 *
 * TIDAK ADA sorting/filtering/agregasi di sini — `items` HARUS sudah dalam
 * urutan final dari RPC, komponen ini murni `.map()` untuk render.
 *
 * ── labelKey/mono (ditambahkan Phase 4) ─────────────────────────────────
 * Default TETAP `labelKey="kode"` + `mono=true` — SAMA PERSIS perilaku
 * lama untuk seluruh caller existing (Products/Markets), yang menampilkan
 * kode produk ("D-07-OSK") dalam font monospace. Tab Customers (Phase 4)
 * memanggil dengan `labelKey="nama"` + `mono={false}` karena identitas
 * customer adalah NAMA (bukan kode — pelanggan tidak punya kode, lihat
 * catatan standar identitas di CustomersTab.jsx), dan nama orang TIDAK
 * masuk akal ditampilkan monospace seperti kode produk.
 *
 * Desain list (bukan card, bukan table horizontal) dipilih karena data di
 * sini berbentuk {label, value} yang pendek — baris list lebar-penuh jauh
 * lebih hemat ruang & mudah dibaca di mobile dibanding grid kartu, dan
 * tidak butuh scroll horizontal seperti table konvensional. Tidak ada
 * truncate/ellipsis — label dibiarkan membungkus (break-words) kalau
 * perlu.
 *
 * Phase 5 (Dashboard Polish, perf ringan): dibungkus `React.memo`. CATATAN
 * JUJUR: manfaatnya TIDAK merata di semua caller — kalau pemanggil
 * mengirim `valueFormatter`/`valueClassName` sebagai arrow function INLINE
 * (dibuat ulang setiap render, mis. beberapa pemanggilan di CustomersTab),
 * memo TETAP re-render karena identitas prop function berubah tiap kali.
 * Untuk pemanggilan yang memakai formatter konstan level-modul (mis.
 * `fmtQtyPcs`/`fmtRpShort` di ProductsTab), memo efektif mencegah
 * re-render saat parent re-render tapi `items`-nya sendiri tidak berubah.
 * Tidak ada perubahan visual/behavior di kedua kasus.
 */
import { memo } from "react";

function Leaderboard({
  items = [],
  labelKey = "kode",
  valueFormatter = (v) => v,
  emptyMessage = "Belum ada data.",
  valueClassName,
  mono = true,
}) {
  if (!items.length) {
    return <p className="text-sm text-skin-text3 text-center py-5">{emptyMessage}</p>;
  }

  return (
    <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
      {items.map((item, i) => (
        <div key={`${item[labelKey] ?? item.pelangganId ?? i}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-skin-page text-skin-text3 text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className={`text-sm text-skin-text break-words ${mono ? "font-mono" : "font-semibold"}`}>
              {item[labelKey]}
            </span>
          </div>
          <span
            className={`flex-shrink-0 text-sm font-bold break-words text-right ${
              valueClassName ? valueClassName(item.value) : "text-[#CAB170]"
            }`}
          >
            {valueFormatter(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default memo(Leaderboard);
