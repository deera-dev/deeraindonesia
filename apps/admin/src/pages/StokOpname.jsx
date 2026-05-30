/**
 * StokOpname.jsx
 * Halaman stok opname — koreksi stok semua produk sekaligus.
 *
 * - Accordion per produk (expand / collapse)
 * - Prefill dengan nilai stok saat ini dari Supabase
 * - Baris yang diubah di-highlight amber
 * - Simpan hanya baris yang berubah (batch upsert)
 */
import { useState, useEffect } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useProducts } from "@deera/shared/hooks/useProducts";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { logHistory } from "../hooks/useHistory";
import { toast } from "@deera/shared/lib/toast";
import BackToTop from "@deera/shared/components/BackToTop";
import AdminBottomNav from "../components/AdminBottomNav";

const LOCS = [
  { key: "gudang", label: "Gudang" },
  { key: "cideng", label: "Cideng" },
  { key: "tegalgubug", label: "TegalGubug" },
];

// Urutan size sesuai SIZE_PRESETS
const SIZE_ORDER = SIZE_PRESETS.reduce((acc, p, i) => ({ ...acc, [p.size]: i }), {});

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const sd = (SIZE_ORDER[a.size] ?? 99) - (SIZE_ORDER[b.size] ?? 99);
    if (sd !== 0) return sd;
    return (a.warna ?? "").localeCompare(b.warna ?? "");
  });
}

export default function StokOpname() {
  const { products, loading: prodLoading } = useProducts();
  const [stokRows, setStokRows] = useState([]); // raw rows dari stok_warna
  const [changed, setChanged] = useState({}); // { [row.id]: { gudang, cideng, tegalgubug } }
  const [stokLoading, setStokLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [locFilter, setLocFilter] = useState(null); // null | "gudang" | "cideng" | "tegalgubug"

  // ── Load stok_warna ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("stok_warna")
      .select("*")
      .then(({ data }) => {
        setStokRows(data ?? []);
        setStokLoading(false);
      });
  }, []);

  // ── Map kode → sorted rows ───────────────────────────────────────────────────
  const stokByKode = {};
  for (const row of stokRows) {
    if (!stokByKode[row.kode]) stokByKode[row.kode] = [];
    stokByKode[row.kode].push(row);
  }
  for (const kode of Object.keys(stokByKode)) {
    stokByKode[kode] = sortRows(stokByKode[kode]);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function getValue(row, loc) {
    return changed[row.id]?.[loc] ?? row[loc] ?? 0;
  }

  function handleChange(row, loc, val) {
    setChanged((prev) => {
      const n = { ...prev };
      const current = { ...(n[row.id] ?? {}) };

      if (val === "" || val === null || val === undefined) {
        // kosongkan field ini → balik ke nilai DB
        delete current[loc];
      } else {
        current[loc] = Math.max(0, parseInt(val) || 0);
      }

      if (Object.keys(current).length === 0) {
        delete n[row.id];
      } else {
        n[row.id] = current;
      }
      return n;
    });
  }

  // ── Simpan ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    const changedIds = Object.keys(changed);
    if (changedIds.length === 0) return;
    setSaving(true);
    try {
      // Kumpulkan before + after untuk riwayat
      const historyRows = changedIds.map((id) => {
        const row = stokRows.find((r) => String(r.id) === String(id));
        const vals = changed[id];
        const merged = {
          gudang: vals.gudang !== undefined ? vals.gudang : (row.gudang ?? 0),
          cideng: vals.cideng !== undefined ? vals.cideng : (row.cideng ?? 0),
          tegalgubug: vals.tegalgubug !== undefined ? vals.tegalgubug : (row.tegalgubug ?? 0),
        };
        return {
          kode: row.kode,
          size: row.size,
          warna: row.warna,
          before: {
            gudang: row.gudang ?? 0,
            cideng: row.cideng ?? 0,
            tegalgubug: row.tegalgubug ?? 0,
          },
          after: merged,
        };
      });

      const upsertRows = historyRows.map((r) => ({
        id: stokRows.find((s) => s.kode === r.kode && s.size === r.size && s.warna === r.warna)?.id,
        kode: r.kode,
        size: r.size,
        warna: r.warna,
        gudang: r.after.gudang,
        cideng: r.after.cideng,
        tegalgubug: r.after.tegalgubug,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("stok_warna")
        .upsert(upsertRows, { onConflict: "kode,size,warna" });
      if (error) throw error;

      // Update state lokal
      setStokRows((prev) => prev.map((r) => (changed[r.id] ? { ...r, ...changed[r.id] } : r)));
      const count = changedIds.length;
      setChanged({});
      toast.success(`${count} baris stok berhasil diperbarui.`);

      // Catat ke riwayat (best-effort, per produk yang terpengaruh)
      const kodeSet = [...new Set(historyRows.map((r) => r.kode))];
      for (const kode of kodeSet) {
        const rowsForKode = historyRows.filter((r) => r.kode === kode);
        const prod = (products ?? []).find((p) => p.kode === kode);
        logHistory({
          action: "stok-opname",
          category: "stok",
          kode,
          nama: prod?.nama ?? kode,
          snapshot: {
            rows: rowsForKode.map((r) => ({
              kode: r.kode,
              size: r.size,
              warna: r.warna,
              ...r.after,
            })),
          },
          before: {
            rows: rowsForKode.map((r) => ({
              kode: r.kode,
              size: r.size,
              warna: r.warna,
              ...r.before,
            })),
          },
        }).catch(() => {});
      }
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

  // ── Filter ───────────────────────────────────────────────────────────────────
  const changedCount = Object.keys(changed).length;
  const q = search.trim().toLowerCase();
  const kodeNum = (kode) => {
    const m = (kode ?? "").match(/^D-(\d+)-/);
    return m ? parseInt(m[1], 10) : 0;
  };
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
    <main className="min-h-screen bg-skin-page text-skin-text pb-20">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-xl leading-none">Stok Opname</h1>
            {changedCount > 0 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                ✏ {changedCount} baris diubah, belum disimpan
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {changedCount > 0 && (
              <button
                onClick={() => setChanged({})}
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

      {/* ── Notif ── */}

      {/* ── Daftar produk ── */}
      <div className="px-4 py-4 md:px-8 space-y-2">
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

        {/* ── Grand total strip ── */}
        {!loading &&
          stokRows.length > 0 &&
          (() => {
            const gt = stokRows.reduce(
              (acc, row) => ({
                gudang: acc.gudang + getValue(row, "gudang"),
                cideng: acc.cideng + getValue(row, "cideng"),
                tegalgubug: acc.tegalgubug + getValue(row, "tegalgubug"),
              }),
              { gudang: 0, cideng: 0, tegalgubug: 0 },
            );
            const mkts = [
              {
                key: "gudang",
                lbl: "GD",
                name: "Gudang",
                color: "text-sky-500 dark:text-sky-400",
                bg: "bg-sky-50 dark:bg-sky-950/40",
                border: "border-sky-200 dark:border-sky-800",
              },
              {
                key: "cideng",
                lbl: "CD",
                name: "Cideng",
                color: "text-violet-500 dark:text-violet-400",
                bg: "bg-violet-50 dark:bg-violet-950/40",
                border: "border-violet-200 dark:border-violet-800",
              },
              {
                key: "tegalgubug",
                lbl: "TG",
                name: "Tegal",
                color: "text-rose-500 dark:text-rose-400",
                bg: "bg-rose-50 dark:bg-rose-950/40",
                border: "border-rose-200 dark:border-rose-800",
              },
            ];
            const mktCards = [
              {
                key: "gudang", lbl: "GD", name: "Gudang",
                color: "text-sky-500 dark:text-sky-400",
                bg: "bg-sky-50 dark:bg-sky-950/40",
                activeBorder: "border-sky-400 dark:border-sky-500",
                inactiveBorder: "border-transparent",
              },
              {
                key: "cideng", lbl: "CD", name: "Cideng",
                color: "text-violet-500 dark:text-violet-400",
                bg: "bg-violet-50 dark:bg-violet-950/40",
                activeBorder: "border-violet-400 dark:border-violet-500",
                inactiveBorder: "border-transparent",
              },
              {
                key: "tegalgubug", lbl: "TG", name: "Tegal",
                color: "text-rose-500 dark:text-rose-400",
                bg: "bg-rose-50 dark:bg-rose-950/40",
                activeBorder: "border-rose-400 dark:border-rose-500",
                inactiveBorder: "border-transparent",
              },
            ];
            return (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {mktCards.map(({ key, lbl, name, color, bg, activeBorder, inactiveBorder }) => {
                  const isActive = locFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setLocFilter(isActive ? null : key)}
                      className={`${bg} border-2 ${isActive ? activeBorder : inactiveBorder} flex items-center gap-2 px-3 py-2 transition-all hover:opacity-90 active:scale-95 cursor-pointer`}
                      title={isActive ? `Hapus filter ${name}` : `Filter produk dengan stok ${name} > 0`}
                    >
                      <span className={`text-[11px] font-black tracking-widest uppercase ${color} flex-shrink-0`}>
                        {lbl}{isActive ? " ✕" : ""}
                      </span>
                      <span className={`text-xl font-black leading-none ${color}`}>{gt[key]}</span>
                      <span className="text-[10px] text-skin-text3 leading-none">{name}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

        {!loading &&
          filteredProducts.map((product) => {
            const rows = stokByKode[product.kode] ?? [];
            const isOpen = !!expanded[product.kode];
            const hasChanges = rows.some((r) => changed[r.id]);

            // Total stok produk ini (pakai nilai terbaru termasuk perubahan)
            const totalGudang = rows.reduce((s, r) => s + getValue(r, "gudang"), 0);
            const totalCideng = rows.reduce((s, r) => s + getValue(r, "cideng"), 0);
            const totalTegal = rows.reduce((s, r) => s + getValue(r, "tegalgubug"), 0);
            const totalStok = totalGudang + totalCideng + totalTegal;

            return (
              <div
                key={product.kode}
                className="bg-skin-card border border-skin-bdr overflow-hidden"
              >
                {/* ── Product header ── */}
                <button
                  onClick={() => toggleProduct(product.kode)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-skin-page transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-skin-text">
                        {product.kode}
                      </span>
                      {hasChanges && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold tracking-wide uppercase">
                          diubah
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-skin-text3 truncate mt-0.5">{product.nama}</p>
                    {/* Size totals */}
                    {rows.length > 0 && (() => {
                      const SIZE_COLORS = {
                        "Midi":        "text-cyan-500 dark:text-cyan-400",
                        "Midi Jumbo":  "text-indigo-500 dark:text-indigo-400",
                        "Gamis":       "text-emerald-500 dark:text-emerald-400",
                        "Gamis Jumbo": "text-orange-500 dark:text-orange-400",
                      };
                      const bySize = {};
                      for (const r of rows) {
                        if (!bySize[r.size]) bySize[r.size] = 0;
                        bySize[r.size] += getValue(r, "gudang") + getValue(r, "cideng") + getValue(r, "tegalgubug");
                      }
                      const sizes = SIZE_PRESETS.map(p => p.size).filter(s => bySize[s] !== undefined);
                      return (
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {sizes.map(size => {
                            const cls = SIZE_COLORS[size] ?? "text-skin-text3";
                            return (
                              <span key={size} className={`text-xs font-black leading-none ${cls}`}>
                                {size} {bySize[size]}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
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
                            {lbl}{val}
                          </span>
                        ))}
                      </span>
                    </div>
                    <span className="text-skin-text3 text-xs">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* ── Expanded: stok per varian ── */}
                {isOpen && (
                  <div className="border-t border-skin-bdr divide-y divide-skin-bdr-lt">
                    {rows.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-skin-text4 italic">
                        Belum ada data stok untuk produk ini.
                      </p>
                    ) : (
                      rows.map((row) => {
                        const isRowChanged = !!changed[row.id];
                        const g = getValue(row, "gudang");
                        const c = getValue(row, "cideng");
                        const t = getValue(row, "tegalgubug");
                        const total = g + c + t;
                        return (
                          <div
                            key={row.id}
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
                                  <span className="text-[10px] px-1 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold uppercase tracking-wide">
                                    diubah
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-sm font-bold ${total === 0 ? "text-skin-text4" : "text-skin-text"}`}
                              >
                                {total} pcs
                              </span>
                            </div>
                            {/* Inputs per lokasi — 3 kolom */}
                            <div className="grid grid-cols-3 gap-2">
                              {LOCS.map((loc) => (
                                <div key={loc.key}>
                                  <label className="text-[10px] text-skin-text3 uppercase tracking-wide block mb-1">
                                    {loc.label}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={
                                      changed[row.id]?.[loc.key] !== undefined
                                        ? changed[row.id][loc.key]
                                        : ""
                                    }
                                    placeholder={String(row[loc.key] ?? 0)}
                                    onChange={(e) => handleChange(row, loc.key, e.target.value)}
                                                className={`w-full text-right py-1.5 px-2 text-sm border focus:outline-none focus:border-[#CAB170] transition bg-skin-card text-skin-text placeholder:text-skin-text3 ${
                                      isRowChanged ? "border-amber-500" : "border-skin-bdr"
                                    }`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
      <AdminBottomNav />
      <BackToTop bottomClass="bottom-24" />
    </main>
  );
}
