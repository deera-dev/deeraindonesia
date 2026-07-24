/**
 * ProductForm.jsx — Modal form tambah / edit produk.
 *
 * Sub-komponen:
 *   SizeSection  — pilih ukuran + input harga
 *   ImageSection — upload foto utama + detail
 *   WarnaSection — manajemen warna
 *   HppSection   — HPP + margin otomatis
 */
import { useState } from "react";
import { buildKode } from "@deera/shared/lib/constants";
import { MAX_VIDEO_MB, validateMedia } from "@deera/shared/lib/mediaUpload";
import { useStokWarnaByKode, useSaveProduct } from "../hooks";
import SizeSection from "./SizeSection";
import ImageSection from "./ImageSection";
import WarnaSection from "./WarnaSection";
import HppSection from "./HppSection";

const inputCls =
  "w-full bg-skin-card border-2 border-skin-bdr px-4 py-3 text-skin-text text-base tracking-wide focus:outline-none focus:border-[#CAB170] disabled:opacity-40 disabled:bg-skin-page placeholder:text-skin-text4 transition";
const labelCls = "block text-sm tracking-[0.2em] text-skin-text2 mb-2 uppercase";

export default function ProductForm({ product, onClose, onSaved, onDelete }) {
  const isEdit = !!product;
  const [originalKode] = useState(product?.kode ?? "");
  const saveProduct = useSaveProduct();

  // Kode
  const parsedParts = product?.kode?.match(/^D-(\d+)-(.+)$/) ?? [];
  const [kodeAngka, setKodeAngka] = useState(parsedParts[1] ?? "");
  const [kodeBahan, setKodeBahan] = useState(parsedParts[2] ?? "");
  const generatedKode = buildKode(kodeAngka, kodeBahan);

  // Fields dasar
  const [nama, setNama] = useState(product?.nama ?? "");
  const [bahan, setBahan] = useState(product?.bahan ?? "");
  const [hpp, setHpp] = useState(String(product?.hpp ?? ""));

  // Sizes & harga
  const [hargaMap, setHargaMap] = useState(() => {
    const map = {};
    (product?.variants ?? []).forEach((v) => {
      map[v.size] = String(v.harga ?? "");
    });
    return map;
  });
  const [activeSet, setActiveSet] = useState(
    () => new Set((product?.variants ?? []).map((v) => v.size)),
  );

  // Warna
  const [warna, setWarna] = useState(product?.warna ?? []);
  // Rename warna ditunda sampai Simpan — map nama ASLI (tersimpan di DB) → nama
  // TERBARU (hasil edit terakhir, bisa berantai kalau warna yg sama diganti nama 2x).
  const [renameMap, setRenameMap] = useState({});

  // Stok per warna (read-only — untuk deteksi orphan & cegah hapus warna berkstok)
  const { stokWarnaMap, loading: stokLoading } = useStokWarnaByKode(originalKode, {
    enabled: isEdit,
  });

  // Images
  const [mainImage, setMainImage] = useState(
    product?.image ? { type: "url", url: product.image } : null,
  );
  const [detailImages, setDetailImages] = useState(
    (product?.detail ?? []).map((url) => ({ type: "url", url })),
  );

  // Video
  const [videoFile, setVideoFile] = useState(
    product?.video ? { type: "url", url: product.video } : null,
  );

  // UI
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [videoErr, setVideoErr] = useState("");

  function toggleSize(size) {
    setActiveSet((prev) => {
      const n = new Set(prev);
      n.has(size) ? n.delete(size) : n.add(size);
      return n;
    });
  }
  function setHarga(size, val) {
    setHargaMap((prev) => ({ ...prev, [size]: val.replace(/\D/g, "") }));
  }
  function warnaHasStok(w) {
    // `stokWarnaMap` diindeks pakai nama ASLI (tersimpan di DB) — kalau `w`
    // adalah hasil rename yang belum disimpan, telusuri balik ke nama asli.
    const original = Object.keys(renameMap).find((k) => renameMap[k] === w) ?? w;
    for (const warnaMap of Object.values(stokWarnaMap)) {
      const stok = warnaMap[original];
      if (stok && (stok.gudang > 0 || stok.cideng > 0 || stok.tegalgubug > 0)) return true;
    }
    return false;
  }

  function handleRenameWarna(old, next) {
    setWarna((prev) => prev.map((w) => (w === old ? next : w)));
    setRenameMap((prev) => {
      // Kalau `old` sudah merupakan hasil rename sebelumnya (rename berantai),
      // update value-nya saja — jangan buat entry baru dgn key = nama sementara.
      const chainedKey = Object.keys(prev).find((k) => prev[k] === old);
      if (chainedKey) return { ...prev, [chainedKey]: next };
      return { ...prev, [old]: next };
    });
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    setErrMsg("");
    const finalKode = generatedKode || originalKode;
    if (!finalKode) return setErrMsg("Kode wajib diisi (isi nomor dan kode bahan)");
    if (!nama.trim()) return setErrMsg("Nama wajib diisi");
    if (activeSet.size === 0) return setErrMsg("Pilih minimal 1 ukuran");
    setSaving(true);
    try {
      const warnaRenames = Object.entries(renameMap)
        .filter(([from, to]) => from !== to)
        .map(([from, to]) => ({ from, to }));
      await saveProduct({
        isEdit,
        originalKode,
        finalKode,
        fields: { nama, bahan, hpp },
        mainImage,
        videoFile,
        detailImages,
        warna,
        warnaRenames,
        activeSet,
        hargaMap,
        stokWarnaMap,
        productBefore: isEdit
          ? {
              kode: product.kode,
              nama: product.nama,
              bahan: product.bahan,
              hpp: product.hpp,
              variants: product.variants,
              warna: product.warna,
              image: product.image,
              video: product.video,
              detail: product.detail,
            }
          : undefined,
      });

      onSaved(product ? `${finalKode} berhasil diperbarui.` : `${finalKode} berhasil ditambahkan.`);
    } catch (err) {
      setErrMsg("Gagal simpan: " + (err.message ?? String(err)));
      setSaving(false);
    }
  }

  // Orphan stok notice
  const orphanWarnas = (() => {
    if (!isEdit || stokLoading) return new Set();
    const currentSet = new Set(warna.length > 0 ? warna : ["_"]);
    const orphans = new Set();
    for (const warnaMap of Object.values(stokWarnaMap)) {
      for (const w of Object.keys(warnaMap)) {
        if (currentSet.has(w)) continue;
        // Warna ini punya rename pending (belum disimpan) — bukan dihapus,
        // jadi jangan tandai sebagai orphan yang stoknya akan hilang.
        if (renameMap[w] && renameMap[w] !== w) continue;
        orphans.add(w);
      }
    }
    return orphans;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={saving ? undefined : onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative bg-skin-card w-full max-w-2xl mx-auto border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col h-[100dvh] md:h-auto md:max-h-[90dvh]"
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b-2 border-skin-bdr">
          <h2 className="text-[#CAB170] text-2xl leading-none font-headline">
            {isEdit ? "Edit Produk" : "Tambah Produk"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-10 h-10 flex items-center justify-center text-skin-text3 hover:text-red-500 transition text-2xl disabled:opacity-40"
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-6 md:px-10">
          {/* Kode */}
          <div className="mb-6">
            <label className={labelCls}>Kode Produk</label>
            <div className="flex items-center gap-3">
              <span className="text-skin-text3 text-base">D -</span>
              <input
                type="text"
                inputMode="numeric"
                value={kodeAngka}
                onChange={(e) => setKodeAngka(e.target.value.replace(/\D/g, ""))}
                disabled={saving}
                placeholder="72"
                maxLength={4}
                className="w-24 bg-skin-card border-2 border-skin-bdr px-3 py-3 text-skin-text text-base text-center focus:outline-none focus:border-[#CAB170] disabled:opacity-40 transition"
              />
              <span className="text-skin-text3 text-base">-</span>
              <input
                type="text"
                value={kodeBahan}
                onChange={(e) => setKodeBahan(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                disabled={saving}
                placeholder="JTB"
                maxLength={5}
                className="w-28 bg-skin-card border-2 border-skin-bdr px-3 py-3 text-skin-text text-base text-center focus:outline-none focus:border-[#CAB170] disabled:opacity-40 transition"
              />
            </div>
            {generatedKode && (
              <p className="mt-2 text-sm text-skin-text2">
                Kode: <span className="text-[#CAB170] font-medium">{generatedKode}</span>
              </p>
            )}
            {isEdit && generatedKode && generatedKode !== originalKode && (
              <p className="mt-1 text-sm text-amber-600">
                Berubah dari {originalKode} — link lama tidak berlaku
              </p>
            )}
          </div>

          {/* Nama */}
          <div className="mb-5">
            <label className={labelCls}>Nama</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              disabled={saving}
              placeholder="Bahan x Style"
              className={inputCls}
              required
            />
          </div>

          {/* Bahan */}
          <div className="mb-6">
            <label className={labelCls}>Bahan</label>
            <input
              type="text"
              value={bahan}
              onChange={(e) => setBahan(e.target.value)}
              disabled={saving}
              placeholder="Aurora burkat mix jasmin"
              className={inputCls}
            />
          </div>

          <WarnaSection
            warna={warna}
            onAdd={(w) => setWarna((prev) => [...prev, w])}
            onRemove={(w) => setWarna((prev) => prev.filter((x) => x !== w))}
            onRename={handleRenameWarna}
            warnaHasStok={warnaHasStok}
            saving={saving}
          />

          <SizeSection
            activeSet={activeSet}
            hargaMap={hargaMap}
            onToggle={toggleSize}
            onHarga={setHarga}
            saving={saving}
          />

          {/* Orphan stok warning */}
          {orphanWarnas.size > 0 && (
            <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-300 text-sm text-amber-800 leading-relaxed">
              ⚠ Data stok untuk <strong>{orphanWarnas.size} warna yang sudah dihapus</strong> (
              <span className="font-medium">{[...orphanWarnas].join(", ")}</span>) akan otomatis
              dihapus saat produk disimpan.
            </div>
          )}

          <HppSection
            hpp={hpp}
            onHpp={setHpp}
            activeSet={activeSet}
            hargaMap={hargaMap}
            saving={saving}
          />

          <ImageSection
            mainImage={mainImage}
            setMainImage={setMainImage}
            detailImages={detailImages}
            setDetailImages={setDetailImages}
            saving={saving}
          />

          {/* Video */}
          <div className="mb-6">
            <label className={labelCls}>
              Video{" "}
              <span className="normal-case text-xs font-normal tracking-normal text-skin-text4">
                (opsional)
              </span>
            </label>
            {videoFile ? (
              <div className="space-y-2">
                {videoFile.type === "url" ? (
                  <video
                    src={videoFile.url}
                    className="w-full max-h-48 bg-black"
                    controls
                    muted
                    playsInline
                  />
                ) : (
                  <div className="flex items-center gap-3 border-2 border-skin-bdr p-3 text-sm text-skin-text2">
                    <span>▶</span>
                    <span className="truncate">{videoFile.file.name}</span>
                    {videoFile.sizeMB != null && (
                      <span className="text-skin-text4 shrink-0">
                        ({videoFile.sizeMB.toFixed(1)} MB)
                      </span>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setVideoFile(null)}
                  disabled={saving}
                  className="text-sm text-red-500 hover:text-red-700 transition disabled:opacity-40"
                >
                  Hapus Video
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-skin-bdr cursor-pointer hover:border-[#CAB170] transition">
                <div className="flex flex-col items-center gap-1 text-skin-text3 pointer-events-none">
                  <span className="text-xl">▶</span>
                  <span className="text-xs tracking-[0.15em] uppercase">Upload Video</span>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  disabled={saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    // Video TIDAK dikompres (sengaja) — validasi ukuran saja,
                    // tolak langsung sebelum sempat tersimpan di state kalau
                    // melebihi limit Cloudinary Free Plan.
                    const { ok, sizeMB } = validateMedia(file, "video");
                    if (!ok) {
                      setVideoErr(
                        `Ukuran video melebihi batas maksimum ${MAX_VIDEO_MB} MB untuk paket Cloudinary Free.`,
                      );
                      return;
                    }
                    setVideoErr("");
                    setVideoFile({ type: "file", file, sizeMB });
                  }}
                />
              </label>
            )}
            {videoErr && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">
                {videoErr}
              </p>
            )}
          </div>

          {errMsg && (
            <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">
              {errMsg}
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t-2 border-skin-bdr p-4 space-y-3">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 bg-[#CAB170] text-white text-base tracking-[0.2em] uppercase hover:bg-[#A8925A] transition disabled:opacity-40"
            >
              {saving ? "Menyimpan..." : isEdit ? "Simpan" : "Tambah Produk"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-8 py-4 border-2 border-skin-bdr text-base tracking-[0.2em] uppercase text-skin-text3 hover:text-skin-text hover:border-[#1A1918] transition disabled:opacity-40"
            >
              Batal
            </button>
          </div>
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="w-full py-3 border-2 border-red-500 text-red-500 text-sm tracking-[0.2em] uppercase hover:bg-red-500 hover:text-white transition disabled:opacity-40"
            >
              ⊗ Hapus Produk Ini
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
