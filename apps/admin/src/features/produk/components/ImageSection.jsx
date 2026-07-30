/**
 * ImageSection.jsx — Upload foto utama + foto detail produk.
 *
 * Validasi & kompresi terjadi SAAT file dipilih (bukan saat submit form) —
 * upload sebenarnya ke Cloudinary tetap terjadi belakangan di saveProduct()
 * (lihat features/produk/api.js), tapi di titik itu file yang dikirim sudah
 * dijamin di bawah limit Cloudinary Free Plan (10 MB) karena sudah lewat
 * processImageFile() (features/produk/utils.js) di sini.
 */
import { useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { MAX_IMAGE_MB } from "@deera/shared/lib/mediaUpload";
import { processImageFile } from "../utils";

function StatusBadge({ status }) {
  if (status !== "compressing") return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
      <span className="text-[10px] text-white font-editorial tracking-[0.1em] uppercase animate-pulse px-2 text-center">
        Compressing...
      </span>
    </div>
  );
}

function SizeInfo({ originalSizeMB, compressedSizeMB, compressed }) {
  if (!originalSizeMB) return null;
  if (!compressed) {
    return <p className="mt-1 text-[10px] text-skin-text4">{originalSizeMB.toFixed(2)} MB</p>;
  }
  return (
    <p className="mt-1 text-[10px] text-skin-text4">
      {originalSizeMB.toFixed(2)} MB →{" "}
      <span className="text-emerald-600">{compressedSizeMB.toFixed(2)} MB</span>
    </p>
  );
}

export default function ImageSection({
  mainImage,
  setMainImage,
  seriWarnaImage,
  setSeriWarnaImage,
  detailImages,
  setDetailImages,
  saving,
}) {
  const [mainNotice, setMainNotice] = useState("");
  const [mainErr, setMainErr] = useState("");
  const [seriWarnaNotice, setSeriWarnaNotice] = useState("");
  const [seriWarnaErr, setSeriWarnaErr] = useState("");
  const [detailErr, setDetailErr] = useState("");

  async function handleMainChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMainErr("");
    setMainNotice("");

    const originalSizeMB = file.size / (1024 * 1024);
    if (originalSizeMB > MAX_IMAGE_MB) {
      setMainImage({
        type: "file",
        file,
        preview: URL.createObjectURL(file),
        status: "compressing",
        originalSizeMB,
      });
    }

    const processed = await processImageFile(file, {
      onNotice: setMainNotice,
      onError: setMainErr,
    });
    setMainImage(processed);
    if (processed) setMainNotice("");
  }

  async function handleSeriWarnaChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSeriWarnaErr("");
    setSeriWarnaNotice("");

    const originalSizeMB = file.size / (1024 * 1024);
    if (originalSizeMB > MAX_IMAGE_MB) {
      setSeriWarnaImage({
        type: "file",
        file,
        preview: URL.createObjectURL(file),
        status: "compressing",
        originalSizeMB,
      });
    }

    const processed = await processImageFile(file, {
      onNotice: setSeriWarnaNotice,
      onError: setSeriWarnaErr,
    });
    setSeriWarnaImage(processed);
    if (processed) setSeriWarnaNotice("");
  }

  async function handleDetailAdd(e) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setDetailErr("");

    const placeholders = files.map((file) => {
      const originalSizeMB = file.size / (1024 * 1024);
      if (originalSizeMB <= MAX_IMAGE_MB) return null;
      return {
        type: "file",
        file,
        preview: URL.createObjectURL(file),
        status: "compressing",
        originalSizeMB,
        _key: file,
      };
    });
    const activePlaceholders = placeholders.filter(Boolean);
    if (activePlaceholders.length) {
      setDetailImages((prev) => [...prev, ...activePlaceholders]);
    }

    const results = await Promise.all(
      files.map((file) => processImageFile(file, { onError: setDetailErr })),
    );

    setDetailImages((prev) => {
      const placeholderKeys = new Set(activePlaceholders.map((p) => p._key));
      const withoutPlaceholders = prev.filter((img) => !placeholderKeys.has(img._key));
      return [...withoutPlaceholders, ...results.filter(Boolean)];
    });
  }

  function removeDetail(idx) {
    setDetailImages((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveDetail(idx, dir) {
    setDetailImages((prev) => {
      const arr = [...prev];
      const ni = idx + dir;
      if (ni < 0 || ni >= arr.length) return arr;
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
      return arr;
    });
  }

  const btnSmall =
    "px-2 py-1 font-editorial text-xs bg-skin-card border-2 border-skin-bdr disabled:opacity-30 text-skin-text2 hover:text-[#CAB170] hover:border-[#CAB170] transition";

  return (
    <>
      <div className="mb-8">
        <label className="block font-editorial text-sm tracking-[0.2em] text-skin-text2 mb-3 uppercase">
          Foto Utama <span className="normal-case text-skin-text3">(tampil di katalog)</span>
        </label>
        {mainImage ? (
          <div className="relative w-36 aspect-[3/4]">
            <img
              src={
                mainImage.type === "file"
                  ? mainImage.preview
                  : cldUrl(mainImage.url, { width: 400 })
              }
              alt="Preview"
              className="object-cover w-full h-full border-2 border-skin-bdr"
            />
            <StatusBadge status={mainImage.status} />
            <button
              type="button"
              onClick={() => setMainImage(null)}
              disabled={saving || mainImage.status === "compressing"}
              className="absolute w-7 h-7 text-sm text-white bg-red-500 border-none -top-2 -right-2 hover:bg-red-600 transition flex items-center justify-center disabled:opacity-40"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="flex w-36 aspect-[3/4] items-center justify-center border-2 border-dashed border-[#C8C4C0] hover:border-[#CAB170] cursor-pointer font-editorial text-sm tracking-[0.15em] text-skin-text3 hover:text-[#CAB170] transition uppercase flex-col gap-2">
            <span className="text-2xl">+</span>
            <span>Upload</span>
            <input type="file" accept="image/*" onChange={handleMainChange} className="hidden" />
          </label>
        )}
        {mainImage?.type === "file" && (
          <SizeInfo
            originalSizeMB={mainImage.originalSizeMB}
            compressedSizeMB={mainImage.compressedSizeMB}
            compressed={mainImage.compressed}
          />
        )}
        {mainNotice && <p className="mt-1 text-xs text-amber-600 max-w-xs">{mainNotice}</p>}
        {mainErr && <p className="mt-1 text-xs text-red-600 max-w-xs">{mainErr}</p>}
      </div>

      <div className="mb-8">
        <label className="block font-editorial text-sm tracking-[0.2em] text-skin-text2 mb-3 uppercase">
          Foto Seri Warna{" "}
          <span className="normal-case text-skin-text3">
            (opsional — 1 foto menampilkan semua warna)
          </span>
        </label>
        {seriWarnaImage ? (
          <div className="relative w-36 aspect-[3/4]">
            <img
              src={
                seriWarnaImage.type === "file"
                  ? seriWarnaImage.preview
                  : cldUrl(seriWarnaImage.url, { width: 400 })
              }
              alt="Preview"
              className="object-cover w-full h-full border-2 border-skin-bdr"
            />
            <StatusBadge status={seriWarnaImage.status} />
            <button
              type="button"
              onClick={() => setSeriWarnaImage(null)}
              disabled={saving || seriWarnaImage.status === "compressing"}
              className="absolute w-7 h-7 text-sm text-white bg-red-500 border-none -top-2 -right-2 hover:bg-red-600 transition flex items-center justify-center disabled:opacity-40"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="flex w-36 aspect-[3/4] items-center justify-center border-2 border-dashed border-[#C8C4C0] hover:border-[#CAB170] cursor-pointer font-editorial text-sm tracking-[0.15em] text-skin-text3 hover:text-[#CAB170] transition uppercase flex-col gap-2">
            <span className="text-2xl">+</span>
            <span>Upload</span>
            <input type="file" accept="image/*" onChange={handleSeriWarnaChange} className="hidden" />
          </label>
        )}
        {seriWarnaImage?.type === "file" && (
          <SizeInfo
            originalSizeMB={seriWarnaImage.originalSizeMB}
            compressedSizeMB={seriWarnaImage.compressedSizeMB}
            compressed={seriWarnaImage.compressed}
          />
        )}
        {seriWarnaNotice && (
          <p className="mt-1 text-xs text-amber-600 max-w-xs">{seriWarnaNotice}</p>
        )}
        {seriWarnaErr && <p className="mt-1 text-xs text-red-600 max-w-xs">{seriWarnaErr}</p>}
      </div>

      <div className="mb-8">
        <label className="block font-editorial text-sm tracking-[0.2em] text-skin-text2 mb-3 uppercase">
          Foto Detail{" "}
          <span className="normal-case text-skin-text3">({detailImages.length} foto)</span>
        </label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {detailImages.map((img, idx) => (
            <div key={idx} className="relative aspect-[3/4]">
              <img
                src={img.type === "file" ? img.preview : cldUrl(img.url, { width: 300 })}
                alt={`Detail ${idx + 1}`}
                className="object-cover w-full h-full border-2 border-skin-bdr"
              />
              <StatusBadge status={img.status} />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 font-editorial text-xs bg-skin-card border border-skin-bdr text-skin-text2">
                {idx + 1}
              </div>
              <button
                type="button"
                onClick={() => removeDetail(idx)}
                disabled={saving || img.status === "compressing"}
                className="absolute w-7 h-7 text-sm text-white bg-red-500 -top-2 -right-2 hover:bg-red-600 transition flex items-center justify-center disabled:opacity-40"
              >
                ×
              </button>
              <div className="absolute flex justify-between gap-1 bottom-1 left-1 right-1">
                <button
                  type="button"
                  onClick={() => moveDetail(idx, -1)}
                  disabled={idx === 0 || saving}
                  className={btnSmall}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveDetail(idx, 1)}
                  disabled={idx === detailImages.length - 1 || saving}
                  className={btnSmall}
                >
                  →
                </button>
              </div>
            </div>
          ))}
          <label className="flex aspect-[3/4] items-center justify-center border-2 border-dashed border-[#C8C4C0] hover:border-[#CAB170] cursor-pointer font-editorial text-sm text-skin-text3 hover:text-[#CAB170] transition uppercase flex-col gap-2">
            <span className="text-2xl">+</span>
            <span>Tambah</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleDetailAdd}
              className="hidden"
            />
          </label>
        </div>
        {detailErr && <p className="mt-2 text-xs text-red-600">{detailErr}</p>}
      </div>
    </>
  );
}
