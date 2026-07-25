/**
 * shared/SectionPicker.jsx — pengganti tab horizontal lama (BARU, Redesign
 * UI/UX 2026-07).
 *
 * ── Kenapa tab horizontal lama diganti ────────────────────────────────────
 * Analytics sudah punya 9 halaman (Ringkasan Bisnis, Ringkasan Penjualan,
 * Produk, Pasar, Tren Penjualan, Pelanggan, Analisis Lanjutan, Persediaan,
 * Prediksi Penjualan) — 9 tombol sejajar di layar sempit PASTI tumpang
 * tindih/terpotong/perlu scroll horizontal, melanggar aturan mobile-first
 * CLAUDE.md §13 ("hindari scroll horizontal"). Instruksi eksplisit Denny:
 * "JANGAN dipaksakan tetap memakai tab horizontal seperti sekarang."
 *
 * ── Pendekatan yang dipilih: floating section picker + bottom sheet
 *    terkelompok ───────────────────────────────────────────────────────────
 * SATU tombol trigger (menampilkan nama halaman AKTIF) di header, ditekan
 * membuka <BottomSheet/> (component SHARED yang SUDAH ADA di
 * shared/components/BottomSheet.jsx — dipakai juga oleh fitur produksi-hpp,
 * TIDAK membuat modal baru dari nol) berisi SELURUH halaman dikelompokkan
 * per kategori (Penjualan / Produk & Stok / Pasar & Pelanggan / Prediksi &
 * Analisis), dengan "Ringkasan Bisnis" disematkan (pinned) paling atas
 * sebagai halaman utama. Alasan pola ini dipilih dibanding alternatif lain
 * (segmented control+dropdown, chip navigation, accordion menu) — lihat
 * laporan implementasi redesign, ringkasannya:
 *   - 1 tombol trigger = TIDAK PERNAH overflow di layar manapun, seberapa
 *     banyak pun halaman ditambahkan ke depan (skalabel).
 *   - Bottom sheet = pola yang SUDAH dikenal di app ini (dipakai fitur lain)
 *     dan secara alami nyaman satu-tangan di mobile (muncul dari bawah,
 *     target tekan besar).
 *   - Grouping kategori = mengurangi 9 pilihan datar jadi ~5 kelompok,
 *     sesuai instruksi "jangan memaksakan semua menu tampil sejajar".
 *   - Deskripsi 1 baris per halaman di dalam sheet membantu owner toko
 *     memilih tanpa perlu membuka halaman itu dulu untuk tahu isinya.
 *
 * Props:
 *   groups     [{ groupLabel: string|null, items: [{key,label,description}] }]
 *              groupLabel null = item disematkan (pinned) di atas, tanpa
 *              judul kelompok — dipakai KHUSUS utk "Ringkasan Bisnis".
 *   activeKey  key section yang sedang aktif.
 *   onSelect   (key) => void — dipanggil saat user memilih halaman baru,
 *              sheet otomatis tertutup setelahnya.
 *
 * Murni presentational — TIDAK menyentuh RPC/hook/business logic apa pun,
 * hanya menerima data section via props (pola sama dengan KpiCard/
 * Leaderboard: komponen shared di layer "modul level rendah", parent
 * (AnalyticsPage.jsx) yang menyediakan data dari constants.js).
 */
import { useState } from "react";
import BottomSheet from "../../../../shared/components/BottomSheet";

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 flex-shrink-0 text-[#CAB170]" aria-hidden="true">
      <path d="M4 10.5L8 14.5L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionRow({ item, active, onClick, pinned }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`w-full text-left flex items-start gap-3 px-3.5 py-3 border transition ${
        active
          ? "border-[#CAB170] bg-[#CAB170]/10"
          : "border-skin-bdr-lt hover:border-skin-bdr bg-skin-card"
      } ${pinned ? "mb-4" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm sm:text-base font-semibold break-words ${active ? "text-[#CAB170]" : "text-skin-text"}`}>
          {item.label}
        </p>
        {item.description && (
          <p className="text-xs text-skin-text3 leading-snug break-words mt-0.5">{item.description}</p>
        )}
      </div>
      {active && <CheckIcon />}
    </button>
  );
}

export default function SectionPicker({ groups, activeKey, onSelect }) {
  const [open, setOpen] = useState(false);

  const pinnedGroup = groups.find((g) => g.groupLabel == null);
  const labeledGroups = groups.filter((g) => g.groupLabel != null);
  const allItems = groups.flatMap((g) => g.items);
  const activeItem = allItems.find((i) => i.key === activeKey);

  function pick(key) {
    onSelect(key);
    setOpen(false);
  }

  return (
    <div className="px-4 py-2.5 md:px-8 border-t border-skin-bdr-lt">
      {/* Mobile/tablet trigger — buka BottomSheet (< md) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden w-full flex items-center justify-between gap-3 px-3.5 py-2.5 border border-skin-bdr bg-skin-card hover:border-[#CAB170] transition"
      >
        <div className="min-w-0 text-left">
          <p className="text-[10px] tracking-[0.15em] uppercase text-skin-text3">Halaman Saat Ini</p>
          <p className="text-sm sm:text-base font-semibold text-skin-text break-words">
            {activeItem?.label ?? "Pilih Halaman"}
          </p>
        </div>
        <span className="flex items-center gap-1 flex-shrink-0 text-skin-text3">
          <span className="text-[11px] tracking-[0.1em] uppercase hidden sm:inline">Ganti Halaman</span>
          <ChevronIcon />
        </span>
      </button>

      {/* Desktop — real always-visible horizontal tab bar (md+), tidak pernah
          overflow karena flex-wrap (sama seperti prinsip mobile: kalau tidak
          muat satu baris, bungkus ke baris berikutnya, bukan scroll/sheet). */}
      <div className="hidden md:flex md:flex-wrap md:gap-2">
        {pinnedGroup?.items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => pick(item.key)}
            aria-current={item.key === activeKey ? "page" : undefined}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.06em] border transition ${
              item.key === activeKey
                ? "bg-[#CAB170] text-white border-[#CAB170]"
                : "border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-skin-text2"
            }`}
          >
            {item.label}
          </button>
        ))}
        {pinnedGroup && labeledGroups.length > 0 && (
          <span className="w-px bg-skin-bdr-lt mx-1" aria-hidden="true" />
        )}
        {labeledGroups.map((g, gi) => (
          <div key={g.groupLabel} className="flex flex-wrap gap-2">
            {g.items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => pick(item.key)}
                aria-current={item.key === activeKey ? "page" : undefined}
                className={`px-3.5 py-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.06em] border transition ${
                  item.key === activeKey
                    ? "bg-[#CAB170] text-white border-[#CAB170]"
                    : "border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-skin-text2"
                }`}
              >
                {item.label}
              </button>
            ))}
            {gi < labeledGroups.length - 1 && (
              <span className="w-px bg-skin-bdr-lt mx-1" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      {open && (
        <BottomSheet title="Pilih Halaman" onClose={() => setOpen(false)}>
          {pinnedGroup && (
            <div>
              {pinnedGroup.items.map((item) => (
                <SectionRow key={item.key} item={item} active={item.key === activeKey} onClick={() => pick(item.key)} pinned />
              ))}
            </div>
          )}
          <div className="space-y-5">
            {labeledGroups.map((g) => (
              <div key={g.groupLabel}>
                <h3 className="text-[11px] font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-2">
                  {g.groupLabel}
                </h3>
                <div className="space-y-2">
                  {g.items.map((item) => (
                    <SectionRow key={item.key} item={item} active={item.key === activeKey} onClick={() => pick(item.key)} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Spacer bawah (bugfix 2026-07) — BottomSheet TIDAK dipanggil
              dengan prop `footer` di sini (beda dari HppTemplateDetailSheet/
              ConfigEditSheet yang selalu punya footer tombol aksi), jadi
              area scroll-nya (`flex-1 overflow-y-auto p-4` di
              BottomSheet.jsx) berakhir PERSIS di tepi bawah kartu — yang di
              HP bertepatan dengan home indicator/safe-area, dan secara
              visual terasa "ketutupan" Bottom Nav/Back to Top karena baris
              terakhir jadi mepet tanpa jarak napas. Spacer ini HANYA
              ditambahkan di sini (bukan di BottomSheet.jsx) supaya dua
              pemakai lain yang sudah punya footer (dan karena itu tidak
              mengalami bug ini) tidak ikut berubah. `pb-6` mengikuti skala
              spacing yang sudah dipakai di app, `env(safe-area-inset-
              bottom)` mengikuti pola yang sama dipakai di AdminBottomNav/
              FinanceBottomNav/PosBottomNav/BackToTop. */}
          <div className="pb-6" style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }} aria-hidden="true" />
        </BottomSheet>
      )}
    </div>
  );
}
