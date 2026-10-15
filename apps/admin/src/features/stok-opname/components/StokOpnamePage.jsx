/**
 * StokOpnamePage.jsx — Stok Opname "hitung per produk" (redesign 2026-10-08).
 *
 * Alur: pilih lokasi → tap produk → isi hitungan (angka warna, atau total dulu
 * lalu warna menyusul) → periksa selisih → simpan. Tiap produk disimpan
 * sendiri; status "sudah dihitung" per lokasi dipersist di ../store.js.
 * Data layer lewat ../hooks.js.
 */
import { useState, useMemo } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import BackToTop from "@deera/shared/components/BackToTop";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import {
  sortRows,
  sortProductsTerbaru,
  LOCS,
  dikerjakanKey,
  fillMissingStokRows,
  productLocTotal,
  productStatus,
  pendingWarnaPcs,
  bukuSummary,
  bukuCompare,
} from "../utils";
import {
  useStokWarnaAll,
  useJahitDikerjakan,
  useSaveStokOpname,
  useStokOpnameSession,
  useBukuPotonganInfo,
} from "../hooks";
import GuideCard from "./GuideCard";
import ProductCountSheet from "./ProductCountSheet";

const FILTERS = [
  ["semua", "Semua"],
  ["belum", "Belum"],
  ["sudah", "Sudah"],
  ["beda", "Beda buku"],
];

const STATUS_UI = {
  belum: ["Belum dihitung", "text-skin-text2 border-skin-bdr"],
  sudah: ["✓ Sudah dihitung", "text-emerald-600 border-emerald-500/50"],
};

export default function StokOpnamePage() {
  const { products, loading: prodLoading } = useProducts();
  const { stokRows, loading: stokLoading } = useStokWarnaAll();
  const { rows: dikerjakanRows } = useJahitDikerjakan();
  const buku = useBukuPotonganInfo();
  const saveStokOpname = useSaveStokOpname();
  const { loc, counted, guideDismissed, setLoc, markCounted, resetCounted, dismissGuide, showGuide } =
    useStokOpnameSession();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("semua");
  const [openKode, setOpenKode] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // kode → baris stok (gabungan nyata + placeholder utk kombinasi yg belum ada)
  // Total barang (semua produk & warna) per lokasi — ditampilkan di tombol lokasi.
  const locTotals = useMemo(() => {
    const t = { gudang: 0, cideng: 0, tegalgubug: 0 };
    for (const r of stokRows) for (const k of Object.keys(t)) t[k] += r[k] ?? 0;
    return t;
  }, [stokRows]);

  const stokByKode = useMemo(() => {
    const map = {};
    for (const row of stokRows) (map[row.kode] ??= []).push(row);
    for (const p of products ?? []) map[p.kode] = fillMissingStokRows(p, map[p.kode] ?? []);
    for (const kode of Object.keys(map)) map[kode] = sortRows(map[kode]);
    return map;
  }, [stokRows, products]);
  const allStokRows = useMemo(() => Object.values(stokByKode).flat(), [stokByKode]);

  const dikerjakanMap = useMemo(() => {
    const map = {};
    for (const r of dikerjakanRows) map[dikerjakanKey(r.kode, r.size)] = r.total_dikerjakan;
    return map;
  }, [dikerjakanRows]);

  const locCounted = (loc && counted[loc]) || {};
  const sorted = useMemo(() => sortProductsTerbaru(products ?? []), [products]);
  const q = search.trim().toLowerCase();
  const visible = sorted.filter((p) => {
    if (q && !p.kode.toLowerCase().includes(q) && !(p.nama ?? "").toLowerCase().includes(q)) return false;
    const st = productStatus(locCounted[p.kode]);
    if (filter === "beda") return bukuCompare(buku, p.kode, stokByKode[p.kode] ?? [])?.selisih;
    return filter === "semua" || st === filter;
  });
  const doneCount = sorted.filter((p) => locCounted[p.kode]).length;
  const loading = prodLoading || stokLoading;

  const openProduct = openKode ? sorted.find((p) => p.kode === openKode) : null;
  const nextKode = openKode
    ? sorted.find((p) => p.kode !== openKode && !locCounted[p.kode] && visible.some((v) => v.kode === p.kode))?.kode
    : null;

  async function handleSubmit({ changed, selisih, next }) {
    try {
      if (Object.keys(changed).length > 0) {
        await saveStokOpname({ changed, stokRows: allStokRows, products });
      }
      markCounted(loc, openKode, selisih);
      toast.success(`${openKode} tersimpan${selisih ? ` (stok ${selisih > 0 ? "+" : ""}${selisih})` : ""}`);
      setOpenKode(next && nextKode ? nextKode : null);
    } catch (err) {
      toast.error("Gagal simpan: " + err.message);
    }
  }

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-skin-accent-text text-xl leading-none">Stok Opname</h1>
            <p className="text-xs text-skin-text4 mt-1">
              {loc ? (
                <>
                  Menghitung <b>{LOCS.find((l) => l.key === loc)?.label}</b> · {doneCount}/{sorted.length} produk
                  dihitung
                </>
              ) : (
                "Pilih lokasi yang akan dihitung"
              )}
            </p>
          </div>
          {guideDismissed && (
            <button onClick={showGuide} className="text-xs underline text-skin-text3 flex-shrink-0">
              Cara pakai
            </button>
          )}
        </div>

        <div className="border-t border-skin-bdr-lt px-4 py-2 grid grid-cols-3 gap-2" role="group" aria-label="Lokasi">
          {LOCS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLoc(l.key)}
              aria-pressed={loc === l.key}
              className={`py-2 text-sm font-bold uppercase tracking-[0.06em] border-2 transition ${
                loc === l.key
                  ? "bg-skin-accent border-skin-accent text-skin-on-accent"
                  : "border-skin-bdr text-skin-text3 hover:border-skin-accent"
              }`}
            >
              {l.label}
              <span className="block text-[11px] font-semibold normal-case tracking-normal tabular-nums opacity-80" data-testid={`total-${l.key}`}>
                {locTotals[l.key].toLocaleString("id-ID")} pcs
              </span>
            </button>
          ))}
        </div>

        {loc && (
          <div className="border-t border-skin-bdr-lt px-4 py-2 space-y-2">
            <div className="h-1.5 bg-skin-bdr-lt" aria-hidden>
              <div
                className="h-full bg-skin-accent transition-all"
                style={{ width: `${sorted.length ? (doneCount / sorted.length) * 100 : 0}%` }}
              />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode atau nama produk..."
              className="w-full md:max-w-md bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent placeholder:text-skin-text4"
            />
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] border transition ${
                    filter === key
                      ? "bg-skin-accent border-skin-accent text-skin-on-accent"
                      : "border-skin-bdr text-skin-text3"
                  }`}
                >
                  {label}
                </button>
              ))}
              {doneCount > 0 &&
                (confirmReset ? (
                  <span className="text-xs text-skin-text2 flex items-center gap-2 ml-auto">
                    Reset penanda {LOCS.find((l) => l.key === loc)?.label}?
                    <button
                      className="underline font-bold text-red-500"
                      onClick={() => {
                        resetCounted(loc);
                        setConfirmReset(false);
                      }}
                    >
                      Ya
                    </button>
                    <button className="underline" onClick={() => setConfirmReset(false)}>
                      Batal
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="ml-auto text-xs underline text-skin-text3"
                  >
                    Mulai sesi baru
                  </button>
                ))}
            </div>
          </div>
        )}
      </header>

      <div className="px-4 py-4 md:px-8 lg:max-w-7xl lg:mx-auto">
        {!guideDismissed && <GuideCard onDismiss={dismissGuide} />}

        {!loc && (
          <p className="text-center text-sm text-skin-text3 py-12">
            Pilih lokasi di atas dulu. Semua hitungan berlaku untuk satu lokasi saja, jadi tidak ada risiko salah
            kolom.
          </p>
        )}
        {loc && loading && <p className="text-center text-sm text-skin-text3 py-12">Memuat data...</p>}
        {loc && !loading && visible.length === 0 && (
          <p className="text-center text-sm text-skin-text4 py-12">
            {q ? `Tidak ada produk "${search}"` : "Tidak ada produk di filter ini"}
          </p>
        )}

        {loc && !loading && (
          <ul className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3">
            {visible.map((p) => {
              const rows = stokByKode[p.kode] ?? [];
              const c = locCounted[p.kode];
              const st = productStatus(c);
              const pend = pendingWarnaPcs(rows, loc);
              return (
                <li key={p.kode}>
                  <button
                    onClick={() => setOpenKode(p.kode)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-skin-card border border-skin-bdr text-left hover:border-skin-accent transition"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-skin-text">{p.kode}</p>
                      <p className="text-xs text-skin-text3 truncate">{p.nama}</p>
                      {bukuSummary(buku, rows) && (
                        <p className="text-[11px] text-skin-text3 mt-0.5">
                          📒 Buku potongan: seharusnya {bukuSummary(buku, rows).seharusnya} pcs
                        </p>
                      )}
                      {pend > 0 && (
                        <p className="text-[11px] text-red-500 font-bold mt-0.5">⚠ {pend} pcs belum masukin warna</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold tabular-nums">stok {productLocTotal(rows, loc)} pcs</p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 text-[11px] font-semibold border ${STATUS_UI[st][1]}`}
                      >
                        {STATUS_UI[st][0]}
                      </span>
                      {bukuCompare(buku, p.kode, rows) && (
                        <p
                          className={`text-[11px] mt-1 font-semibold ${
                            bukuCompare(buku, p.kode, rows).selisih === 0 ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {bukuCompare(buku, p.kode, rows).selisih === 0
                            ? "✓ cocok buku"
                            : `⚠ beda buku ${bukuCompare(buku, p.kode, rows).selisih > 0 ? "+" : ""}${bukuCompare(buku, p.kode, rows).selisih}`}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {openProduct && loc && (
        <ProductCountSheet
          key={`${openProduct.kode}-${loc}`}
          product={openProduct}
          rows={stokByKode[openProduct.kode] ?? []}
          loc={loc}
          dikerjakanMap={dikerjakanMap}
          buku={buku}
          hasNext={!!nextKode}
          onClose={() => setOpenKode(null)}
          onSubmit={handleSubmit}
        />
      )}
      <AdminSidebar />
      <AdminBottomNav />
      <BackToTop />
    </main>
  );
}
