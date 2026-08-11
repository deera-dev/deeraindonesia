/**
 * ProduksiHPPPage.jsx — Halaman template HPP per produk.
 *
 * Tab "Template HPP" : daftar & kelola template HPP
 * Tab "Kalkulator"   : estimasi cepat (tidak disimpan ke DB)
 * Tab "Harga Dasar"  : konfigurasi komponen biaya default
 *
 * Form mendukung multi-produk (gelaran) sekaligus.
 * onSave menerima array of payloads → upsert satu per satu (lihat features/produksi-hpp/api.js).
 *
 * Dependency Inversion: halaman ini HANYA bergantung pada "../hooks" (public surface
 * fitur), tidak pernah mengimpor api.js/queries.js secara langsung.
 *
 * ── Redesign UX (2026-07) ──────────────────────────────────────────────────
 * Lihat UX_REDESIGN_TEMPLATE_HPP_HARGA_DASAR.md di root repo untuk kritik &
 * alasan lengkap. Ringkasan perubahan di file ini:
 * - Tab "Harga Dasar" DULU tidak pernah tampil sama sekali: kondisi render
 *   di bawah mengecek `activeTab === "config"`, padahal tombol tab men-set
 *   `activeTab` ke `"harga-dasar"` (lihat HPP_TABS di utils.js). Diperbaiki
 *   di sini — sekarang kondisinya `activeTab === "harga-dasar"`.
 * - Editing Harga Dasar (dulu inline <input> + state editedCfg/savingCfg
 *   langsung di halaman ini) dipindah sepenuhnya ke <HargaDasarPanel/>,
 *   yang mengelola state edit-nya sendiri (grouped list + Bottom Sheet
 *   tap-to-edit).
 * - Detail Template HPP (dulu accordion in-place di dalam HPPCard) sekarang
 *   Bottom Sheet terpisah (<HppTemplateDetailSheet/>), dibuka dari
 *   `detailTpl`. Aksi "Bagikan" dari card ATAU dari sheet keduanya memanggil
 *   `openShare()` yang sama, yang menutup sheet detail (kalau sedang
 *   terbuka) lalu membuka modal share PNG yang sudah ada.
 */
import { useState, useMemo } from "react";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { useProducts, useInvalidateProducts } from "@deera/shared/features/products/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import ProduksiLayout from "../../../shared/components/ProduksiLayout";
import { useBatches } from "../../produksi-record/hooks";
import {
  useHppTemplates,
  useHppTemplateFilter,
  useHppConfig,
  useHppConfigRows,
  useBahanOptions,
  useSaveHppTemplates,
  useDeleteHppTemplate,
  useSaveHppConfig,
} from "../hooks";
import {
  fmtRp,
  calcTotal,
  fieldFullCls,
  labelCls,
  HPP_TABS,
  getBatchSiblingKodes,
  filterAndSortHppTemplates,
} from "../utils";
import HPPForm from "./HPPForm";
import HPPCard from "./HPPCard";
import HPPFilterModal from "./HPPFilterModal";
import HppTemplateDetailSheet from "./HppTemplateDetailSheet";
import HPPShareModal from "./HPPShareModal";
import HargaDasarPanel from "./HargaDasarPanel";
import KalkulatorHPP from "./KalkulatorHPP";

// ─────────────────────────────────────────────────────────────────────────────
// NOTE (dead code, dipertahankan verbatim dari pages/ProduksiHPP.jsx lama):
// `RangeSlider` tidak punya satupun pemakaian JSX di file aslinya (grep-confirmed
// sebelum migrasi). Dibawa apa adanya mengikuti konvensi "dead code dipertahankan,
// bukan dihapus sepihak" di ARCHITECTURE.md, agar refactor arsitektur tidak diam-diam
// mengubah perilaku/menghapus kode yang belum diminta Denny untuk dibersihkan.
// ─────────────────────────────────────────────────────────────────────────────
function RangeSlider({ label, min, max, step, value, onChange, fmtRp }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">
          {label}
        </label>
        <span className="text-xs font-bold text-[#CAB170]">{fmtRp(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
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

export default function ProduksiHPPPage() {
  const { user } = useAuth();
  const { products } = useProducts();
  const invalidateProducts = useInvalidateProducts();

  const { templates, loading } = useHppTemplates();
  const { batches } = useBatches();
  const config = useHppConfig();
  const { rows: configRows, loading: configRowsLoading, error: configRowsError, refetch: refetchConfigRows } = useHppConfigRows();
  const bahanOptions = useBahanOptions();

  const saveHppTemplates = useSaveHppTemplates();
  const deleteHppTemplate = useDeleteHppTemplate();
  const saveHppConfig = useSaveHppConfig();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit single
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailTpl, setDetailTpl] = useState(null);
  const [shareHPP, setShareHPP] = useState(null);
  const [activeTab, setActiveTab] = useState("template");
  const [search, setSearch] = useState("");
  const {
    applied: appliedFilter,
    draft: draftFilter,
    isModalOpen: isFilterModalOpen,
    openModal: openFilterModal,
    closeModal: closeFilterModal,
    setDraft: setFilterDraft,
    applyDraft: applyFilterDraft,
    resetAll: resetFilters,
    hasActiveFilter,
  } = useHppTemplateFilter();

  const sortedTemplates = useMemo(
    () => filterAndSortHppTemplates(templates, appliedFilter, { products, search }),
    [templates, appliedFilter, products, search],
  );

  const previewCount = useMemo(
    () =>
      isFilterModalOpen
        ? filterAndSortHppTemplates(templates, draftFilter, { products, search }).length
        : 0,
    [isFilterModalOpen, templates, draftFilter, products, search],
  );

  const editingSiblingKodes = useMemo(
    () => (editing ? getBatchSiblingKodes(batches, editing.kode_produk) : []),
    [editing, batches],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // NOTE (dead code, dipertahankan verbatim dari pages/ProduksiHPP.jsx lama):
  // Seluruh state kalkulator-dari-template di bawah ini (calcTemplate dst.),
  // beserta loadCalcFromTemplate() dan calcResult, sudah terputus dari UI yang
  // dirender — tidak ada pemicu yang memanggil loadCalcFromTemplate, dan
  // calcResult tidak pernah dibaca di JSX manapun pada file aslinya. Tab
  // "Kalkulator" yang benar-benar tampil memakai komponen <KalkulatorHPP/>
  // yang sepenuhnya independen (state lokalnya sendiri). Blok ini dibawa apa
  // adanya mengikuti konvensi "dead code dipertahankan" agar refactor arsitektur
  // tidak diam-diam menghapus kode di luar lingkup yang diminta.
  // ─────────────────────────────────────────────────────────────────────────
  const [calcTemplate, setCalcTemplate] = useState("");
  const [calcBahanItems, setCalcBahanItems] = useState([]);
  const [calcUpah, setCalcUpah] = useState("");
  const [calcBordir, setCalcBordir] = useState("0");
  const [calcKancingQty, setCalcKancingQty] = useState("0");
  const [calcKancingExtra, setCalcKancingExtra] = useState("0");
  const [calcStudio, setCalcStudio] = useState("0");

  function loadCalcFromTemplate(kodeProduk) {
    setCalcTemplate(kodeProduk);
    if (!kodeProduk) {
      setCalcBahanItems([]);
      return;
    }
    const tpl = templates.find((t) => t.kode_produk === kodeProduk);
    if (!tpl) return;
    setCalcBahanItems((tpl.bahan_items ?? []).map((b) => ({ ...b })));
    setCalcUpah(String(tpl.upah_jahit ?? ""));
    setCalcBordir(String(tpl.bordir ?? "0"));
    setCalcKancingQty(String(tpl.kancing_qty ?? "0"));
    setCalcKancingExtra(String(tpl.kancing_extra ?? "0"));
    setCalcStudio(String(tpl.biaya_studio ?? "0"));
  }

  const calcResult = (() => {
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
    } catch {
      return null;
    }
  })();
  // ── akhir blok dead code ────────────────────────────────────────────────

  async function handleSave(payloads) {
    const arr = Array.isArray(payloads) ? payloads : [payloads];
    await saveHppTemplates(arr, templates, user?.email);
    invalidateProducts();
    toast.success(
      arr.length > 1
        ? `${arr.length} template HPP berhasil disimpan.`
        : "Template HPP berhasil disimpan.",
    );
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteHppTemplate(deleteTarget);
    toast.success("Template HPP dihapus.");
    setDeleteTarget(null);
  }

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(tpl) {
    setDetailTpl(null);
    setEditing(tpl);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }
  function openDelete(tpl) {
    setDetailTpl(null);
    setDeleteTarget(tpl);
  }
  /** Dipanggil dari tombol "Bagikan" di card ATAU CTA di Bottom Sheet Detail —
   *  keduanya membuka modal share PNG yang sama; sheet detail (kalau sedang
   *  terbuka) ditutup dulu supaya tidak ada dua overlay bertumpuk. */
  function openShare(tpl) {
    setDetailTpl(null);
    setShareHPP(tpl);
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
        {HPP_TABS.map(({ key, label }) => (
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
          {!loading && templates.length > 0 && (
            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode atau nama produk..."
                className="w-full bg-skin-card border-2 border-skin-bdr px-4 py-4 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition font-editorial placeholder:text-skin-text4"
              />
              {search.trim() && (
                <p className="mt-2 text-sm text-skin-text3 font-editorial">
                  {sortedTemplates.length} template &middot; &ldquo;{search}&rdquo;
                </p>
              )}

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={openFilterModal}
                  className={`px-4 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase border-2 transition ${
                    hasActiveFilter
                      ? "bg-[#CAB170] border-[#CAB170] text-white"
                      : "bg-skin-card border-skin-bdr text-skin-text3 hover:border-[#CAB170]"
                  }`}
                >
                  Filter{hasActiveFilter ? ` (${sortedTemplates.length})` : ""}
                </button>

                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-editorial tracking-[0.1em] uppercase text-skin-text3 hover:text-red-500 underline"
                  >
                    Hapus Filter
                  </button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">Belum ada template HPP.</p>
          ) : sortedTemplates.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">
              Tidak ada template HPP yang cocok.
            </p>
          ) : (
            /* HPPCard tidak punya state expand/collapse sendiri (detail
               sekarang di Bottom Sheet terpisah) — tinggi tiap kartu
               konsisten, jadi grid biasa (bukan masonry) aman dipakai. */
            <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
              {sortedTemplates.map((tpl) => (
                <HPPCard
                  key={tpl.id}
                  tpl={tpl}
                  produk={products?.find((p) => p.kode === tpl.kode_produk)}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onShare={openShare}
                  onOpenDetail={setDetailTpl}
                />
              ))}
            </div>
          )}

          {isFilterModalOpen && (
            <HPPFilterModal
              draft={draftFilter}
              onChange={setFilterDraft}
              previewCount={previewCount}
              onApply={applyFilterDraft}
              onReset={resetFilters}
              onClose={closeFilterModal}
            />
          )}
        </>
      )}

      {/* ── Harga Dasar ──
          Bug lama: kondisi di sini mengecek `activeTab === "config"`, padahal
          tombol tab men-set activeTab ke "harga-dasar" (lihat HPP_TABS di
          utils.js) — tab ini TIDAK PERNAH tampil sebelum perbaikan ini. */}
      {activeTab === "harga-dasar" && (
        <div className="md:max-w-2xl md:mx-auto">
          <HargaDasarPanel
            rows={configRows}
            loading={configRowsLoading}
            error={configRowsError}
            onSave={saveHppConfig}
            userEmail={user?.email}
            onRetry={refetchConfigRows}
          />
        </div>
      )}

      {/* ── Kalkulator HPP ── */}
      {activeTab === "kalkulator" && (
        <div className="md:max-w-2xl md:mx-auto">
          <KalkulatorHPP fmtRp={fmtRp} fieldFullCls={fieldFullCls} labelCls={labelCls} config={config} />
        </div>
      )}


      {/* ── Modal Form HPP ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeForm} />
          <div className="relative bg-skin-card w-full max-w-lg h-[95dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
            <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
              <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
                {editing
                  ? `Edit HPP — ${editing.kode_produk}${editingSiblingKodes.length > 0 ? ` (+${editingSiblingKodes.length} produk 1 gelaran)` : ""}`
                  : "Buat Template HPP"}
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
                siblingKodes={editingSiblingKodes}
                templates={templates}
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
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Sheet Detail Template HPP ── */}
      {detailTpl && (
        <HppTemplateDetailSheet
          tpl={detailTpl}
          produk={products?.find((p) => p.kode === detailTpl.kode_produk)}
          onClose={() => setDetailTpl(null)}
          onEdit={openEdit}
          onDelete={openDelete}
          onShare={openShare}
        />
      )}

      {/* ── Modal Share HPP ── */}
      {shareHPP && (
        <HPPShareModal
          tpl={shareHPP}
          produk={products?.find((p) => p.kode === shareHPP.kode_produk)}
          onClose={() => setShareHPP(null)}
        />
      )}
    </ProduksiLayout>
  );
}
