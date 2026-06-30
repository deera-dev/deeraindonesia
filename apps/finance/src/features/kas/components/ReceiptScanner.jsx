/**
 * ReceiptScanner.jsx
 * NOTE: dipertahankan apa adanya dari Kas.jsx lama — komponen ini hanya
 * menangkap & menampilkan preview foto struk, TIDAK pernah meng-upload-nya
 * kemanapun (tidak terhubung ke Cloudinary/Supabase Storage). Perilaku ini
 * tidak diubah saat migrasi (lihat CLAUDE.md / ARCHITECTURE.md — migrasi ini
 * murni pemindahan arsitektur, bukan perbaikan perilaku).
 */
import { useState, useRef } from "react";

export default function ReceiptScanner({ onExtracted }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  function handleFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onExtracted({ previewUrl: url });
  }

  function clear() {
    setPreview(null);
    onExtracted({ previewUrl: null });
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <button type="button" onClick={() => inputRef.current?.click()}
        className="w-full py-2.5 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-dashed border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition flex items-center justify-center gap-2"
      >
        <span>📷</span>
        Foto / Upload Struk
      </button>
      {preview && (
        <div className="mt-2 relative">
          <img src={preview} alt="Struk" className="w-full max-h-48 object-contain border border-skin-bdr bg-skin-raised" />
          <button type="button" onClick={clear}
            className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 leading-none">×</button>
        </div>
      )}
    </div>
  );
}
