/**
 * StokOpnamePage.jsx
 * Halaman stok opname — koreksi stok semua produk sekaligus.
 *
 * - Accordion per produk (expand / collapse)        → ./ProductOpnameCard
 * - Grand-total + filter lokasi                       → ./GrandTotalStrip
 * - Draft "changed" dipersist via Zustand (../store.js, key tetap
 *   "stok_opname_draft_v1") — bukan localStorage manual lagi.
 * - Data layer                                         → ../hooks.js
 */
import { useState, useMemo } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import BackToTop from "@deera/shared/components/BackToTop";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import { sortRows, kodeNum, LOCS } from "../utils";
import {
  useStokWarnaAll,
  useSaveStokOpname,
  useStokOpnameDraft,
  hasPersistedDraft,
} from "../hooks";
import GrandTotalStrip from "./GrandTotalStrip";
import ProductOpnameCard from "./ProductOpnameCard";

export default function StokOpnamePage() {
  const { products, loading: prodLoading } = useProducts();
  const { stokRows, loading: stokLoading } = useStokWarnaAll();
  const saveStokOpname = useSaveStokOpname();
  const { changed, setValue, clear } = useStokOpnameDraft();

  const [draftRestored] = useState(hasPersistedDraft);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [locFilter, setLocFilter] = useState(null); // null | "gudang" | "cideng" | "tegalgubug"

  // ── Map kode → sorted rows ───────────────────────────────────────────────────
  const stokByKode = useMemo(() => {
    const map = {};
    for (const row of stokRows) {
      if (!map[row.kode]) map[row.kode] = [];
      map[row.kode].push(row);
    }
    for (const kode of Object.keys(map)) map[kode] = sortRows(map[kode]);
    return map;
  }, [stokRows]);

  function getValue(row, loc) {
    return changed[row.id]?.[loc] ?? row[loc] ?? 0;
  }

  function handleChange(row, loc, val) {
    setValue(row.id, loc, val);
  }

  // ── Simpan ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    const changedCount = Object.keys(changed).length;
    if (changedCount === 0) return;
    setSaving(true);
    try {
      const { count } = await saveStokOpname({ changed, stokRows, products });
      clear();
      toast.success(`${count} baris stok berhasil diperbarui.`);
    } catch (err) {
      toast.error("Gagal simpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Expand / collapse helpers ─────────────────────────────────────────────
  function expandAll() {
    const map = {};
    for (const p of products ?? []) map[p.kode] = true;
    setExpanded(map);
  }
  function collapseAll() {
    setExpanded({});
  }
  function toggleProduct(kode) {
    setExpanded((prev) => ({ ...prev, [kode]: !prev[kode] }));
  }
  function toggleLocFilter(key) {
    setLocFilter((prev) => (prev === key ? null : key));
  }

  // ── Filter ───────────────────────────────────────────────────────────────────
  const changedCount = Object.keys(changed).length;
  const q = search.trim().toLowerCase();
  const filteredProducts = (products ?? [])
    .filter(
      (p) =>
        (!q || p.kode.toLowerCase().includes(q) || (p.nama ?? "").toLowerCase().includes(q)) &&
        (!onlyChanged || (stokByKode[p.kode] ?? []).some((r) => changed[r.id])) &&
        (!locFilter || (stokByKode[p.kode] ?? []).some((r) => getValue(r, locFilter) > 0)),
    )
    .sort((a, b) => kodeNum(b.kode) - kodeNum(a.kode));

  const loading = prodLoading || stokLoading;

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-xl leading-none">Stok Opname</h1>
            {draftRestored && changedCount > 0 && (
              <p className="text-xs text-blue-600 mt-1 font-medium">
                💾 Draft dipulihkan — {changedCount} baris belum disimpan
              </p>
            )}
            {!draftRestored && changedCount > 0 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                ✏ {changedCount} baris diubah, belum disimpan
              </p>
            )}
            {changedCount === 0 && (
              <p className="text-xs text-skin-text4 mt-1">Belum ada perubahan</p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {changedCount > 0 && (
              <button
                onClick={clear}
                disabled={saving}
                className="px-4 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase text-skin-text2 border-2 border-skin-bdr hover:border-red-300 hover:text-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Batal
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={changedCount === 0 || saving}
              className="px-4 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Menyimpan..." : changedCount > 0 ? `Simpan (${changedCount})` : "Simpan"}
            </button>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="border-t border-skin-bdr-lt px-4 py-2 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama produk..."
            className="flex-1 min-w-[160px] bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4"
          />
          <button
            onClick={() => setOnlyChanged((v) => !v)}
            className={`px-3 py-2 text-xs font-semibold tracking-[0.06em] uppercase transition border flex-shrink-0 ${
              onlyChanged
                ? "bg-amber-400 text-white border-amber-400"
                : "border-skin-bdr text-skin-text3 hover:border-amber-400 hover:text-amber-600"
            }`}
          >
            Hanya Perubahan
          </button>
          <button
            onClick={expandAll}
            className="px-3 py-2 text-xs font-semibold tracking-[0.06em] uppercase transition border border-skin-bdr text-skin-text3 hover:text-skin-text hover:border-skin-text flex-shrink-0"
          >
            Buka Semua
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-xs font-semibold tracking-[0.06em] uppercase transition border border-skin-bdr text-skin-text3 hover:text-skin-text hover:border-skin-text flex-shrink-0"
          >
            Tutup Semua
          </button>
        </div>
      </header>

      {/* ── Daftar produk ── */}
      <div className="px-4 py-4 md:px-8 md:max-w-5xl lg:max-w-6xl md:mx-auto">
        {loading && <p className="text-center text-sm text-skin-text3 py-12">Memuat data...</p>}

        {!loading && filteredProducts.length === 0 && (
          <p className="text-center text-sm text-skin-text4 py-16">
            {onlyChanged
              ? "Belum ada perubahan"
              : q
                ? `Tidak ada produk "${search}"`
                : "Belum ada produk"}
          </p>
        )}

        {!loading && stokRows.length > 0 && (
          <div className="mb-2">
            <GrandTotalStrip
              stokRows={stokRows}
              getValue={getValue}
              locFilter={locFilter}
              onToggleLocFilter={toggleLocFilter}
            />
            {/* Redesign UX 2026-07 — locFilter SEKARANG juga mempersempit
                tabel isi tiap kartu produk (ProductOpnameCard) ke 1 kolom
                lokasi ("mode fokus"), bukan cuma memfilter daftar produk
                seperti sebelumnya. Pesan ini memastikan perubahan
                perilaku itu tidak "diam-diam" — penting utk user baru. */}
            {locFilter && (
              <p className="text-xs text-[#A8925A] font-semibold mb-3 -mt-1">
                Mode fokus aktif — tabel produk hanya menampilkan kolom{" "}
                {LOCS.find((l) => l.key === locFilter)?.label}. Tap lokasi yang sama lagi untuk kembali ke
                semua lokasi.
              </p>
            )}
          </div>
        )}

        {/* Daftar kartu produk — CSS multi-column masonry di lg+ (bukan CSS
            grid) karena tiap kartu accordion punya tinggi berbeda-beda
            tergantung status expand/collapse; grid akan menyamakan tinggi
            baris dan menyisakan gap kosong yang jelek. Di bawah lg tetap
            1 kolom (space-y-2) karena lebar tablet biasanya terlalu sempit
            untuk 2 kolom tabel yang padat ini. */}
        <div className="space-y-2 lg:space-y-0 lg:columns-2 lg:gap-3">
          {!loading &&
            filteredProducts.map((product) => (
              <div key={product.kode} className="lg:break-inside-avoid lg:mb-2">
                <ProductOpnameCard
                  product={product}
                  rows={stokByKode[product.kode] ?? []}
                  isOpen={!!expanded[product.kode]}
                  onToggle={toggleProduct}
                  changed={changed}
                  onChangeRow={(row, loc, val) => setValue(row.id, loc, val)}
                  getValue={getValue}
                  locFilter={locFilter}
                />
              </div>
            ))}
        </div>
      </div>
      <AdminSidebar />
      <AdminBottomNav />
      <BackToTop />
    </main>
  );
}
