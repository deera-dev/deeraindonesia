/**
 * BukuPotongan.jsx
 * Halaman perbandingan stok expected (buku potongan) vs actual (stok_warna).
 *
 * Data expected disimpan di tabel Supabase: expected_stok
 *   (id, kode, size, warna, expected_qty, updated_at)
 *   UNIQUE(kode, size, warna)
 *
 * SQL untuk buat tabel (jalankan di Supabase SQL editor):
 * ─────────────────────────────────────────────────────────
 * CREATE TABLE expected_stok (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   kode text NOT NULL,
 *   size text NOT NULL,
 *   warna text NOT NULL DEFAULT '_',
 *   expected_qty integer NOT NULL DEFAULT 0,
 *   updated_at timestamptz DEFAULT now(),
 *   UNIQUE(kode, size, warna)
 * );
 * ALTER TABLE expected_stok ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Auth users full access" ON expected_stok
 *   FOR ALL TO authenticated USING (true) WITH CHECK (true);
 * ─────────────────────────────────────────────────────────
 */
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@deera/shared/lib/supabase";
import { useProducts } from "@deera/shared/hooks/useProducts";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import BackToTop from "@deera/shared/components/BackToTop";

const SIZE_ORDER = SIZE_PRESETS.reduce((acc, p, i) => ({ ...acc, [p.size]: i }), {});

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const sd = (SIZE_ORDER[a.size] ?? 99) - (SIZE_ORDER[b.size] ?? 99);
    if (sd !== 0) return sd;
    return (a.warna ?? "").localeCompare(b.warna ?? "");
  });
}

function kodeNum(kode) {
  const m = (kode ?? "").match(/^D-(\d+)-/);
  return m ? parseInt(m[1], 10) : 0;
}

// Warna kelas untuk selisih
function selisihCls(selisih) {
  if (selisih === 0) return "text-green-600 font-bold";
  if (selisih > 0)   return "text-amber-600 font-bold";   // actual > expected
  return "text-red-600 font-bold";                         // actual < expected
}

function selisihLabel(selisih) {
  if (selisih === 0) return "✓";
  if (selisih > 0)   return `+${selisih}`;
  return `${selisih}`;
}

export default function BukuPotongan() {
  const { products, loading: prodLoading } = useProducts();

  // ── Raw data dari Supabase ───────────────────────────────────────────────────
  const [stokRows,     setStokRows]     = useState([]); // actual: stok_warna
  const [expectedRows, setExpectedRows] = useState([]); // expected: expected_stok
  const [dataLoading,  setDataLoading]  = useState(true);
  const [tableError,   setTableError]   = useState(false);

  // ── Changed expected values: { [key]: qty } key = "kode__size__warna" ───────
  const [changed,  setChanged]  = useState({});
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [expanded,    setExpanded]    = useState({});
  const [search,      setSearch]      = useState("");
  const [onlySelisih, setOnlySelisih] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setDataLoading(true);
      const [stokRes, expRes] = await Promise.all([
        supabase.from("stok_warna").select("kode, size, warna, gudang, cideng, tegalgubug"),
        supabase.from("expected_stok").select("kode, size, warna, expected_qty"),
      ]);
      if (expRes.error?.code === "42P01") {
        // Tabel belum dibuat
        setTableError(true);
      }
      setStokRows(stokRes.data ?? []);
      setExpectedRows(expRes.data ?? []);
      setDataLoading(false);
    }
    load();
  }, []);

  // ── Bangun maps ───────────────────────────────────────────────────────────────

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

  // expected map (DB values): { "kode__size__warna": expectedQty }
  const expectedMap = useMemo(() => {
    const m = {};
    for (const row of expectedRows) {
      const w = row.warna ?? "_";
      m[`${row.kode}__${row.size}__${w}`] = row.expected_qty ?? 0;
    }
    return m;
  }, [expectedRows]);

  // Kumpulkan semua kode×size×warna yang ada di stok_warna
  const rowsByKode = useMemo(() => {
    const map = {};
    for (const row of stokRows) {
      const w = row.warna ?? "_";
      const k = `${row.kode}__${row.size}__${w}`;
      if (!map[row.kode]) map[row.kode] = new Map();
      map[row.kode].set(k, { kode: row.kode, size: row.size, warna: w });
    }
    // Tambahkan rows dari expected_stok yang mungkin tidak ada di stok_warna
    for (const row of expectedRows) {
      const w = row.warna ?? "_";
      const k = `${row.kode}__${row.size}__${w}`;
      if (!map[row.kode]) map[row.kode] = new Map();
      if (!map[row.kode].has(k)) {
        map[row.kode].set(k, { kode: row.kode, size: row.size, warna: w });
      }
    }
    // Convert to sorted arrays
    const result = {};
    for (const [kode, rowMap] of Object.entries(map)) {
      result[kode] = sortRows([...rowMap.values()]);
    }
    return result;
  }, [stokRows, expectedRows]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function rowKey(kode, size, warna) {
    return `${kode}__${size}__${warna}`;
  }

  function getExpected(kode, size, warna) {
    const k = rowKey(kode, size, warna);
    return changed[k] ?? expectedMap[k] ?? 0;
  }

  function getActual(kode, size, warna) {
    return actualMap[rowKey(kode, size, warna)] ?? 0;
  }

  function handleChange(kode, size, warna, val) {
    const k = rowKey(kode, size, warna);
    const numVal = Math.max(0, parseInt(val) || 0);
    const original = expectedMap[k] ?? 0;
    setChanged(prev => {
      const n = { ...prev };
      if (numVal === original) {
        delete n[k];
      } else {
        n[k] = numVal;
      }
      return n;
    });
  }

  // ── Simpan ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    const keys = Object.keys(changed);
    if (keys.length === 0) return;
    setSaving(true);
    try {
      const upsertRows = keys.map(k => {
        const [kode, size, warna] = k.split("__");
        return {
          kode, size,
          warna: warna || "_",
          expected_qty: changed[k],
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase
        .from("expected_stok")
        .upsert(upsertRows, { onConflict: "kode,size,warna" });
      if (error) throw error;

      // Update local expectedRows
      setExpectedRows(prev => {
        const next = [...prev];
        for (const row of upsertRows) {
          const idx = next.findIndex(r => r.kode === row.kode && r.size === row.size && r.warna === row.warna);
          if (idx >= 0) {
            next[idx] = { ...next[idx], expected_qty: row.expected_qty };
          } else {
            next.push({ kode: row.kode, size: row.size, warna: row.warna, expected_qty: row.expected_qty });
          }
        }
        return next;
      });

      setMsg(`✓ ${keys.length} baris expected stok berhasil disimpan.`);
      setChanged({});
      setTimeout(() => setMsg(""), 5000);
    } catch (err) {
      alert("Gagal simpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Expand/collapse ───────────────────────────────────────────────────────────
  function expandAll()  { const m = {}; for (const p of (products ?? [])) m[p.kode] = true; setExpanded(m); }
  function collapseAll(){ setExpanded({}); }
  function toggleProduct(kode) { setExpanded(prev => ({ ...prev, [kode]: !prev[kode] })); }

  // ── Filter ────────────────────────────────────────────────────────────────────
  const changedCount = Object.keys(changed).length;
  const q = search.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    return (products ?? [])
      .filter(p => {
        if (q && !p.kode.toLowerCase().includes(q) && !(p.nama ?? "").toLowerCase().includes(q)) return false;
        if (onlySelisih) {
          const rows = rowsByKode[p.kode] ?? [];
          return rows.some(r => {
            const exp = getExpected(r.kode, r.size, r.warna);
            const act = getActual(r.kode, r.size, r.warna);
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
    <main className="min-h-screen bg-skin-page text-skin-text">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link to="/admin" className="text-skin-text3 hover:text-[#CAB170] transition text-sm">
                ← Admin
              </Link>
              <span className="text-skin-bdr">/</span>
              <h1 className="font-headline text-[#CAB170] text-xl leading-none">
                Buku Potongan
              </h1>
            </div>
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

        {/* Search + filter bar */}
        <div className="border-t border-skin-bdr-lt px-4 py-2 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari kode atau nama produk..."
            className="flex-1 min-w-[160px] bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4"
          />
          <button
            onClick={() => setOnlySelisih(v => !v)}
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

      {/* ── Notif tabel belum ada ── */}
      {tableError && (
        <div className="mx-4 mt-4 md:mx-8 px-4 py-3 bg-amber-50 border border-amber-300 text-sm text-amber-800 leading-relaxed">
          <p className="font-semibold mb-1">⚠ Tabel <code>expected_stok</code> belum dibuat di Supabase.</p>
          <p>Jalankan SQL berikut di Supabase SQL Editor:</p>
          <pre className="mt-2 bg-amber-100 px-3 py-2 text-xs overflow-x-auto rounded">{`CREATE TABLE expected_stok (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kode text NOT NULL,
  size text NOT NULL,
  warna text NOT NULL DEFAULT '_',
  expected_qty integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(kode, size, warna)
);
ALTER TABLE expected_stok ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access" ON expected_stok
  FOR ALL TO authenticated USING (true) WITH CHECK (true);`}</pre>
        </div>
      )}

      {/* ── Notif simpan ── */}
      {msg && (
        <div className="bg-green-50 border-b-2 border-green-300 px-4 py-3 text-center">
          <p className="text-sm text-green-800 font-semibold">{msg}</p>
        </div>
      )}

      {/* ── Legenda ── */}
      {!loading && !tableError && (
        <div className="px-4 pt-3 pb-1 md:px-8 flex flex-wrap gap-4 text-xs text-skin-text3">
          <span><span className="text-green-600 font-bold">✓</span> = sesuai</span>
          <span><span className="text-amber-600 font-bold">+n</span> = stok lebih dari expected</span>
          <span><span className="text-red-600 font-bold">−n</span> = stok kurang dari expected</span>
          <span className="text-skin-text4 w-full">Stok Saat Ini = barang yang belum terjual (sudah dikurangi penjualan)</span>
        </div>
      )}

      {/* ── Daftar produk ── */}
      <div className="px-4 py-4 md:px-8 space-y-2">
        {loading && (
          <p className="text-center text-sm text-skin-text3 py-12">Memuat data...</p>
        )}

        {!loading && filteredProducts.length === 0 && (
          <p className="text-center text-sm text-skin-text4 py-16">
            {onlySelisih ? "Tidak ada selisih ditemukan" : q ? `Tidak ada produk "${search}"` : "Belum ada produk"}
          </p>
        )}

        {!loading && filteredProducts.map(product => {
          const rows = rowsByKode[product.kode] ?? [];
          const isOpen = !!expanded[product.kode];

          // Hitung ringkasan selisih produk ini
          let totalExpected = 0, totalActual = 0;
          for (const r of rows) {
            totalExpected += getExpected(r.kode, r.size, r.warna);
            totalActual   += getActual(r.kode, r.size, r.warna);
          }
          const totalSelisih = totalActual - totalExpected;
          const hasChanged   = rows.some(r => changed[rowKey(r.kode, r.size, r.warna)] !== undefined);

          return (
            <div key={product.kode} className="bg-skin-card border border-skin-bdr overflow-hidden">

              {/* ── Product header ── */}
              <button
                onClick={() => toggleProduct(product.kode)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-skin-page transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-skin-text">{product.kode}</span>
                    {hasChanged && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold tracking-wide uppercase">
                        diubah
                      </span>
                    )}
                    {totalSelisih !== 0 && !hasChanged && (
                      <span className={`text-[10px] px-1.5 py-0.5 border font-bold tracking-wide uppercase ${
                        totalSelisih > 0
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          : "bg-red-500/10 text-red-600 border-red-500/30"
                      }`}>
                        {selisihLabel(totalSelisih)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-skin-text3 truncate mt-0.5">{product.nama}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs text-skin-text3">
                  <span>E:{totalExpected} · S:{totalActual}</span>
                  <span className="text-skin-text3 text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* ── Expanded: perbandingan per varian ── */}
              {isOpen && (
                <div className="border-t border-skin-bdr divide-y divide-skin-bdr-lt">
                  {rows.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-skin-text4 italic">
                      Tidak ada data stok untuk produk ini.
                    </p>
                  ) : (
                    <>
                      {rows.map(row => {
                        const exp     = getExpected(row.kode, row.size, row.warna);
                        const act     = getActual(row.kode, row.size, row.warna);
                        const selisih = act - exp;
                        const isRowChanged = changed[rowKey(row.kode, row.size, row.warna)] !== undefined;
                        return (
                          <div
                            key={rowKey(row.kode, row.size, row.warna)}
                            className={`px-4 py-3 ${isRowChanged ? "bg-amber-500/10" : ""}`}
                          >
                            {/* Varian header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-skin-text uppercase">
                                  {row.size}
                                </span>
                                {row.warna && row.warna !== "_" && (
                                  <span className="text-xs text-skin-text3">{row.warna}</span>
                                )}
                                {isRowChanged && (
                                  <span className="text-[10px] px-1 py-0.5 bg-amber-500/15 text-amber-600 border border-amber-500/40 font-bold uppercase tracking-wide">
                                    diubah
                                  </span>
                                )}
                              </div>
                              <span className={`text-sm ${selisihCls(selisih)}`}>
                                {exp === 0 && act === 0 ? "—" : selisihLabel(selisih)}
                              </span>
                            </div>
                            {/* Expected input + Stok Saat Ini — 2 kolom */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-skin-text3 uppercase tracking-wide block mb-1">
                                  Expected (Buku)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={exp || ""}
                                  placeholder="0"
                                  onChange={e => handleChange(row.kode, row.size, row.warna, e.target.value)}
                                  className={`w-full text-right py-1.5 px-2 text-sm border focus:outline-none focus:border-[#CAB170] transition bg-skin-card text-skin-text ${
                                    isRowChanged ? "border-amber-500" : "border-skin-bdr"
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-skin-text3 uppercase tracking-wide block mb-1">
                                  Stok Saat Ini
                                </label>
                                <div className={`py-1.5 px-2 text-sm text-right font-semibold bg-skin-page border border-skin-bdr-lt ${act === 0 ? "text-skin-text4" : "text-skin-text"}`}>
                                  {act}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Total footer */}
                      <div className="px-4 py-2.5 bg-skin-page flex items-center justify-between">
                        <span className="text-xs font-bold text-skin-text uppercase tracking-wide">Total Produk</span>
                        <div className="flex items-center gap-4 text-xs text-skin-text3">
                          <span>E: <span className="font-bold text-skin-text2">{totalExpected}</span></span>
                          <span>S: <span className="font-bold text-skin-text">{totalActual}</span></span>
                          <span className={`text-sm ${selisihCls(totalSelisih)}`}>
                            {totalExpected === 0 && totalActual === 0 ? "—" : selisihLabel(totalSelisih)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BackToTop />
    </main>
  );
}
