/**
 * FotoUpload.jsx — Komponen upload foto bahan (opsional).
 * Menampilkan preview & tombol hapus. Upload ke Cloudinary.
 */
import { useState, useRef } from "react";
import { uploadImage, cldUrl } from "@deera/shared/lib/cloudinary";

export default function FotoUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadImage(file, {
        onProgress: (p) => setProgress(p),
      });
      onChange(result.url);
    } catch (err) {
      console.error("Upload foto gagal:", err);
    } finally {
      setUploading(false);
      setProgress(0);
      e.target.value = "";
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={cldUrl(value, { width: 80, height: 80, crop: "fill" })}
          alt="Foto bahan"
          className="w-16 h-16 object-cover border border-skin-bdr shrink-0"
        />
        <div className="space-y-1.5">
          <p className="text-xs text-skin-text3">Foto tersimpan</p>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-red-500 hover:text-red-600 underline transition"
          >
            Hapus foto
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 border border-dashed border-skin-bdr text-xs text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {uploading ? `Upload... ${progress}%` : "Tambah Foto"}
      </button>
    </div>
  );
}
