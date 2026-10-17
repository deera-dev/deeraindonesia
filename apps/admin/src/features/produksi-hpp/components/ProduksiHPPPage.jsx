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
  fieldFullCls,
  labelCls,
  HPP_TABS,
  getBatchSiblingKodes,
  filterAndSortHppTemplates,
  produksiTotalPcsByKode,
} from "../utils";
import HPPForm from "./HPPForm";
import HPPCard from "./HPPCard";
import HPPFilterModal from "./HPPFilterModal";
import HppTemplateDetailSheet from "./HppTemplateDetailSheet";
import HPPShareModal from "./HPPShareModal";
import HargaDasarPanel from "./HargaDasarPanel";
import KalkulatorHPP from "./KalkulatorHPP";

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
  const [editing, setEditing] = useState(null);
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

  const produksiTotalByKode = useMemo(() => produksiTotalPcsByKode(batches), [batches]);

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
  function openShare(tpl) {
    setDetailTpl(null);
    setShareHPP(tpl);
  }

  const headerAction = (
    <button
      onClick={openNew}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition whitespace-nowrap"
    >
      + Buat HPP
    </button>
  );

  return (
    <ProduksiLayout title="HPP Produk" headerAction={headerAction}>
      <div className="flex border border-skin-bdr mb-5">
        {HPP_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 font-editorial text-xs tracking-[0.18em] uppercase transition border-r last:border-r-0 border-skin-bdr ${
              activeTab === key
                ? "bg-skin-accent text-skin-on-accent"
                : "text-skin-text3 hover:text-skin-text bg-skin-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "template" && (
        <>
          {!loading && templates.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openFilterModal}
                  aria-label={hasActiveFilter ? `Filter (${sortedTemplates.length})` : "Filter"}
                  title="Filter"
                  className={`relative flex-shrink-0 w-11 h-11 flex items-center justify-center border-2 transition ${
                    hasActiveFilter
                      ? "bg-skin-accent border-skin-accent text-skin-on-accent"
                      : "bg-skin-card border-skin-bdr text-skin-text3 hover:border-skin-accent hover:text-skin-accent-text"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
                  </svg>
                  {hasActiveFilter && (
                    <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-skin-card border-2 border-skin-accent text-skin-accent-text text-[10px] font-bold flex items-center justify-center">
                      {sortedTemplates.length}
                    </span>
                  )}
                </button>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kode atau nama produk..."
                  className="flex-1 min-w-0 h-11 bg-skin-card border-2 border-skin-bdr px-4 text-base text-skin-text focus:outline-none focus:border-skin-accent transition font-editorial placeholder:text-skin-text4"
                />
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex-shrink-0 text-xs font-editorial tracking-[0.1em] uppercase text-skin-text3 hover:text-red-500 underline"
                  >
                    Hapus
                  </button>
                )}
              </div>
              {search.trim() && (
                <p className="mt-2 text-sm text-skin-text3 font-editorial">
                  {sortedTemplates.length} template &middot; &ldquo;{search}&rdquo;
                </p>
              )}
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
            <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3 2xl:grid-cols-4">
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

      {activeTab === "harga-dasar" && (
        <div className="md:max-w-4xl">
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

      {activeTab === "kalkulator" && (
        <div className="md:max-w-4xl">
          <KalkulatorHPP fmtRp={fmtRp} fieldFullCls={fieldFullCls} labelCls={labelCls} config={config} templates={templates} />
        </div>
      )}


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
                produksiTotalByKode={produksiTotalByKode}
                onSave={handleSave}
                onCancel={closeForm}
              />
            </div>
          </div>
        </div>
      )}

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
