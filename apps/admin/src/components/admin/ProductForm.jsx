import { useState } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { uploadImage } from "@deera/shared/lib/cloudinary";
import { SIZE_PRESETS, buildKode } from "@deera/shared/lib/constants";
import { logHistory } from "../hooks/useHistory";
import SizeSection from "./SizeSection";
import StockSection from "./StockSection";
import ImageSection from "./ImageSection";

const inputCls = "w-full bg-transparent border border-white/15 px-3 py-2 text-white font-editorial text-sm tracking-wide focus:outline-none focus:border-white/50 disabled:opacity-40 placeholder:text-white/20 transition";
const labelCls = "block font-editorial text-[10px] tracking-[0.3em] text-white/50 mb-2 uppercase";

export default function ProductForm({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const [originalKode] = useState(product?.kode ?? "");

  // Parse kode jadi parts kalau edit
  const parsedParts = product?.kode?.match(/^D-(\d+)-(.+)$/) ?? [];
  const [kodeAngka, setKodeAngka] = useState(parsedParts[1] ?? "");
  const [kodeBahan, setKodeBahan] = useState(parsedParts[2] ?? "");

  const generatedKode = buildKode(kodeAngka, kodeBahan);

  const [nama, setNama] = useState(product?.nama ?? "");
  const [bahan, setBahan] = useState(product?.bahan ?? "");
  const [hpp, setHpp] = useState(String(product?.hpp ?? ""));

  // Per-size stock map: { [size]: { gudang, cideng, tegalgubug } }
  const initStokMap = () => {
    const map = {};
    (product?.variants ?? []).forEach((v) => {
      map[v.size] = {
        gudang:     v.stok_gudang     ?? 0,
        cideng:     v.stok_cideng     ?? 0,
        tegalgubug: v.stok_tegalgubug ?? 0,
      };
    });
    return map;
  };
  const [stokMap, setStokMap] = useState(initStokMap);

  const initHarga = () => {
    const map = {};
    (product?.variants ?? []).forEach((v) => { map[v.size] = String(v.harga ?? ""); });
    return map;
  };
  const [hargaMap, setHargaMap] = useState(initHarga);
  const [activeSet, setActiveSet] = useState(() => new Set((product?.variants ?? []).map((v) => v.size)));
  const [mainImage, setMainImage] = useState(product?.image ? { type: "url", url: product.image } : null);
  const [detailImages, setDetailImages] = useState((product?.detail ?? []).map((url) => ({ type: "url", url })));
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  function toggleSize(size) {
    setActiveSet((prev) => { const n = new Set(prev); n.has(size) ? n.delete(size) : n.add(size); return n; });
  }
  function setHarga(size, val) {
    setHargaMap((prev) => ({ ...prev, [size]: val.replace(/\D/g, "") }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg("");
    const finalKode = generatedKode || originalKode;
    if (!finalKode) return setErrMsg("Kode wajib diisi (isi nomor dan kode bahan)");
    if (!nama.trim()) return setErrMsg("Nama wajib diisi");
    if (!mainImage) return setErrMsg("Foto utama wajib diisi");
    if (activeSet.size === 0) return setErrMsg("Pilih minimal 1 ukuran");
    setSaving(true);
    try {
      const mainUrl = mainImage.type === "url" ? mainImage.url : (await uploadImage(mainImage.file)).url;
      const detailUrls = await Promise.all(detailImages.map(async (img) =>
        img.type === "url" ? img.url : (await uploadImage(img.file)).url
      ));
      const variants = SIZE_PRESETS.filter((p) => activeSet.has(p.size)).map((p) => ({
        size: p.size, ld: p.ld, pb: p.pb,
        harga:          parseInt(hargaMap[p.size] ?? "0") || 0,
        stok_gudang:     stokMap[p.size]?.gudang     ?? 0,
        stok_cideng:     stokMap[p.size]?.cideng     ?? 0,
        stok_tegalgubug: stokMap[p.size]?.tegalgubug ?? 0,
      }));
      const payload = {
        kode: finalKode, nama: nama.trim(), image: mainUrl, detail: detailUrls,
        bahan: bahan.trim(), variants,
        hpp: parseInt(hpp.replace(/\D/g, "")) || 0,
      };

      if (isEdit) {
        const { error } = await supabase.from("products").update(payload).eq("kode", originalKode);
        if (error) throw error;
        await logHistory({ action: "edit", kode: finalKode, nama: payload.nama, snapshot: payload });
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        await logHistory({ action: "tambah", kode: finalKode, nama: payload.nama, snapshot: payload });
      }
      onSaved();
    } catch (err) {
      setErrMsg("Gagal simpan: " + (err.message ?? String(err)));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 overflow-y-auto bg-black/80 backdrop-blur-sm md:p-10">
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl p-4 my-auto bg-black border border-white/20 md:p-10">
        <button type="button" onClick={onClose} disabled={saving}
          className="absolute text-xl leading-none top-5 right-5 text-white/40 hover:text-white transition">
          &times;
        </button>

        <h2 className="font-headline text-[#cab170] text-2xl leading-none">
          {isEdit ? "Edit Produk" : "Tambah Produk"}
        </h2>
        <div className="w-10 h-px mt-3 mb-8 bg-[#cab170]/40" />

        {/* KODE — dua input otomatis jadi D-XX-XXX */}
        <div className="mb-6">
          <label className={labelCls}>Kode Produk</label>
          <div className="flex items-center gap-2">
            <span className="font-editorial text-white/30 text-sm">D -</span>
            <input type="text" inputMode="numeric" value={kodeAngka}
              onChange={(e) => setKodeAngka(e.target.value.replace(/\D/g, ""))}
              disabled={saving} placeholder="72" maxLength={4}
              className="w-20 bg-transparent border border-white/15 px-3 py-2 text-white font-editorial text-sm text-center focus:outline-none focus:border-white/50 disabled:opacity-40 transition" />
            <span className="font-editorial text-white/30 text-sm">-</span>
            <input type="text" value={kodeBahan}
              onChange={(e) => setKodeBahan(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
              disabled={saving} placeholder="JTB" maxLength={5}
              className="w-24 bg-transparent border border-white/15 px-3 py-2 text-white font-editorial text-sm text-center focus:outline-none focus:border-white/50 disabled:opacity-40 transition" />
          </div>
          {generatedKode && (
            <p className="mt-2 font-editorial text-[10px] tracking-[0.2em] text-[#cab170]/70">
              Kode: <span className="text-[#cab170]">{generatedKode}</span>
            </p>
          )}
          {isEdit && generatedKode && generatedKode !== originalKode && (
            <p className="mt-1 font-editorial text-[10px] text-[#cab170]/50">
              Berubah dari {originalKode} — link lama tidak berlaku
            </p>
          )}
        </div>

        {/* NAMA */}
        <div className="mb-5">
          <label className={labelCls}>Nama</label>
          <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} disabled={saving} placeholder="Bahan x Style" className={inputCls} required />
        </div>

        {/* BAHAN */}
        <div className="mb-6">
          <label className={labelCls}>Bahan</label>
          <input type="text" value={bahan} onChange={(e) => setBahan(e.target.value)} disabled={saving} placeholder="Auora burkat mix jasmin" className={inputCls} />
        </div>

        <SizeSection activeSet={activeSet} hargaMap={hargaMap} onToggle={toggleSize} onHarga={setHarga} saving={saving} />

        <StockSection
          stokMap={stokMap} setStokMap={setStokMap}
          hpp={hpp} setHpp={setHpp}
          activeSet={activeSet} hargaMap={hargaMap}
          saving={saving}
        />

        <ImageSection
          mainImage={mainImage} setMainImage={setMainImage}
          detailImages={detailImages} setDetailImages={setDetailImages}
          saving={saving}
        />

        {errMsg && <p className="mb-4 font-editorial text-xs text-red-400">{errMsg}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-[#cab170] text-black font-editorial text-xs tracking-[0.25em] uppercase hover:bg-[#a8925a] transition disabled:opacity-40">
            {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Produk"}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            className="px-6 py-3 border border-white/15 font-editorial text-xs tracking-[0.25em] uppercase text-white/40 hover:text-white hover:border-white/40 transition disabled:opacity-40">
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
