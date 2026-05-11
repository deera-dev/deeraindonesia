import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { invalidateProducts, useProducts } from "../hooks/useProducts";
import { supabase } from "../lib/supabase";
import { signOut } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import { generateWAText } from "../lib/waFormat";
import { logHistory } from "../hooks/useHistory";
import ProductCard from "../components/admin/ProductCard";
import ProductForm from "../components/admin/ProductForm";

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, loading, error } = useProducts();
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(null);

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

  return (
    <main className="min-h-screen text-white bg-black">
      <header className="sticky top-0 z-30 px-4 py-4 border-b bg-black/95 backdrop-blur border-white/10 md:px-12">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-headline text-xl text-[#cab170] leading-none md:text-2xl">
              DEERA
            </h1>
            <p className="mt-1 font-editorial text-[9px] tracking-[0.2em] text-white/40 uppercase truncate">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin"} &middot; {products?.length ?? 0} Produk
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Link
              to="/admin/history"
              className="px-3 py-1.5 font-editorial text-[9px] tracking-[0.2em] uppercase text-white/50 border border-white/10 hover:border-white/40 hover:text-white transition"
            >
              Riwayat
            </Link>
            <Link
              to="/catalog"
              className="px-3 py-1.5 font-editorial text-[9px] tracking-[0.2em] uppercase text-white/60 border border-white/15 hover:border-white/50 hover:text-white transition"
            >
              Katalog
            </Link>
            <button
              onClick={() => setEditing("new")}
              className="px-3 py-1.5 font-editorial text-[9px] tracking-[0.2em] uppercase text-black bg-[#cab170] hover:bg-[#a8925a] transition"
            >
              Tambah
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 font-editorial text-[9px] tracking-[0.2em] uppercase text-white/40 border border-white/10 hover:border-white/30 hover:text-white/70 transition"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 py-10 md:px-12">
        {loading && (
          <p className="font-editorial text-xs tracking-[0.3em] text-white/40">
            Loading...
          </p>
        )}
        {error && (
          <p className="font-editorial text-sm text-red-400">{error.message}</p>
        )}
        {!loading && !error && products?.length === 0 && (
          <p className="font-editorial text-xs tracking-[0.3em] text-white/40">
            Belum ada produk
          </p>
        )}

        {!loading && !error && products?.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((p) => (
              <ProductCard
                key={p.kode}
                product={p}
                onEdit={() => setEditing(p)}
                onDelete={() => handleDelete(p)}
                onCopyWA={() => handleCopyWA(p)}
                isCopied={copied === p.kode}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidateProducts();
            window.location.reload();
          }}
        />
      )}
    </main>
  );
}
