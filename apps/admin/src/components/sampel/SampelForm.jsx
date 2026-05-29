/**
 * SampelForm.jsx — Form buat/edit sampel (nama + tanggal + foto).
 */
import { useState } from "react";

const fieldCls =
  "w-full px-3 py-2 bg-skin-raised border border-skin-bdr text-sm text-skin-text font-editorial placeholder:text-skin-text4 focus:outline-none focus:border-[#CAB170] transition";
const labelCls =
  "block font-editorial text-xs tracking-[0.15em] text-skin-text2 mb-1 uppercase";

export default function SampelForm({ initial, onSave, onCancel, saving }) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [tanggal, setTanggal] = useState(
    initial?.tanggal ?? new Date().toISOString().split("T")[0],
  );
  const [fotos, setFotos] = useState(
    (initial?.foto ?? []).map((url) => ({ type: "url", url })),
  );

  function handleFotoAdd(e) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setFotos((prev) => [
      ...prev,
      ...files.map((f) => ({ type: "file", file: f, preview: URL.createObjectURL(f) })),
    ]);
    e.target.value = "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!nama.trim()) return;
    onSave({ nama: nama.trim(), tanggal }, fotos);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Nama */}
        <div>
          <label className={labelCls}>Nama Sampel *</label>
          <input
            type="text"
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="cth. Gamis OSK Motif Bunga v2"
            className={fieldCls}
          />
        </div>

        {/* Tanggal */}
        <div>
          <label className={labelCls}>Tanggal</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className={fieldCls}
          />
        </div>

        {/* Foto */}
        <div className="space-y-2">
          <label className={labelCls}>Foto Sampel</label>
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative aspect-[3/4] border border-skin-bdr overflow-hidden">
                <img
                  src={f.type === "file" ? f.preview : f.url}
                  className="w-full h-full object-cover"
                  alt=""
                />
                <button
                  type="button"
                  onClick={() => setFotos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 transition"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="flex aspect-[3/4] items-center justify-center border-2 border-dashed border-skin-bdr hover:border-[#CAB170] cursor-pointer flex-col gap-1 text-skin-text3 hover:text-[#CAB170] transition">
              <span className="text-2xl leading-none">+</span>
              <span className="font-editorial text-[10px] tracking-[0.1em] uppercase">
                {fotos.length === 0 ? "Tambah Foto" : "Foto Lagi"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFotoAdd}
                className="hidden"
              />
            </label>
          </div>
          {fotos.length === 0 && (
            <p className="text-[10px] text-skin-text4 italic">
              Upload foto sampel agar bisa dikirim ke atasan untuk approval.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex gap-2 px-4 py-4 border-t border-skin-bdr-lt">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-2.5 border border-skin-bdr text-xs font-editorial tracking-[0.12em] uppercase text-skin-text3 hover:text-skin-text transition disabled:opacity-40"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving || !nama.trim()}
          className="flex-[2] py-2.5 bg-[#CAB170] text-white text-xs font-editorial tracking-[0.15em] uppercase hover:bg-[#A8925A] disabled:opacity-50 disabled:pointer-events-none transition"
        >
          {saving ? "Menyimpan..." : initial ? "Simpan" : "Buat Sampel"}
        </button>
      </div>
    </form>
  );
}
