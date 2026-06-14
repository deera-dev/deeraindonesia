import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { invalidateProducts, useProducts } from "@deera/shared/hooks/useProducts";
import { supabase } from "@deera/shared/lib/supabase";
import { signOut } from "@deera/shared/lib/auth";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { useTheme } from "@deera/shared/hooks/useTheme";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import BackToTop from "@deera/shared/components/BackToTop";
import { generateWAText } from "@deera/shared/lib/waFormat";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { logHistory } from "../hooks/useHistory";
import { usePushNotification } from "../hooks/usePushNotification";
import ProductCard from "../components/admin/ProductCard";
import ProductDetailModal from "../components/admin/ProductDetailModal";
import ProductForm from "../components/admin/ProductForm";
import AdminBottomNav from "../components/AdminBottomNav";
import ToastContainer from "@deera/shared/components/ToastContainer";
import { toast } from "@deera/shared/lib/toast";

const CATALOG_URL = import.meta.env.VITE_CATALOG_URL ?? "https://deera.id";

async function fetchStokMap() {
  const { data, error } = await supabase
    .from("stok_warna")
    .select("kode, size, gudang, cideng, tegalgubug");
  if (error || !data) return {};
  const map = {};
  for (const row of data) {
    if (!map[row.kode]) map[row.kode] = { gudang: 0, cideng: 0, tegalgubug: 0, sizes: {} };
    map[row.kode].gudang += row.gudang ?? 0;
    map[row.kode].cideng += row.cideng ?? 0;
    map[row.kode].tegalgubug += row.tegalgubug ?? 0;
    if (!map[row.kode].sizes[row.size]) {
      map[row.kode].sizes[row.size] = { gudang: 0, cideng: 0, tegalgubug: 0 };
    }
    map[row.kode].sizes[row.size].gudang += row.gudang ?? 0;
    map[row.kode].sizes[row.size].cideng += row.cideng ?? 0;
    map[row.kode].sizes[row.size].tegalgubug += row.tegalgubug ?? 0;
  }
  return map;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { products, loading, error } = useProducts();
  usePushNotification();

  const [editing, setEditing] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(null);
  const [stokMap, setStokMap] = useState({});
  const [search, setSearch] = useState("");
  const [transferNotif, setTransferNotif] = useState(null);

  function loadStok() {
    fetchStokMap().then(setStokMap);
  }
  useEffect(() => {
    loadStok();
  }, []);

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
      await supabase.from("produksi_batch").delete().eq("kode_produk", kode);
      await supabase.from("expected_stok").delete().eq("kode", kode);
      await supabase.from("hpp_template").delete().eq("kode_produk", kode);
      await supabase.from("stok_warna").delete().eq("kode", kode);
      await supabase.from("products").delete().eq("kode", kode);
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
      loadStok();
      toast.success(`${kode} berhasil dihapus.`);
    } catch (e) {
      toast.error("Gagal hapus produk: " + e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleCopyWA(product) {
    const text = generateWAText(product);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(product.kode);
    setTimeout(() => setCopied(null), 2500);
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin";

  const q = search.trim().toLowerCase();
  const filtered = q
    ? [...(products ?? [])].filter(
        (p) =>
          p.kode.toLowerCase().includes(q) ||
          (p.nama ?? "").toLowerCase().includes(q) ||
          (p.bahan ?? "").toLowerCase().includes(q),
      )
    : [...(products ?? [])];
  const sorted = filtered.sort(
    (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20">
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
              <div className="mb-4">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kode, nama, bahan..."
                  className="w-full bg-skin-card border-2 border-skin-bdr px-4 py-4 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition font-editorial placeholder:text-skin-text4"
                />
                {q && (
                  <p className="mt-2 text-sm text-skin-text3 font-editorial">
                    {sorted.length} produk &middot; &ldquo;{search}&rdquo;
                  </p>
                )}
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

            <div className="grid grid-cols-3 gap-3">
              {sorted.map((p) => (
                <ProductCard
                  key={p.kode}
                  product={p}
                  stok={stokMap[p.kode] ?? { gudang: 0, cideng: 0, tegalgubug: 0 }}
                  onTap={() => setDetailProduct(p)}
                  onCopyWA={() => handleCopyWA(p)}
                  isCopied={copied === p.kode}
                />
              ))}
            </div>
          </>
        )}
      </div>

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
            loadStok();
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

      <AdminBottomNav />
      <BackToTop bottomClass="bottom-24" />
      <ToastContainer />
    </main>
  );
}
