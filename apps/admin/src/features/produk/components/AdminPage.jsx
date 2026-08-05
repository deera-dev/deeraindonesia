import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useInvalidateProducts, useProducts } from "@deera/shared/features/products/hooks";
import { supabase } from "@deera/shared/lib/supabase";
import { signOut, useAuth } from "@deera/shared/features/auth/hooks";
import { useTheme } from "@deera/shared/features/theme/hooks";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import BackToTop from "@deera/shared/components/BackToTop";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { shareProductViaWA, filterAndSortProducts } from "../utils";
import ToastContainer from "@deera/shared/components/ToastContainer";
import { toast } from "@deera/shared/features/toast/hooks";
import { logHistory } from "../../history/hooks";
import {
  useStokMap,
  useSoldQtyMap,
  useDeleteProductCascade,
  usePushNotification,
  useProductFilter,
} from "../hooks";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import ProductCard from "./ProductCard";
import ProductDetailModal from "./ProductDetailModal";
import ProductForm from "./ProductForm";
import ProductFilterModal from "./ProductFilterModal";

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { products, loading, error } = useProducts();
  const invalidateProducts = useInvalidateProducts();
  usePushNotification();

  const { stokMap, reload: reloadStok } = useStokMap();
  const soldQtyMap = useSoldQtyMap();
  const deleteProductCascade = useDeleteProductCascade();
  const {
    applied: appliedFilter,
    draft: draftFilter,
    isModalOpen,
    openModal,
    closeModal,
    setDraft,
    applyDraft,
    resetAll: resetFilters,
    hasActiveFilter,
  } = useProductFilter();

  const [editing, setEditing] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(null);
  const [search, setSearch] = useState("");
  const [transferNotif, setTransferNotif] = useState(null);

  useEffect(() => {
    const channel = supabase
      .channel("admin-transfer-notif")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transfers" },
        (payload) => {
          const t = payload.new;
          if (t.status === "pending" && t.created_by !== user?.email) {
            setTransferNotif(t);
            setTimeout(() => setTransferNotif(null), 12000);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const kode = deleteTarget.kode;
    setDeleting(true);
    try {
      await deleteProductCascade(kode);
      await logHistory({
        action: "hapus",
        category: "produk",
        kode: deleteTarget.kode,
        nama: deleteTarget.nama,
        snapshot: deleteTarget,
        before: deleteTarget,
      });
      invalidateProducts();
      setDeleteTarget(null);
      reloadStok();
      toast.success(`${kode} berhasil dihapus.`);
    } catch (e) {
      toast.error("Gagal hapus produk: " + e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleShareWA(product) {
    try {
      const { method } = await shareProductViaWA(product);
      if (method === "share-file" || method === "share-text") {
        setCopied(product.kode);
        setTimeout(() => setCopied(null), 3000);
      }
    } catch {
      // shareProductViaWA sendiri tidak pernah throw (semua path sudah
      // ditangani secara internal) — guard ini murni jaring pengaman.
    }
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin";

  const allWarna = useMemo(() => {
    const set = new Set();
    (products ?? []).forEach((p) => (p.warna ?? []).forEach((w) => set.add(w)));
    return [...set].sort();
  }, [products]);

  const sorted = useMemo(
    () =>
      filterAndSortProducts(products, appliedFilter, { stokMap, soldQtyMap, search }),
    [products, appliedFilter, stokMap, soldQtyMap, search],
  );

  const previewCount = useMemo(
    () =>
      isModalOpen
        ? filterAndSortProducts(products, draftFilter, { stokMap, soldQtyMap, search }).length
        : 0,
    [isModalOpen, products, draftFilter, stokMap, soldQtyMap, search],
  );

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-2xl leading-none">DEERA</h1>
            <p className="mt-1 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase truncate">
              {displayName} &middot; {products?.length ?? 0} Produk
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase text-skin-text3 border-2 border-skin-bdr hover:text-red-600 hover:border-red-200 transition"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="px-3 py-4 md:px-8 md:py-6">
        {loading && (
          <p className="font-editorial text-base text-skin-text3 tracking-[0.2em] text-center py-20">
            Memuat produk...
          </p>
        )}
        {error && <p className="font-editorial text-base text-red-600 py-10">{error.message}</p>}

        {!loading && !error && (
          <>
            {(products?.length ?? 0) > 0 && (
              <div className="mb-4 md:max-w-xl">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kode, nama, bahan..."
                  className="w-full bg-skin-card border-2 border-skin-bdr px-4 py-4 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition font-editorial placeholder:text-skin-text4"
                />
                {search.trim() && (
                  <p className="mt-2 text-sm text-skin-text3 font-editorial">
                    {sorted.length} produk &middot; &ldquo;{search}&rdquo;
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={openModal}
                    className={`px-4 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase border-2 transition ${
                      hasActiveFilter
                        ? "bg-[#CAB170] border-[#CAB170] text-white"
                        : "bg-skin-card border-skin-bdr text-skin-text3 hover:border-[#CAB170]"
                    }`}
                  >
                    Filter{hasActiveFilter ? ` (${sorted.length})` : ""}
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

            {products?.length === 0 && (
              <div className="text-center py-20">
                <p className="font-editorial text-lg text-skin-text3 tracking-[0.2em]">
                  Belum ada produk
                </p>
                <Link
                  to="/produksi/record"
                  className="mt-6 inline-block px-8 py-4 bg-[#CAB170] text-white font-editorial text-base tracking-[0.2em] uppercase hover:bg-[#A8925A] transition"
                >
                  Tambah Produk Pertama
                </Link>
              </div>
            )}
            {sorted.length === 0 && products?.length > 0 && (
              <p className="text-center text-base text-skin-text4 py-16 font-editorial">
                Tidak ada produk yang cocok
              </p>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {sorted.map((p) => (
                <ProductCard
                  key={p.kode}
                  product={p}
                  stok={stokMap[p.kode] ?? { gudang: 0, cideng: 0, tegalgubug: 0 }}
                  onTap={() => setDetailProduct(p)}
                  onCopyWA={() => handleShareWA(p)}
                  isCopied={copied === p.kode}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <ProductFilterModal
          draft={draftFilter}
          onChange={setDraft}
          allWarna={allWarna}
          previewCount={previewCount}
          onApply={applyDraft}
          onReset={resetFilters}
          onClose={closeModal}
        />
      )}

      {transferNotif && (
        <div className="fixed top-4 right-4 z-50 bg-skin-card border-2 border-amber-500 shadow-2xl w-80 max-w-[calc(100vw-2rem)]">
          <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-[0.1em]">
                Transfer Baru
              </p>
              <p className="text-sm text-skin-text font-semibold mt-0.5 truncate">
                {transferNotif.created_by_name}
              </p>
              <p className="text-xs text-skin-text3 mt-0.5">
                {LOCATION_LABELS[transferNotif.from_location]} &rarr;{" "}
                {LOCATION_LABELS[transferNotif.to_location]} &middot;{" "}
                {(transferNotif.items ?? []).reduce((s, i) => s + i.qty, 0)} pcs
              </p>
            </div>
            <button
              onClick={() => setTransferNotif(null)}
              className="flex-shrink-0 text-skin-text3 hover:text-skin-text text-xl w-8 h-8 flex items-center justify-center"
            >
              X
            </button>
          </div>
          <div className="px-4 pb-4">
            <Link
              to="/transfer"
              onClick={() => setTransferNotif(null)}
              className="block text-center py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold uppercase tracking-[0.1em] transition"
            >
              Lihat Transfer
            </Link>
          </div>
        </div>
      )}

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          stok={stokMap[detailProduct.kode] ?? { gudang: 0, cideng: 0, tegalgubug: 0 }}
          onClose={() => setDetailProduct(null)}
          onEdit={() => setEditing(detailProduct)}
        />
      )}

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDelete={
            editing !== "new"
              ? () => {
                  setDeleteTarget(editing);
                  setEditing(null);
                }
              : undefined
          }
          onSaved={(msg) => {
            setEditing(null);
            invalidateProducts();
            reloadStok();
            toast.success(msg ?? "Produk berhasil disimpan.");
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-skin-card border-2 border-red-500/40 p-6 w-full max-w-sm space-y-4">
            <p className="font-editorial text-sm tracking-[0.15em] uppercase text-red-400">
              Hapus Produk
            </p>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-skin-text">
                {deleteTarget.kode} &mdash; {deleteTarget.nama}
              </p>
              <p className="text-xs text-skin-text3">Tindakan ini akan menghapus permanen:</p>
              <ul className="text-xs text-skin-text3 space-y-0.5 pl-3 list-disc">
                <li>Data produk</li>
                <li>Stok (semua lokasi)</li>
                <li>Template HPP</li>
                <li>Expected stok / buku potongan</li>
                <li>Semua catatan batch produksi</li>
              </ul>
              <p className="text-xs text-red-400 pt-1 font-semibold">Tidak bisa dibatalkan.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Hapus Semua"}
              </button>
            </div>
          </div>
        </div>
      )}
      <BackToTop />
      <AdminSidebar />
      <AdminBottomNav />
    </main>
  );
}
