/**
 * BukuPotonganPage.jsx — Perbandingan stok expected (buku potongan) vs aktual.
 *
 * Card per produk → ./ProductBukuCard
 * Utilities       → ../utils
 * Data layer      → ../hooks.js (Dependency Inversion — komponen tidak panggil
 * supabase langsung).
 */
import { useState, useMemo } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import BackToTop from "@deera/shared/components/BackToTop";
import { toast } from "@deera/shared/features/toast/hooks";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import { sortRows, kodeNum, rowKey } from "../utils";
import ProductBukuCard from "./ProductBukuCard";
import { useBukuPotonganData, useSaveExpectedStok } from "../hooks";

export default function BukuPotonganPage() {
  const { products, loading: prodLoading } = useProducts();
  const {
    stokRows,
    expectedRows,
    tableError,
    loading: dataLoading,
    reload,
  } = useBukuPotonganData();
  const { saveExpectedStok, saving } = useSaveExpectedStok();
  const [changed, setChanged] = useState({});
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const [onlySelisih, setOnlySelisih] = useState(false);

  // actual map: { "kode__size__warna": totalQty }
  const actualMap = useMemo(() => {
    const m = {};
    for (const row of stokRows) {
      const w = row.warna ?? "_";
      const k = `${row.kode}__${row.size}__${w}`;
      m[k] = (m[k] ?? 0) + (row.gudang ?? 0) + (row.cideng ?? 0) + (row.tegalgubug ?? 0);
    }
    return m;
  }, [stokRows]);

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

  const filteredProducts = useMemo(() => {
    return (products ?? [])
      .filter((p) => {
        if (q && !p.kode.toLowerCase().includes(q) && !(p.nama ?? "").toLowerCase().includes(q))
          return false;
        if (onlySelisih) {
          const rows = rowsByKode[p.kode] ?? [];
          return rows.some((r) => {
            const exp =
              changed[rowKey(r.kode, r.size, r.warna)] ??
              expectedMap[rowKey(r.kode, r.size, r.warna)] ??
              0;
            const act = actualMap[rowKey(r.kode, r.size, r.warna)] ?? 0;
            return exp !== act;
          });
        }
        return true;
      })
      .sort((a, b) => kodeNum(b.kode) - kodeNum(a.kode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, q, onlySelisih, changed, expectedMap, actualMap, rowsByKode]);

  const loading = prodLoading || dataLoading;

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20">
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
        <div className="mx-4 mt-4 md:mx-8 px-4 py-3 bg-amber-50 border border-amber-300 text-sm text-amber-800 leading-relaxed">
          <p className="font-semibold mb-1">
            ⚠ Tabel <code>expected_stok</code> belum dibuat di Supabase.
          </p>
          <p>Jalankan SQL di Supabase SQL Editor (lihat komentar di ../api.js).</p>
        </div>
      )}

      {/* ── Legenda ── */}
      {!loading && !tableError && (
        <div className="px-4 pt-3 pb-1 md:px-8 flex flex-wrap gap-4 text-xs text-skin-text3">
          <span>
            <span className="text-green-600 font-bold">✓</span> = sesuai
          </span>
          <span>
            <span className="text-amber-600 font-bold">+n</span> = stok lebih dari expected
          </span>
          <span>
            <span className="text-red-600 font-bold">−n</span> = stok kurang dari expected
          </span>
          <span className="text-skin-text4 w-full">Stok Saat Ini = barang yang belum terjual</span>
        </div>
      )}

      {/* ── Daftar produk ── */}
      <div className="px-4 py-4 md:px-8 space-y-2">
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
        {!loading &&
          filteredProducts.map((product) => (
            <ProductBukuCard
              key={product.kode}
              product={product}
              rows={rowsByKode[product.kode] ?? []}
              isOpen={!!expanded[product.kode]}
              onToggle={toggleProduct}
              changed={changed}
              expectedMap={expectedMap}
              actualMap={actualMap}
              onChangeExpected={handleChangeExpected}
            />
          ))}
      </div>

      <AdminBottomNav />
      <BackToTop />
    </main>
  );
}
