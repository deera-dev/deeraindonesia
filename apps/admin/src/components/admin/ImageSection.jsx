import { cldUrl } from "@deera/shared/lib/cloudinary";

export default function ImageSection({
  mainImage, setMainImage,
  detailImages, setDetailImages,
  saving,
}) {
  function handleMainChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMainImage({ type: "file", file, preview: URL.createObjectURL(file) });
  }

  function handleDetailAdd(e) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setDetailImages((prev) => [
      ...prev,
      ...files.map((f) => ({ type: "file", file: f, preview: URL.createObjectURL(f) })),
    ]);
    e.target.value = "";
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

  const btnSmall = "px-1.5 py-0.5 font-editorial text-[10px] bg-black/70 border border-white/20 disabled:opacity-30 text-white/60 hover:text-white transition";

  return (
    <>
      {/* FOTO UTAMA */}
      <div className="mb-8">
        <label className="block font-editorial text-[10px] tracking-[0.3em] text-white/50 mb-2 uppercase">
          Foto Utama <span className="normal-case text-white/30">(tampil di katalog)</span>
        </label>
        {mainImage ? (
          <div className="relative w-32 aspect-[3/4]">
            <img
              src={mainImage.type === "file" ? mainImage.preview : cldUrl(mainImage.url, { width: 400 })}
              alt="Preview" className="object-cover w-full h-full border border-white/20" />
            <button type="button" onClick={() => setMainImage(null)} disabled={saving}
              className="absolute w-6 h-6 text-xs text-white bg-black border -top-2 -right-2 border-white/30 hover:bg-red-900/80 transition">
              &times;
            </button>
          </div>
        ) : (
          <label className="flex w-32 aspect-[3/4] items-center justify-center border border-dashed border-white/20 hover:border-white/50 cursor-pointer font-editorial text-[10px] tracking-[0.2em] text-white/35 transition uppercase">
            + Upload
            <input type="file" accept="image/*" onChange={handleMainChange} className="hidden" />
          </label>
        )}
      </div>

      {/* FOTO DETAIL */}
      <div className="mb-8">
        <label className="block font-editorial text-[10px] tracking-[0.3em] text-white/50 mb-2 uppercase">
          Foto Detail <span className="normal-case text-white/30">({detailImages.length})</span>
        </label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {detailImages.map((img, idx) => (
            <div key={idx} className="relative aspect-[3/4]">
              <img
                src={img.type === "file" ? img.preview : cldUrl(img.url, { width: 300 })}
                alt={`Detail ${idx + 1}`} className="object-cover w-full h-full border border-white/15" />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 font-editorial text-[9px] bg-black/70 border border-white/20 text-white/60">
                {idx + 1}
              </div>
              <button type="button" onClick={() => removeDetail(idx)} disabled={saving}
                className="absolute w-6 h-6 text-xs text-white bg-black border -top-2 -right-2 border-white/30 hover:bg-red-900/80 transition">
                &times;
              </button>
              <div className="absolute flex justify-between gap-1 bottom-1 left-1 right-1">
                <button type="button" onClick={() => moveDetail(idx, -1)} disabled={idx === 0 || saving} className={btnSmall}>&larr;</button>
                <button type="button" onClick={() => moveDetail(idx, 1)} disabled={idx === detailImages.length - 1 || saving} className={btnSmall}>&rarr;</button>
              </div>
            </div>
          ))}
          <label className="flex aspect-[3/4] items-center justify-center border border-dashed border-white/20 hover:border-white/50 cursor-pointer font-editorial text-[10px] tracking-[0.2em] text-white/35 transition uppercase">
            + Tambah
            <input type="file" accept="image/*" multiple onChange={handleDetailAdd} className="hidden" />
          </label>
        </div>
      </div>
    </>
  );
}
