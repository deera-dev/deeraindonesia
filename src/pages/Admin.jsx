import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { uploadImage, cldUrl } from "../lib/cloudinary";
import { useProducts, invalidateProducts } from "../hooks/useProducts";

export default function Admin() {
  const { products, loading, error } = useProducts();
  const [editing, setEditing] = useState(null); // null | "new" | productObject

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
    invalidateProducts();
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* ============ STICKY HEADER ============ */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-5 bg-black/95 backdrop-blur border-b border-white/10 md:px-12">
        <div>
          <h1 className="font-editorial text-base tracking-[0.3em] md:text-xl">
            ADMIN — DEERA
          </h1>
          <p className="mt-1 font-editorial text-[10px] tracking-[0.25em] text-white/40">
            {products?.length ?? 0} PRODUK
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/catalog"
            className="px-4 py-2 font-editorial text-[10px] tracking-[0.3em] text-white/70 border border-white/20 hover:border-white hover:text-white transition"
          >
            KATALOG
          </Link>
          <button
            onClick={() => setEditing("new")}
            className="px-4 py-2 font-editorial text-[10px] tracking-[0.3em] text-black bg-white hover:bg-white/80 transition"
          >
            + TAMBAH
          </button>
        </div>
      </header>

      {/* ============ CONTENT ============ */}
      <div className="px-6 py-10 md:px-12">
        {loading && (
          <p className="font-editorial text-xs tracking-[0.3em] text-white/40">
            LOADING…
          </p>
        )}

        {error && (
          <div>
            <p className="font-editorial text-sm tracking-[0.25em] text-red-400">
              GAGAL MEMUAT
            </p>
            <p className="mt-2 font-editorial text-xs tracking-[0.15em] text-white/40">
              {error.message}
            </p>
          </div>
        )}

        {!loading && !error && products?.length === 0 && (
          <p className="font-editorial text-xs tracking-[0.3em] text-white/40">
            BELUM ADA PRODUK — KLIK "TAMBAH" UNTUK MEMULAI
          </p>
        )}

        {!loading && !error && products?.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((p) => (
              <article
                key={p.kode}
                className="group relative bg-black border border-white/10 hover:border-white/30 transition"
              >
                <div className="aspect-[3/4] overflow-hidden bg-white/5">
                  {p.image && (
                    <img
                      src={cldUrl(p.image, { width: 400 })}
                      alt={p.nama}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="p-3">
                  <p className="font-editorial text-xs tracking-[0.2em] text-white/85 truncate">
                    {p.kode}
                  </p>
                  <p className="mt-1 font-editorial text-[10px] tracking-[0.15em] text-white/45 truncate">
                    {p.nama}
                  </p>
                  <p className="mt-2 font-editorial text-[9px] tracking-[0.2em] text-white/30">
                    {p.detail?.length ?? 0} FOTO DETAIL
                  </p>
                </div>

                <div className="absolute inset-x-0 bottom-0 flex opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => setEditing(p)}
                    className="flex-1 py-2 text-[10px] tracking-[0.25em] text-white bg-white/15 hover:bg-white/25"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="flex-1 py-2 text-[10px] tracking-[0.25em] text-white bg-red-900/40 hover:bg-red-900/70"
                  >
                    HAPUS
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ============ MODAL FORM ============ */}
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

// ============================================================
// PRODUCT FORM (ADD / EDIT)
// ============================================================
function ProductForm({ product, onClose, onSaved }) {
  const isEdit = !!product;

  const [kode, setKode] = useState(product?.kode ?? "");
  const [nama, setNama] = useState(product?.nama ?? "");

  // ITEM SHAPE: { type: "url", url } | { type: "file", file, preview }
  const [mainImage, setMainImage] = useState(
    product?.image ? { type: "url", url: product.image } : null,
  );
  const [detailImages, setDetailImages] = useState(
    (product?.detail ?? []).map((url) => ({ type: "url", url })),
  );

  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  function handleMainChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMainImage({
      type: "file",
      file,
      preview: URL.createObjectURL(file),
    });
  }

  function handleDetailAdd(e) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newItems = files.map((file) => ({
      type: "file",
      file,
      preview: URL.createObjectURL(file),
    }));
    setDetailImages((prev) => [...prev, ...newItems]);
    e.target.value = "";
  }

  function removeDetail(idx) {
    setDetailImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveDetail(idx, dir) {
    setDetailImages((prev) => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg("");

    const trimmedKode = kode.trim();
    const trimmedNama = nama.trim();

    if (!trimmedKode) return setErrMsg("Kode wajib diisi");
    if (!trimmedNama) return setErrMsg("Nama wajib diisi");
    if (!mainImage) return setErrMsg("Foto utama wajib diisi");

    setSaving(true);

    try {
      // UPLOAD FOTO UTAMA (KALAU MASIH FILE LOKAL)
      const mainUrl =
        mainImage.type === "url"
          ? mainImage.url
          : (await uploadImage(mainImage.file)).url;

      // UPLOAD FOTO DETAIL (PARALLEL UNTUK YANG MASIH FILE)
      const detailUrls = await Promise.all(
        detailImages.map(async (img) => {
          if (img.type === "url") return img.url;
          const res = await uploadImage(img.file);
          return res.url;
        }),
      );

      const payload = {
        kode: trimmedKode,
        nama: trimmedNama,
        image: mainUrl,
        detail: detailUrls,
      };

      if (isEdit) {
        const { error: updErr } = await supabase
          .from("products")
          .update(payload)
          .eq("kode", product.kode);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from("products")
          .insert(payload);
        if (insErr) throw insErr;
      }

      onSaved();
    } catch (err) {
      setErrMsg("Gagal simpan: " + (err.message ?? String(err)));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 flex items-start justify-center p-4 md:p-10">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl my-auto bg-black border border-white/20 p-6 md:p-10"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl leading-none"
        >
          ×
        </button>

        <h2 className="font-editorial text-lg tracking-[0.25em]">
          {isEdit ? "EDIT PRODUK" : "TAMBAH PRODUK"}
        </h2>
        <div className="w-12 h-px bg-white/20 mt-3 mb-8" />

        {/* KODE */}
        <div className="mb-6">
          <label className="block font-editorial text-[10px] tracking-[0.3em] text-white/50 mb-2">
            KODE
          </label>
          <input
            type="text"
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            disabled={isEdit || saving}
            placeholder="D-XX-XXX"
            className="w-full bg-transparent border border-white/20 px-3 py-2 text-white font-editorial tracking-[0.15em] focus:outline-none focus:border-white/60 disabled:opacity-40"
            required
          />
          {isEdit && (
            <p className="mt-1 text-[10px] tracking-[0.15em] text-white/30">
              kode tidak bisa diubah saat edit
            </p>
          )}
        </div>

        {/* NAMA */}
        <div className="mb-6">
          <label className="block font-editorial text-[10px] tracking-[0.3em] text-white/50 mb-2">
            NAMA
          </label>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            disabled={saving}
            placeholder="Bahan x Style"
            className="w-full bg-transparent border border-white/20 px-3 py-2 text-white font-editorial tracking-[0.1em] focus:outline-none focus:border-white/60 disabled:opacity-40"
            required
          />
        </div>

        {/* MAIN IMAGE */}
        <div className="mb-8">
          <label className="block font-editorial text-[10px] tracking-[0.3em] text-white/50 mb-2">
            FOTO UTAMA <span className="text-white/30">(TAMPIL DI KATALOG)</span>
          </label>
          {mainImage ? (
            <div className="relative w-32 aspect-[3/4]">
              <img
                src={
                  mainImage.type === "file"
                    ? mainImage.preview
                    : cldUrl(mainImage.url, { width: 400 })
                }
                alt="Preview"
                className="w-full h-full object-cover border border-white/20"
              />
              <button
                type="button"
                onClick={() => setMainImage(null)}
                disabled={saving}
                className="absolute -top-2 -right-2 w-6 h-6 bg-black border border-white/40 text-white text-xs hover:bg-red-900"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex w-32 aspect-[3/4] items-center justify-center border border-dashed border-white/30 hover:border-white/60 cursor-pointer text-white/50 text-[10px] tracking-[0.25em]">
              + UPLOAD
              <input
                type="file"
                accept="image/*"
                onChange={handleMainChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* DETAIL IMAGES */}
        <div className="mb-8">
          <label className="block font-editorial text-[10px] tracking-[0.3em] text-white/50 mb-2">
            FOTO DETAIL <span className="text-white/30">({detailImages.length})</span>
          </label>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {detailImages.map((img, idx) => (
              <div key={idx} className="relative aspect-[3/4]">
                <img
                  src={
                    img.type === "file"
                      ? img.preview
                      : cldUrl(img.url, { width: 300 })
                  }
                  alt={`Detail ${idx + 1}`}
                  className="w-full h-full object-cover border border-white/20"
                />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] bg-black/70 border border-white/20 tracking-[0.1em]">
                  {idx + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removeDetail(idx)}
                  disabled={saving}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-black border border-white/40 text-white text-xs hover:bg-red-900"
                >
                  ×
                </button>
                <div className="absolute bottom-1 left-1 right-1 flex justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => moveDetail(idx, -1)}
                    disabled={idx === 0 || saving}
                    className="px-1.5 py-0.5 text-[10px] bg-black/70 border border-white/20 disabled:opacity-30 hover:bg-black"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDetail(idx, 1)}
                    disabled={idx === detailImages.length - 1 || saving}
                    className="px-1.5 py-0.5 text-[10px] bg-black/70 border border-white/20 disabled:opacity-30 hover:bg-black"
                  >
                    →
                  </button>
                </div>
              </div>
            ))}

            <label className="flex aspect-[3/4] items-center justify-center border border-dashed border-white/30 hover:border-white/60 cursor-pointer text-white/50 text-[10px] tracking-[0.25em]">
              + TAMBAH
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleDetailAdd}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* ERROR */}
        {errMsg && (
          <p className="mb-4 font-editorial text-xs tracking-[0.15em] text-red-400">
            {errMsg}
          </p>
        )}

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 border border-white/40 hover:border-white text-xs tracking-[0.3em] disabled:opacity-50"
          >
            {saving ? "MENYIMPAN…" : "SIMPAN"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 border border-white/15 text-white/60 hover:text-white hover:border-white/40 text-xs tracking-[0.3em] disabled:opacity-50"
          >
            BATAL
          </button>
        </div>
      </form>
    </div>
  );
}
