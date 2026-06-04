/**
 * ProduksiHPP.jsx — Halaman template HPP per produk.
 *
 * Tab "Template HPP" : daftar & kelola template HPP
 * Tab "Harga Dasar"  : konfigurasi komponen biaya default
 *
 * Form kini mendukung multi-produk (gelaran) sekaligus.
 * onSave menerima array of payloads → upsert satu per satu.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { useProducts, invalidateProducts } from "@deera/shared/hooks/useProducts";
import BackToTop from "@deera/shared/components/BackToTop";
import ProduksiLayout from "../components/produksi/ProduksiLayout";
import { logHistory } from "../hooks/useHistory";
import { toast } from "@deera/shared/lib/toast";
import { fetchBahanOptions, fetchConfig, fmtRp, calcTotal } from "../components/produksi/hpp/hppUtils";
import HPPForm from "../components/produksi/hpp/HPPForm";
import HPPCard from "../components/produksi/hpp/HPPCard";

const fieldFullCls =
  "w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
const labelCls = "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

function RangeSlider({ label, min, max, step, value, onChange, fmtRp }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">{label}</label>
        <span className="text-xs font-bold text-[#CAB170]">{fmtRp(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#CAB170]"
      />
      <div className="flex justify-between text-[10px] text-skin-text4 mt-0.5">
        <span>{fmtRp(min)}</span>
        <span>{fmtRp(max)}</span>
      </div>
    </div>
  );
}

function KalkulatorHPP({ fmtRp, fieldFullCls, labelCls }) {
  const [bahans, setBahans] = useState([{ harga: "", pemakaian: "" }]);
  const [upah, setUpah] = useState(55000);
  const [operasional, setOperasional] = useState(5000);
  const [lainnya, setLainnya] = useState("");

  const totalBahan = bahans.reduce((s, b) => s + (Number(b.harga) || 0) * (Number(b.pemakaian) || 0), 0);
  const total = totalBahan + upah + operasional + (Number(lainnya) || 0);

  const rows = [
    { label: "Biaya Bahan", value: totalBahan },
    { label: "Upah & Jasa", value: upah },
    { label: "Operasional", value: operasional },
    { label: "Lainnya", value: Number(lainnya) || 0 },
  ].filter((r) => r.value > 0);

  function reset() {
    setBahans([{ harga: "", pemakaian: "" }]);
    setUpah(55000); setOperasional(5000); setLainnya("");
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-skin-text3">Perkiraan HPP per baju. Tidak disimpan ke database.</p>

      {/* Bahan */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls}>Biaya Bahan</label>
          <button type="button"
            onClick={() => setBahans((p) => [...p, { harga: "", pemakaian: "" }])}
            className="text-[10px] tracking-[0.12em] uppercase font-editorial text-[#CAB170] hover:text-[#A8925A] transition"
          >
            + Tambah
          </button>
        </div>
        <div className="space-y-2">
          {bahans.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="number" min="0" value={b.harga}
                onChange={(e) => setBahans((p) => p.map((x, j) => j === i ? { ...x, harga: e.target.value } : x))}
                placeholder="Harga/satuan" className={fieldFullCls} />
              <span className="text-skin-text3 text-xs shrink-0">×</span>
              <input type="number" min="0" step="0.01" value={b.pemakaian}
                onChange={(e) => setBahans((p) => p.map((x, j) => j === i ? { ...x, pemakaian: e.target.value } : x))}
                placeholder="Pemakaian" className={fieldFullCls} />
              {bahans.length > 1 && (
                <button type="button" onClick={() => setBahans((p) => p.filter((_, j) => j !== i))}
                  className="shrink-0 text-red-400 hover:text-red-600 text-xl leading-none">×</button>
              )}
            </div>
          ))}
          {totalBahan > 0 && (
            <p className="text-xs text-right text-[#CAB170] font-semibold">{fmtRp(totalBahan)} / baju</p>
          )}
        </div>
      </div>

      {/* Upah & Jasa — range */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls}>Upah & Jasa</label>
          <span className="text-xs font-bold text-[#CAB170]">{fmtRp(upah)}</span>
        </div>
        <input type="range" min={35000} max={80000} step={500} value={upah}
          onChange={(e) => setUpah(Number(e.target.value))}
          className="w-full accent-[#CAB170]" />
        <div className="flex justify-between text-[10px] text-skin-text4 mt-0.5">
          <span>{fmtRp(35000)}</span><span>{fmtRp(80000)}</span>
        </div>
      </div>

      {/* Operasional — range */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls}>Operasional</label>
          <span className="text-xs font-bold text-[#CAB170]">{fmtRp(operasional)}</span>
        </div>
        <input type="range" min={0} max={20000} step={500} value={operasional}
          onChange={(e) => setOperasional(Number(e.target.value))}
          className="w-full accent-[#CAB170]" />
        <div className="flex justify-between text-[10px] text-skin-text4 mt-0.5">
          <span>{fmtRp(0)}</span><span>{fmtRp(20000)}</span>
        </div>
      </div>

      {/* Lainnya */}
      <div>
        <label className={labelCls}>Lainnya (Rp)</label>
        <input type="number" min="0" value={lainnya}
          onChange={(e) => setLainnya(e.target.value)}
          placeholder="0" className={fieldFullCls} />
      </div>

      {/* Hasil */}
      {total > 0 && (
        <div className="border-2 border-[#CAB170] bg-skin-gold p-4 space-y-1.5">
          <p className="text-xs font-editorial tracking-[0.2em] uppercase text-[#A8925A] mb-3">Estimasi HPP / Baju</p>
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between text-xs">
              <span className="text-skin-text3">{r.label}</span>
              <span className="font-semibold text-skin-text2">{fmtRp(r.value)}</span>
            </div>
          ))}
          <div className="border-t border-[#CAB170]/40 pt-2 mt-1 flex justify-between">
            <span className="text-sm font-bold text-skin-text">Total HPP</span>
            <span className="text-lg font-bold text-[#CAB170]">{fmtRp(total)}</span>
          </div>
        </div>
      )}

      <button type="button" onClick={reset}
        className="w-full py-2.5 font-editorial text-xs tracking-[0.18em] uppercase text-skin-text3 border border-skin-bdr hover:text-skin-text transition"
      >
        Reset
      </button>
    </div>
  );
}

export default function ProduksiHPP() {
  const { user } = useAuth();
  const { products } = useProducts();
  const [templates, setTemplates] = useState([]);
  const [config, setConfig] = useState({});
  const [bahanOptions, setBahanOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);   // null = create, object = edit single
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("template");
  const [configRows, setConfigRows] = useState([]);
  const [editedCfg, setEditedCfg] = useState({});
  const [savingCfg, setSavingCfg] = useState(null);
  // ── Kalkulator state ─────────────────────────────────────────────────────────
  const [calcTemplate, setCalcTemplate] = useState("");
  const [calcBahanItems, setCalcBahanItems] = useState([]);
  const [calcUpah, setCalcUpah] = useState("");
  const [calcBordir, setCalcBordir] = useState("0");
  const [calcKancingQty, setCalcKancingQty] = useState("0");
  const [calcKancingExtra, setCalcKancingExtra] = useState("0");
  const [calcStudio, setCalcStudio] = useState("0");


  const loadAll = useCallback(async () => {
    setLoading(true);
    const [tpls, cfg, bahan] = await Promise.all([
      supabase.from("hpp_template").select("*").order("kode_produk", { ascending: false }),
      fetchConfig(),
      fetchBahanOptions(),
    ]);
    setTemplates(tpls.data ?? []);
    setConfig(cfg);
    setBahanOptions(bahan);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    supabase
      .from("hpp_config")
      .select("*")
      .order("key")
      .then(({ data }) => setConfigRows(data ?? []));
  }, []);

  // handleSave now accepts an array of payloads (one per produk in the gelaran)
  async function handleSave(payloads) {
    const arr = Array.isArray(payloads) ? payloads : [payloads];
    for (const payload of arr) {
      const record = { ...payload, updated_at: new Date().toISOString(), updated_by: user?.email };
      const existing = templates.find((t) => t.kode_produk === payload.kode_produk);
      if (existing) {
        await supabase.from("hpp_template").update(record).eq("id", existing.id).throwOnError();
      } else {
        await supabase.from("hpp_template").insert(record).throwOnError();
      }
      if (payload.kode_produk && payload.total_hpp > 0) {
        await supabase
          .from("products")
          .update({ hpp: payload.total_hpp })
          .eq("kode", payload.kode_produk);
      }
      const existing2 = templates.find((t) => t.kode_produk === payload.kode_produk);
      logHistory({
        action: "hpp-simpan",
        category: "produksi",
        kode: payload.kode_produk ?? "",
        nama: payload.kode_produk ?? "",
        snapshot: { total_hpp: payload.total_hpp, bahan_items: payload.bahan_items },
        before: existing2
          ? { total_hpp: existing2.total_hpp, bahan_items: existing2.bahan_items }
          : undefined,
      }).catch(() => {});
    }
    invalidateProducts();
    toast.success(
      arr.length > 1
        ? `${arr.length} template HPP berhasil disimpan.`
        : "Template HPP berhasil disimpan.",
    );
    setShowForm(false);
    setEditing(null);
    loadAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("hpp_template").delete().eq("id", deleteTarget.id);
    logHistory({
      action: "hpp-hapus",
      category: "produksi",
      kode: deleteTarget.kode_produk ?? "",
      nama: deleteTarget.kode_produk ?? "",
      snapshot: { total_hpp: deleteTarget.total_hpp },
    }).catch(() => {});
    toast.success("Template HPP dihapus.");
    setDeleteTarget(null);
    loadAll();
  }

  async function handleSaveCfg(row) {
    const val = Number(editedCfg[row.key] ?? row.nilai);
    setSavingCfg(row.key);
    await supabase
      .from("hpp_config")
      .update({ nilai: val, updated_at: new Date().toISOString(), updated_by: user?.email })
      .eq("key", row.key);
    setSavingCfg(null);
    setEditedCfg((p) => { const n = { ...p }; delete n[row.key]; return n; });
    setConfigRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, nilai: val } : r)));
    setConfig(await fetchConfig());
    toast.success("Konfigurasi HPP disimpan.");
  }

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(tpl) {
    setEditing(tpl);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }


  // Load template ke kalkulator
  function loadCalcFromTemplate(kodeProduk) {
    setCalcTemplate(kodeProduk);
    if (!kodeProduk) { setCalcBahanItems([]); return; }
    const tpl = templates.find((t) => t.kode_produk === kodeProduk);
    if (!tpl) return;
    setCalcBahanItems((tpl.bahan_items ?? []).map((b) => ({ ...b })));
    setCalcUpah(String(tpl.upah_jahit ?? ""));
    setCalcBordir(String(tpl.bordir ?? "0"));
    setCalcKancingQty(String(tpl.kancing_qty ?? "0"));
    setCalcKancingExtra(String(tpl.kancing_extra ?? "0"));
    setCalcStudio(String(tpl.biaya_studio ?? "0"));
  }

  const calcResult = useMemo(() => {
    if (calcBahanItems.length === 0 && !calcUpah) return null;
    try {
      return calcTotal({
        bahanItems: calcBahanItems,
        upah_jahit: Number(calcUpah) || 0,
        bordir: Number(calcBordir) || 0,
        kancing_qty: Number(calcKancingQty) || 0,
        kancing_extra: Number(calcKancingExtra) || 0,
        biaya_studio: Number(calcStudio) || 0,
        config,
      });
    } catch { return null; }
  }, [calcBahanItems, calcUpah, calcBordir, calcKancingQty, calcKancingExtra, calcStudio, config]);

  const headerAction = (
    <button
      onClick={openNew}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
    >
      + Buat HPP
    </button>
  );

  return (
    <ProduksiLayout title="HPP Produk" headerAction={headerAction}>
      {/* Tab switcher */}
      <div className="flex border border-skin-bdr mb-5">
        {[
          { key: "template", label: "Template HPP" },
          { key: "kalkulator", label: "Kalkulator" },
          { key: "config", label: "Harga Dasar" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 font-editorial text-xs tracking-[0.18em] uppercase transition border-r last:border-r-0 border-skin-bdr ${
              activeTab === key
                ? "bg-[#CAB170] text-white"
                : "text-skin-text3 hover:text-skin-text bg-skin-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Template HPP ── */}
      {activeTab === "template" && (
        <>
          {loading ? (
            <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">Belum ada template HPP.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((tpl) => (
                <HPPCard
                  key={tpl.id}
                  tpl={tpl}
                  produk={products?.find((p) => p.kode === tpl.kode_produk)}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Harga Dasar / Config ── */}
      {activeTab === "config" && (
        <div className="space-y-2">
          <p className="text-xs text-skin-text3 mb-4">
            Nilai default untuk semua kalkulasi HPP. Tidak mempengaruhi template yang sudah tersimpan.
          </p>
          <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
            {configRows.map((row) => {
              const val = editedCfg[row.key] ?? row.nilai;
              const isDirty =
                editedCfg[row.key] !== undefined && Number(editedCfg[row.key]) !== row.nilai;
              return (
                <div key={row.key} className="p-3 space-y-2">
                  <div>
                    <p className="text-sm text-skin-text2">{row.label}</p>
                    {row.keterangan && <p className="text-xs text-skin-text3">{row.keterangan}</p>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      className={fieldFullCls}
                      value={val}
                      onChange={(e) => setEditedCfg((p) => ({ ...p, [row.key]: e.target.value }))}
                    />
                    {isDirty && (
                      <button
                        onClick={() => handleSaveCfg(row)}
                        disabled={savingCfg === row.key}
                        className="shrink-0 px-4 py-2.5 text-xs font-editorial tracking-[0.15em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-60"
                      >
                        {savingCfg === row.key ? "..." : "Simpan"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ── Kalkulator HPP ── */}
      {activeTab === "kalkulator" && (
        <KalkulatorHPP fmtRp={fmtRp} fieldFullCls={fieldFullCls} labelCls={labelCls} />
      )}

      <BackToTop bottomClass="bottom-24" />

      {/* ── Modal Form HPP ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeForm} />
          <div className="relative bg-skin-card w-full max-w-lg h-[95dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
            <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
              <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
                {editing ? `Edit HPP — ${editing.kode_produk}` : "Buat Template HPP"}
              </h2>
              <button
                onClick={closeForm}
                className="text-skin-text3 hover:text-skin-text transition text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <HPPForm
                key={editing?.id ?? "new"}
                initial={editing}
                products={products}
                config={config}
                bahanOptions={bahanOptions}
                onSave={handleSave}
                onCancel={closeForm}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Hapus ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-skin-card border-2 border-skin-bdr p-6 w-full max-w-sm space-y-4">
            <p className="font-editorial text-sm tracking-[0.15em] uppercase text-skin-text2">
              Hapus Template HPP
            </p>
            <p className="text-sm text-skin-text">
              Hapus template untuk <strong>{deleteTarget.kode_produk}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-red-500 hover:bg-red-600 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </ProduksiLayout>
  );
}