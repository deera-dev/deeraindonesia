/**
 * ProduksiHPP.jsx — Halaman template HPP per produk.
 *
 * Tab "Template HPP" : daftar & kelola template HPP
 * Tab "Harga Dasar"  : konfigurasi komponen biaya default
 *
 * Form kini mendukung multi-produk (gelaran) sekaligus.
 * onSave menerima array of payloads → upsert satu per satu.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { useProducts, invalidateProducts } from "@deera/shared/hooks/useProducts";
import BackToTop from "@deera/shared/components/BackToTop";
import ProduksiLayout from "../components/produksi/ProduksiLayout";
import { logHistory } from "../hooks/useHistory";
import { toast } from "@deera/shared/lib/toast";
import { fetchBahanOptions, fetchConfig, fmtRp } from "../components/produksi/hpp/hppUtils";
import HPPForm from "../components/produksi/hpp/HPPForm";
import HPPCard from "../components/produksi/hpp/HPPCard";

const fieldFullCls =
  "w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
const labelCls = "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

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