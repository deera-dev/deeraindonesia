/**
 * BukuPotonganPage.jsx — Perbandingan stok expected (buku potongan) vs aktual.
 *
 * Card per produk → ./ProductBukuCard
 * Utilities       → ../utils
 * Data layer      → ../hooks.js (Dependency Inversion — komponen tidak panggil
 * supabase langsung).
 *
 * REVISI 2026-07-19 — perbaikan logika rekonsiliasi (laporan Denny):
 * "Stok Saat Ini" (actualMap, dari stok_warna) hanya barang yang BELUM
 * terjual. Membandingkan itu langsung ke expected_qty (jumlah kumulatif
 * hasil produksi/potong) berarti selisih SELALU menyimpang begitu ada
 * penjualan — bukan indikasi masalah nyata, jadi fitur ini sebelumnya
 * tidak pernah bisa menunjukkan "sudah sesuai". Ditambah `soldMap`
 * (terjual bersih = penjualan − retur, dari RPC
 * get_sold_summary_by_variant, lihat ../api.js) supaya perbandingan
 * yang benar bisa dilakukan: expected_qty vs (stok tersisa + terjual
 * bersih). "Stok Saat Ini" TETAP ditampilkan (masih berguna sbg info
 * stok fisik), hanya SELISIH-nya yang sekarang ikut memperhitungkan
 * barang yang sudah terjual.
 */
import { useState, useMemo } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import BackToTop from "@deera/shared/components/BackToTop";
import { toast } from "@deera/shared/features/toast/hooks";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import { sortRows, rowKey } from "../utils";
import ProductBukuCard from "./ProductBukuCard";
import { useBukuPotonganData, useSaveExpectedStok } from "../hooks";

export default function BukuPotonganPage() {
  const { products, loading: prodLoading } = useProducts();
  const {
    stokRows,
    expectedRows,
    soldMap,
    tableError,
    loading: dataLoading,
    reload,
  } = useBukuPotonganData();
  const { saveExpectedStok, saving } = useSaveExpectedStok();
  const [changed, setChanged] = useState({});
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const [onlySelisih, setOnlySelisih] = useState(false);

  // actual map: { "kode__size__warna": totalQty } — stok yang BELUM terjual
  const actualMap = useMemo(() => {
    const m = {};
    for (const row of stokRows) {
      const w = row.warna ?? "_";
      const k = `${row.kode}__${row.size}__${w}`;
      m[k] = (m[k] ?? 0) + (row.gudang ?? 0) + (row.cideng ?? 0) + (row.tegalgubug ?? 0);
    }
    return m;
  }, [stokRows]);

  // sold map (flatten): { [kode]: { [size]: { [warna]: qty } } } dari RPC
  // -> { "kode__size__warna": qty }. Ini "terjual bersih" (sale − retur),
  // lihat komentar di atas & ../api.js untuk alasan lengkap.
  const soldTotalMap = useMemo(() => {
    const m = {};
    for (const [kode, sizes] of Object.entries(soldMap ?? {})) {
      for (const [size, warnas] of Object.entries(sizes ?? {})) {
        for (const [warna, qty] of Object.entries(warnas ?? {})) {
          m[`${kode}__${size}__${warna}`] = qty ?? 0;
        }
      }
    }
    return m;
  }, [soldMap]);

  // expected map dari DB: { "kode__size__warna": expectedQty }
  const expectedMap = useMemo(() => {
    const m = {};
    for (const row of expectedRows) {
      m[`${row.kode}__${row.size}__${row.warna ?? "_"}`] = row.expected_qty ?? 0;
    }
    return m;
  }, [expectedRows]);

  // Gabungkan semua baris dari stok_warna + expected_stok per kode
  const rowsByKode = useMemo(() => {
    const map = {};
    for (const row of stokRows) {
      const w = row.warna ?? "_";
      const k = `${row.kode}__${row.size}__${w}`;
      if (!map[row.kode]) map[row.kode] = new Map();
      map[row.kode].set(k, { kode: row.kode, size: row.size, warna: w });
    }
    for (const row of expectedRows) {
      const w = row.warna ?? "_";
      const k = `${row.kode}__${row.size}__${w}`;
      if (!map[row.kode]) map[row.kode] = new Map();
      if (!map[row.kode].has(k)) map[row.kode].set(k, { kode: row.kode, size: row.size, warna: w });
    }
    const result = {};
    for (const [kode, rowMap] of Object.entries(map)) {
      result[kode] = sortRows([...rowMap.values()]);
    }
    return result;
  }, [stokRows, expectedRows]);

  function handleChangeExpected(kode, size, warna, val) {
    const k = rowKey(kode, size, warna);
    const numVal = Math.max(0, parseInt(val) || 0);
    const original = expectedMap[k] ?? 0;
    setChanged((prev) => {
      const n = { ...prev };
      if (numVal === original) delete n[k];
      else n[k] = numVal;
      return n;
    });
  }

  async function handleSave() {
    const keys = Object.keys(changed);
    if (keys.length === 0) return;
    try {
      const upsertRows = keys.map((k) => {
        const [kode, size, warna] = k.split("__");
        return { kode, size, warna: warna || "_", expected_qty: changed[k] };
      });
      await saveExpectedStok(upsertRows);
      toast.success(`${keys.length} baris expected stok berhasil disimpan.`);
      setChanged({});
      reload();
    } catch (err) {
      toast.error("Gagal simpan: " + err.message);
    }
  }

  function expandAll() {
    const m = {};
    for (const p of products ?? []) m[p.kode] = true;
    setExpanded(m);
  }
  function collapseAll() {
    setExpanded({});
  }
  function toggleProduct(kode) {
    setExpanded((prev) => ({ ...prev, [kode]: !prev[kode] }));
  }

  const changedCount = Object.keys(changed).length;
  const q = search.trim().toLowerCase();

  // Catatan urutan (permintaan Denny 2026-08): TIDAK di-sort ulang di sini —
  // `products` dari useProducts() SUDAH terurut sesuai aturan resmi (terbaru
  // dulu, lalu nama A-Z), dan `.filter()` mempertahankan urutan itu. Dulu
  // ada `.sort((a,b) => kodeNum(b.kode) - kodeNum(a.kode))` di sini yang
  // meng-override jadi kode-descending — sudah dihapus supaya konsisten
  // dengan halaman Produk & Stok Opname.
  const filteredProducts = useMemo(() => {
    return (products ?? []).filter((p) => {
      if (q && !p.kode.toLowerCase().includes(q) && !(p.nama ?? "").toLowerCase().includes(q))
        return false;
      if (onlySelisih) {
        const rows = rowsByKode[p.kode] ?? [];
        return rows.some((r) => {
          const k = rowKey(r.kode, r.size, r.warna);
          const exp = changed[k] ?? expectedMap[k] ?? 0;
          const act = actualMap[k] ?? 0;
          const sold = soldTotalMap[k] ?? 0;
          // Selisih = (stok tersisa + terjual bersih) - expected — BUKAN
          // stok tersisa saja (lihat komentar redesign di atas).
          return exp !== act + sold;
        });
      }
      return true;
    });
  }, [products, q, onlySelisih, changed, expectedMap, actualMap, soldTotalMap, rowsByKode]);

  const loading = prodLoading || dataLoading;

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-xl leading-none">Buku Potongan</h1>
            {changedCount > 0 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                ✏ {changedCount} baris diubah, belum disimpan
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={changedCount === 0 || saving}
            className="px-4 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {saving ? "Menyimpan..." : changedCount > 0 ? `Simpan (${changedCount})` : "Simpan"}
          </button>
        </div>

        {/* Filter bar */}
        <div className="border-t border-skin-bdr-lt px-4 py-2 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama produk..."
            className="flex-1 min-w-[160px] bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4"
          />
          <button
            onClick={() => setOnlySelisih((v) => !v)}
            className={`px-3 py-2 text-xs font-semibold tracking-[0.06em] uppercase transition border flex-shrink-0 ${
              onlySelisih
                ? "bg-red-500 text-white border-red-500"
                : "border-skin-bdr text-skin-text3 hover:border-red-400 hover:text-red-600"
            }`}
          >
            Hanya Selisih
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

      {/* ── Tabel belum ada ── */}
      {tableError && (
        <div className="mx-4 mt-4 md:mx-8 md:max-w-5xl lg:max-w-6xl px-4 py-3 bg-amber-50 border border-amber-300 text-sm text-amber-800 leading-relaxed">
          <p className="font-semibold mb-1">
            ⚠ Tabel <code>expected_stok</code> belum dibuat di Supabase.
          </p>
          <p>Jalankan SQL di Supabase SQL Editor (lihat komentar di ../api.js).</p>
        </div>
      )}

      {/* ── Legenda ── */}
      {!loading && !tableError && (
        <div className="px-4 pt-3 pb-1 md:px-8 md:max-w-5xl lg:max-w-6xl md:mx-auto flex flex-wrap gap-4 text-xs text-skin-text3">
          <span>
            <span className="text-green-600 font-bold">✓</span> = sesuai
          </span>
          <span>
            <span className="text-amber-600 font-bold">+n</span> = lebih dari expected
          </span>
          <span>
            <span className="text-red-600 font-bold">−n</span> = kurang dari expected
          </span>
          <span className="text-skin-text4 w-full">
            Selisih = (Sisa Stok + Terjual) − Expected. Terjual sudah dikurangi retur.
          </span>
        </div>
      )}

      {/* ── Daftar produk ── */}
      <div className="px-4 py-4 md:px-8 md:max-w-5xl lg:max-w-6xl md:mx-auto">
        {loading && <p className="text-center text-sm text-skin-text3 py-12">Memuat data...</p>}
        {!loading && filteredProducts.length === 0 && (
          <p className="text-center text-sm text-skin-text4 py-16">
            {onlySelisih
              ? "Tidak ada selisih ditemukan"
              : q
                ? `Tidak ada produk "${search}"`
                : "Belum ada produk"}
          </p>
        )}
        {/* CSS multi-column masonry di lg+ (bukan CSS grid) — kartu
            ProductBukuCard adalah accordion dengan tinggi variatif per item,
            lihat catatan yang sama di StokOpnamePage.jsx. */}
        <div className="space-y-2 lg:space-y-0 lg:columns-2 lg:gap-3">
          {!loading &&
            filteredProducts.map((product) => (
              <div key={product.kode} className="lg:break-inside-avoid lg:mb-2">
                <ProductBukuCard
                  product={product}
                  rows={rowsByKode[product.kode] ?? []}
                  isOpen={!!expanded[product.kode]}
                  onToggle={toggleProduct}
                  changed={changed}
                  expectedMap={expectedMap}
                  actualMap={actualMap}
                  soldMap={soldTotalMap}
                  onChangeExpected={handleChangeExpected}
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
