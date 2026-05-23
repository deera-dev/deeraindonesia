import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  invalidateProducts,
  useProducts,
} from "@deera/shared/hooks/useProducts";
import { supabase } from "@deera/shared/lib/supabase";
import { signOut } from "@deera/shared/lib/auth";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { useTheme } from "@deera/shared/hooks/useTheme";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import { generateWAText } from "@deera/shared/lib/waFormat";
import { logHistory } from "../hooks/useHistory";
import ProductCard from "../components/admin/ProductCard";
import ProductDetailModal from "../components/admin/ProductDetailModal";
import ProductForm from "../components/admin/ProductForm";

const CATALOG_URL = import.meta.env.VITE_CATALOG_URL ?? "https://deera.id";

async function fetchStokMap() {
  const { data, error } = await supabase
    .from("stok_warna")
    .select("kode, gudang, cideng, tegalgubug");
  if (error || !data) return {};
  const map = {};
  for (const row of data) {
    if (!map[row.kode]) map[row.kode] = { gudang: 0, cideng: 0, tegalgubug: 0 };
    map[row.kode].gudang += row.gudang ?? 0;
    map[row.kode].cideng += row.cideng ?? 0;
    map[row.kode].tegalgubug += row.tegalgubug ?? 0;
  }
  return map;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { products, loading, error } = useProducts();

  const [editing, setEditing] = useState(null); // null | "new" | product obj
  const [copied, setCopied] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stokMap, setStokMap] = useState({});
  const [search, setSearch] = useState("");

  function loadStok() {
    fetchStokMap().then(setStokMap);
  }
  useEffect(() => {
    loadStok();
  }, []);

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  async function handleDelete(product) {
    if (!window.confirm(`Hapus produk ${product.kode}?`)) return;
    const { error: delErr } = await supabase
      .from("products")
      .delete()
      .eq("kode", product.kode);
    if (delErr) {
      alert("Gagal hapus: " + delErr.message);
      return;
    }
    await supabase.from("stok_warna").delete().eq("kode", product.kode);
    await logHistory({
      action: "hapus",
      kode: product.kode,
      nama: product.nama,
      snapshot: product,
    });
    invalidateProducts();
    window.location.reload();
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

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin";

  // Filter + sort
  const q = search.trim().toLowerCase();
  const filtered = q
    ? [...(products ?? [])].filter(
        (p) =>
          p.kode.toLowerCase().includes(q) ||
          (p.nama ?? "").toLowerCase().includes(q) ||
          (p.bahan ?? "").toLowerCase().includes(q),
      )
    : [...(products ?? [])];
  const sorted = filtered.sort((a, b) => b.kode.localeCompare(a.kode));

  return (
    <main className="min-h-screen bg-skin-page text-skin-text">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-2xl leading-none md:text-3xl">
              DEERA
            </h1>
            <p className="mt-1 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase truncate">
              {displayName} · {products?.length ?? 0} Produk
            </p>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/admin/transfer"
              className="px-5 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 border-2 border-skin-bdr hover:border-[#CAB170] hover:text-[#CAB170] transition"
            >
              Transfer
            </Link>
            <Link
              to="/admin/history"
              className="px-5 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 border-2 border-skin-bdr hover:border-[#CAB170] hover:text-[#CAB170] transition"
            >
              Riwayat
            </Link>
            <a
              href={`${CATALOG_URL}/catalog`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 border-2 border-skin-bdr hover:border-[#CAB170] hover:text-[#CAB170] transition"
            >
              Katalog ↗
            </a>
            <button
              onClick={() => setEditing("new")}
              className="px-6 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
            >
              Tambah
            </button>
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            <button
              onClick={handleLogout}
              className="px-5 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-skin-text3 border-2 border-skin-bdr hover:text-red-600 hover:border-red-200 transition"
            >
              Keluar
            </button>
          </div>

          {/* Mobile: + Tambah + theme + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setEditing("new")}
              className="px-4 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
            >
              Tambah
            </button>
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-11 h-11 flex flex-col items-center justify-center gap-1.5 text-skin-text2 border-2 border-skin-bdr transition"
              aria-label="Menu"
            >
              <span
                className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`}
              />
              <span
                className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block w-5 h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t-2 border-skin-bdr bg-skin-card px-4 py-3 flex flex-col gap-1">
            <Link
              to="/admin/transfer"
              onClick={() => setMenuOpen(false)}
              className="py-3.5 font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 border-b border-skin-bdr-lt hover:text-[#CAB170] transition"
            >
              Transfer Stok
            </Link>
            <Link
              to="/admin/history"
              onClick={() => setMenuOpen(false)}
              className="py-3.5 font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 border-b border-skin-bdr-lt hover:text-[#CAB170] transition"
            >
              Riwayat
            </Link>
            <a
              href={`${CATALOG_URL}/catalog`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="py-3.5 font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 border-b border-skin-bdr-lt hover:text-[#CAB170] transition"
            >
              Katalog ↗
            </a>
            <button
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className="py-3.5 text-left font-editorial text-sm tracking-[0.2em] uppercase text-red-500"
            >
              Keluar
            </button>
          </div>
        )}
      </header>

      {/* ── Content ── */}
      <div className="px-3 py-4 md:px-8 md:py-6">
        {loading && (
          <p className="font-editorial text-base text-skin-text3 tracking-[0.2em] text-center py-20">
            Memuat produk...
          </p>
        )}
        {error && (
          <p className="font-editorial text-base text-red-600 py-10">
            {error.message}
          </p>
        )}

        {!loading && !error && (
          <>
            {/* Search */}
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
                    {sorted.length} produk · &ldquo;{search}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* Empty states */}
            {products?.length === 0 && (
              <div className="text-center py-20">
                <p className="font-editorial text-lg text-skin-text3 tracking-[0.2em]">
                  Belum ada produk
                </p>
                <button
                  onClick={() => setEditing("new")}
                  className="mt-6 px-8 py-4 bg-[#CAB170] text-white font-editorial text-base tracking-[0.2em] uppercase hover:bg-[#A8925A] transition"
                >
                  Tambah Produk Pertama
                </button>
              </div>
            )}
            {sorted.length === 0 && products?.length > 0 && (
              <p className="text-center text-base text-skin-text4 py-16 font-editorial">
                Tidak ada produk yang cocok
              </p>
            )}

            {/* Grid produk */}
            <div className="grid grid-cols-3 gap-3">
              {sorted.map((p) => (
                <ProductCard
                  key={p.kode}
                  product={p}
                  stok={
                    stokMap[p.kode] ?? { gudang: 0, cideng: 0, tegalgubug: 0 }
                  }
                  onTap={() => setEditing(p)}
                  onCopyWA={() => handleCopyWA(p)}
                  isCopied={copied === p.kode}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Form edit/tambah produk ── */}
      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDelete={
            editing !== "new"
              ? () => {
                  setEditing(null);
                  handleDelete(editing);
                }
              : undefined
          }
          onSaved={() => {
            setEditing(null);
            invalidateProducts();
            loadStok();
            window.location.reload();
          }}
        />
      )}
    </main>
  );
}
