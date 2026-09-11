/**
 * ProductDetailModal.jsx
 * Modal detail produk di Admin — fullscreen di mobile, centered di desktop.
 *
 * REDESIGN 2026-09 (permintaan Denny: "ini kan udah semakin banyak ya,
 * saya rasa dengan tampilan seperti ini UX nya kurang bagus dan kurang
 * efektif ... adakah cara UX nya terlihat lebih clean"). Perubahan dari
 * versi sebelumnya (yang cuma accordion generik per seksi):
 *   1. "Ukuran & Harga" tidak lagi seksi accordion sendiri — digabung jadi
 *      satu baris ringkas di bawah nama/bahan/HPP (biasanya cuma 1-2
 *      varian, tidak butuh accordion terpisah).
 *   2. Baris ringkasan cepat (StatCard: Stok / Terjual / Produksi) di atas
 *      semua accordion — jawab pertanyaan paling umum TANPA perlu buka
 *      apa pun sama sekali.
 *   3. "Stok" dan "Riwayat Penjualan" DIGABUNG jadi satu seksi "Stok &
 *      Penjualan" — satu tabel per lokasi dengan kolom Stok & Terjual
 *      berdampingan (bukan 2 daftar terpisah yang menyebut nama lokasi
 *      dua kali). Breakdown per-UKURAN (utk produk multi-size) tetap ada,
 *      diletakkan di atas tabel per-lokasi ini (dimensinya beda: per
 *      ukuran, bukan per lokasi).
 *   4. Setiap baris lokasi (Gudang/Cideng/Tegalgubug) di tabel itu punya
 *      accordion SENDIRI (permintaan Denny: "saya mau di tiap pasar ada
 *      accordionnya, bukan di total terjual aja") — diklik menampilkan
 *      transaksi & nama pembeli KHUSUS lokasi itu. Baris "Total" tetap
 *      ada & tetap bisa diklik (semua lokasi digabung) utk yang ingin
 *      lihat daftar lengkap tanpa filter lokasi.
 * Dipilih dari 3 varian mockup yang diperlihatkan ke Denny (gabung
 * Stok+Penjualan / tetap terpisah tapi grid horizontal / navigasi tab) —
 * Denny pilih varian gabung ini.
 *
 * Props:
 * - product  : objek produk
 * - stok     : { gudang, cideng, tegalgubug, sizes? }
 * - hasStok  : boolean — apakah produk ini PERNAH punya baris stok_warna
 *              (stok opname), lihat catatan sama di ProductCard.jsx. Default
 *              true supaya caller lama yang belum pass prop ini tidak berubah
 *              perilakunya.
 * - onClose  : () => void
 * - onEdit   : () => void
 */
import { useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { formatHarga } from "@deera/shared/lib/constants";
import { useSalesByKode, useProducedByKode, useSalesDetailByKode } from "../hooks";
import { fmtTanggal } from "../utils";
import ProductCodeImageModal from "./ProductCodeImageModal";

const LOCS = [
  { key: "gudang", label: "Gudang" },
  { key: "cideng", label: "Cideng" },
  { key: "tegalgubug", label: "Tegalgubug" },
];
const LOC_LABEL = Object.fromEntries(LOCS.map((l) => [l.key, l.label]));

/**
 * AccordionSection — helper lokal, dipakai membungkus tiap seksi info
 * produk (Stok & Penjualan, Stok Sesuai Produksi, Warna) di
 * ProductDetailModal. `defaultOpen=true` SENGAJA dipertahankan (bukan
 * collapsed-by-default) supaya seluruh konten tetap langsung terlihat —
 * yang berubah hanya AFFORDANCE bisa di-collapse/expand.
 */
function AccordionSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-skin-bdr-lt pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-3"
      >
        <span className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold">
          {title}
        </span>
        <span
          aria-hidden="true"
          className={`text-skin-text3 text-[10px] transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && children}
    </div>
  );
}

/**
 * StatCard — kartu ringkasan cepat (Stok / Terjual / Produksi) di bagian
 * atas modal, sebelum accordion mana pun — permintaan Denny 2026-09 utk
 * menjawab pertanyaan paling umum tanpa perlu buka apa pun.
 */
function StatCard({ label, value, accent = false, title }) {
  return (
    <div className="bg-skin-raised p-2.5 text-center">
      <p className="text-[10px] text-skin-text3 uppercase tracking-[0.1em] font-semibold">{label}</p>
      <p title={title} className={`text-lg font-bold mt-0.5 ${accent ? "text-[#CAB170]" : "text-skin-text"}`}>
        {value}
      </p>
    </div>
  );
}

/**
 * SalesDetailList — daftar transaksi (tanggal, nama pembeli, qty) untuk
 * satu kode produk. Kalau `location` diisi, daftar difilter HANYA
 * transaksi di lokasi itu (dipakai baris Gudang/Cideng/Tegalgubug —
 * permintaan Denny 2026-09: "saya mau di tiap pasar ada accordionnya,
 * bukan di total terjual aja"); kalau `location` null, tampilkan SEMUA
 * lokasi (baris "Total"), dengan label lokasi ditampilkan di tiap baris
 * supaya tetap jelas asalnya dari pasar mana.
 *
 * Ke-4 baris (3 lokasi + Total) BERBAGI satu query yang sama (query key
 * hanya berdasar `kode`, lihat useSalesDetailByKode) — filter per lokasi
 * dilakukan di client, bukan re-fetch. Query di-mount HANYA saat baris
 * terkait sedang dibuka (lihat StokPenjualanRow), jadi tetap lazy.
 */
function SalesDetailList({ kode, location }) {
  const { data, isLoading } = useSalesDetailByKode(kode);
  const detail = location ? data.filter((t) => t.location === location) : data;

  if (isLoading) {
    return <p className="text-sm text-skin-text4 py-2">Memuat transaksi...</p>;
  }
  if (detail.length === 0) {
    return <p className="text-sm text-skin-text4 py-2">Belum ada transaksi.</p>;
  }
  return (
    <div className="space-y-2 py-2">
      {detail.map((t) => (
        <div key={t.id} className="flex justify-between items-baseline gap-2">
          <div className="min-w-0">
            <p className="text-sm text-skin-text2 truncate">{t.buyer_name || "Tanpa nama"}</p>
            <p className="text-[11px] text-skin-text4">
              {fmtTanggal(t.created_at)}
              {!location && ` · ${LOC_LABEL[t.location] ?? t.location}`}
            </p>
          </div>
          <span className="text-sm font-semibold text-skin-text flex-shrink-0">{t.qty}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * StokPenjualanRow — satu baris di tabel "Stok & Penjualan" (Gudang/
 * Cideng/Tegalgubug/Total), menampilkan kolom Stok & Terjual berdampingan
 * dan bisa diklik utk expand/collapse daftar pembeli di lokasi itu (atau
 * semua lokasi utk Total). Nested content diberi indent + garis kiri
 * tipis (bukan kotak border tebal) supaya tetap ringan dibaca dgn 4 baris
 * accordion sekaligus.
 */
function StokPenjualanRow({ label, stokVal, terjualVal, stokTitle, kode, location, isOpen, onToggle, emphasis = false, testId }) {
  return (
    <div>
      <button
        type="button"
        data-testid={testId}
        onClick={onToggle}
        className={`w-full grid grid-cols-[1fr_52px_52px_14px] gap-1.5 items-center py-2 text-left transition hover:text-skin-text ${
          emphasis ? "border-t border-skin-bdr-lt mt-1 pt-3" : ""
        }`}
      >
        <span
          className={
            emphasis
              ? "text-sm font-bold text-skin-text uppercase tracking-wide truncate"
              : "text-sm text-skin-text2 truncate"
          }
        >
          {label}
        </span>
        <span title={stokTitle} className={`text-right ${emphasis ? "text-sm font-bold text-skin-text" : "text-sm text-skin-text2"}`}>
          {stokVal}
        </span>
        <span className={`text-right ${emphasis ? "text-sm font-bold text-[#CAB170]" : "text-sm font-semibold text-skin-text"}`}>
          {terjualVal}
        </span>
        <span
          aria-hidden="true"
          className={`text-[9px] text-skin-text3 text-right transition-transform ${isOpen ? "rotate-90" : ""}`}
        >
          ▸
        </span>
      </button>
      {isOpen && (
        <div className="pl-4 ml-1 border-l-2 border-skin-bdr-lt">
          <SalesDetailList kode={kode} location={location} />
        </div>
      )}
    </div>
  );
}

/**
 * StokPenjualanSection — seksi gabungan "Stok" + "Riwayat Penjualan"
 * (redesign 2026-09, lihat komentar panjang di atas file). Kalau produk
 * multi-size, breakdown per ukuran (kartu bertumpuk, TIDAK berubah dari
 * versi lama) ditampilkan dulu, baru tabel per-lokasi (Stok & Terjual
 * berdampingan, tiap baris accordion "single-open" via `openLoc`).
 */
function StokPenjualanSection({ stok, sales, salesLoading, kode, isHabis, isBelumDiisi, total }) {
  const [openLoc, setOpenLoc] = useState(null); // null | "gudang" | "cideng" | "tegalgubug" | "total"
  function toggleLoc(key) {
    setOpenLoc((prev) => (prev === key ? null : key));
  }

  const hasSizeBreakdown = stok.sizes && Object.keys(stok.sizes).length > 1;

  return (
    <AccordionSection title="Stok & Penjualan">
      {hasSizeBreakdown && (
        /* Kartu bertumpuk per ukuran, bukan <table> — kolom seperti
           "Tegalgubug" gampang membuat <table> melebihi lebar layar HP.
           TIDAK berubah dari implementasi lama, hanya dipindah ke sini. */
        <div className="space-y-2 mb-4">
          {Object.entries(stok.sizes).map(([size, vals]) => {
            const sizeTotal = (vals.gudang ?? 0) + (vals.cideng ?? 0) + (vals.tegalgubug ?? 0);
            return (
              <div key={size} className="border border-skin-bdr-lt p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-skin-text uppercase tracking-wide">{size}</span>
                  <span className={`text-base font-bold ${sizeTotal === 0 ? "text-skin-text4" : "text-skin-text"}`}>
                    {sizeTotal === 0 ? "HABIS" : sizeTotal}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {LOCS.map((l) => (
                    <div key={l.key} className="text-center">
                      <p className="text-[10px] text-skin-text3 uppercase tracking-wide mb-0.5">{l.label}</p>
                      <p className={`text-sm font-semibold ${vals[l.key] === 0 ? "text-skin-text4" : "text-skin-text2"}`}>
                        {vals[l.key] ?? 0}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {salesLoading ? (
        <p className="text-sm text-skin-text4">Memuat...</p>
      ) : (
        <div>
          <div className="grid grid-cols-[1fr_52px_52px_14px] gap-1.5 pb-1.5 mb-1 border-b border-skin-bdr-lt">
            <div />
            <div className="text-[10px] text-skin-text3 uppercase tracking-wide text-right">Stok</div>
            <div className="text-[10px] text-skin-text3 uppercase tracking-wide text-right">Terjual</div>
            <div />
          </div>
          {LOCS.map(({ key, label }) => (
            <StokPenjualanRow
              key={key}
              label={label}
              stokVal={stok[key] ?? 0}
              terjualVal={sales[key] ?? 0}
              kode={kode}
              location={key}
              isOpen={openLoc === key}
              onToggle={() => toggleLoc(key)}
            />
          ))}
          <StokPenjualanRow
            label="Total"
            testId="row-total-lokasi"
            stokVal={isHabis ? "HABIS" : isBelumDiisi ? "–" : total}
            stokTitle={isBelumDiisi ? "Stok belum diisi (belum stok opname)" : undefined}
            terjualVal={sales.total ?? 0}
            kode={kode}
            location={null}
            isOpen={openLoc === "total"}
            onToggle={() => toggleLoc("total")}
            emphasis
          />
        </div>
      )}
    </AccordionSection>
  );
}

export default function ProductDetailModal({ product: p, stok = {}, hasStok = true, onClose, onEdit }) {
  const [showSimpanGambar, setShowSimpanGambar] = useState(false);
  const total = (stok.gudang ?? 0) + (stok.cideng ?? 0) + (stok.tegalgubug ?? 0);
  // Permintaan Denny 2026-09: "jangan dibilang habis" kalau stok memang
  // belum pernah diisi admin (bukan beneran habis terjual) — kecuali produk
  // belum ada foto (kemungkinan besar belum selesai produksi, biarkan HABIS).
  const isHabis = total === 0 && (hasStok || !p.image);
  const isBelumDiisi = total === 0 && !isHabis;
  const variants = (p.variants ?? []).filter((v) => v.harga > 0);
  // `sales` (dari useSalesByKode) bisa null selagi isLoading=true — StatCard
  // "Terjual" di bawah mengakses sales.total TANPA digate oleh salesLoading
  // (beda dari StokPenjualanSection yang sudah gate lewat {salesLoading ?
  // ... : ...}), jadi fallback `?? {}` di sini WAJIB supaya tidak crash
  // saat masih loading.
  const { data: salesRaw, isLoading: salesLoading } = useSalesByKode(p.kode);
  const sales = salesRaw ?? {};
  const { producedBySize, isLoading: producedLoading } = useProducedByKode(p.kode);
  const producedSizes = Object.entries(producedBySize);
  const producedTotal = producedSizes.reduce((s, [, qty]) => s + qty, 0);

  const infoLine = [p.bahan, p.hpp > 0 ? `HPP Rp ${formatHarga(p.hpp)}` : null].filter(Boolean).join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-skin-bdr flex-shrink-0">
          <h3 className="text-2xl text-[#CAB170] leading-none font-headline">{p.kode}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-skin-text3 hover:text-skin-text text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Foto — permintaan Denny 2026-09: "foto produknya tidak begitu
              terlihat karena terpotong ... dibuat accordion juga aja kalau
              mau lihat foto, jadi keliatan full juga fotonya tanpa
              mengganggu yang lain". Sebelumnya foto dipaksa masuk kotak
              aspect-[3/4] max-h-64 + object-cover (bagian atas/bawah foto
              KEPOTONG kalau rasio aslinya beda). Sekarang: accordion
              tersendiri, DEFAULT TERTUTUP (beda dari seksi lain yang
              defaultOpen=true) supaya tidak makan tempat di awal — begitu
              dibuka, foto tampil PENUH pakai rasio aslinya (object-contain,
              tanpa max-height/crop apa pun). */}
          {p.image && (
            <AccordionSection title="Foto" defaultOpen={false}>
              <img
                src={cldUrl(p.image, { width: 720 })}
                alt={p.kode}
                className="w-full h-auto object-contain bg-skin-raised"
              />
            </AccordionSection>
          )}

          {/* Info dasar — Ukuran & Harga digabung di sini sbg baris ringkas
              (redesign 2026-09), bukan accordion terpisah lagi. */}
          <div className="space-y-1">
            <p className="text-lg text-skin-text font-semibold leading-snug">{p.nama}</p>
            {infoLine && <p className="text-sm text-skin-text3">{infoLine}</p>}
            {variants.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                {variants.map((v, i) => (
                  <span key={i} className="text-sm">
                    <span className="font-semibold text-skin-text uppercase">{v.size}</span>{" "}
                    <span className="text-[#CAB170] font-semibold">Rp {formatHarga(v.harga)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Ringkasan cepat — jawab pertanyaan paling umum tanpa buka
              accordion apa pun (redesign 2026-09). */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              label="Stok"
              value={isHabis ? "HABIS" : isBelumDiisi ? "–" : total}
              title={isBelumDiisi ? "Stok belum diisi (belum stok opname)" : undefined}
            />
            <StatCard label="Terjual" value={sales.total ?? 0} accent />
            <StatCard label="Produksi" value={producedTotal} />
          </div>

          {/* Stok & Penjualan (gabungan, redesign 2026-09) */}
          <StokPenjualanSection
            stok={stok}
            sales={sales}
            salesLoading={salesLoading}
            kode={p.kode}
            isHabis={isHabis}
            isBelumDiisi={isBelumDiisi}
            total={total}
          />

          {/* Stok Sesuai Produksi — total qty yang PERNAH diproduksi per
              ukuran (dijumlah dari semua produksi_batch milik kode ini),
              beda dari "Stok" (angka aktual saat ini) dan "Terjual"
              (angka terjual) — permintaan Denny 2026-08. */}
          <AccordionSection title="Stok Sesuai Produksi">
            {producedLoading ? (
              <p className="text-sm text-skin-text4">Memuat...</p>
            ) : producedSizes.length === 0 ? (
              <p className="text-sm text-skin-text4">Belum ada data produksi.</p>
            ) : (
              <div className="space-y-2">
                {producedSizes.map(([size, qty]) => (
                  <div key={size} className="flex justify-between">
                    <span className="text-sm text-skin-text2 uppercase tracking-wide">{size}</span>
                    <span className="text-sm font-semibold text-skin-text">{qty}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-skin-bdr-lt pt-2">
                  <span className="text-sm font-bold text-skin-text uppercase tracking-wide">
                    Total
                  </span>
                  <span className="text-sm font-bold text-[#CAB170]">{producedTotal}</span>
                </div>
              </div>
            )}
          </AccordionSection>

          {/* Warna */}
          {p.warna?.length > 0 && (
            <AccordionSection title={`${p.warna.length} Warna`}>
              <div className="flex flex-wrap gap-1.5">
                {p.warna.map((w, i) => (
                  <span
                    key={i}
                    className="text-sm text-skin-text2 border border-skin-bdr bg-skin-page px-2.5 py-1"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </AccordionSection>
          )}
        </div>

        {/* Aksi */}
        <div className="flex-shrink-0 border-t-2 border-skin-bdr flex">
          {p.image && (
            <button
              onClick={() => setShowSimpanGambar(true)}
              className="flex-1 py-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text2 hover:text-[#CAB170] hover:bg-skin-gold transition border-r border-skin-bdr"
            >
              🖼 Simpan Gambar
            </button>
          )}
          <button
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="flex-1 py-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text2 hover:text-[#CAB170] hover:bg-skin-gold transition"
          >
            ✎ Edit Produk
          </button>
        </div>
      </div>

      {showSimpanGambar && (
        <ProductCodeImageModal product={p} onClose={() => setShowSimpanGambar(false)} />
      )}
    </div>
  );
}
