import { cldUrl } from "@deera/shared/lib/cloudinary";

export default function ImageSection({
  mainImage,
  setMainImage,
  detailImages,
  setDetailImages,
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
            <button
              type="button"
              onClick={() => setMainImage(null)}
              disabled={saving}
              className="absolute w-7 h-7 text-sm text-white bg-red-500 border-none -top-2 -right-2 hover:bg-red-600 transition flex items-center justify-center"
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
              <div className="absolute top-1 left-1 px-1.5 py-0.5 font-editorial text-xs bg-skin-card border border-skin-bdr text-skin-text2">
                {idx + 1}
              </div>
              <button
                type="button"
                onClick={() => removeDetail(idx)}
                disabled={saving}
                className="absolute w-7 h-7 text-sm text-white bg-red-500 -top-2 -right-2 hover:bg-red-600 transition flex items-center justify-center"
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
      </div>
    </>
  );
}
