/**
 * FotoUpload.jsx — Komponen upload foto bahan (opsional).
 * Menampilkan preview & tombol hapus. Validasi ukuran + kompresi otomatis
 * (kalau > 10 MB) sebelum upload ke Cloudinary — lewat uploadMedia()
 * (packages/shared/lib/mediaUpload.js), satu pintu upload untuk semua
 * fitur media di aplikasi.
 */
import { useState, useRef } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { uploadMedia, friendlyMediaErrorMessage } from "@deera/shared/lib/mediaUpload";

const STATUS_LABEL = {
  ready: "Ready",
  compressing: "Compressing...",
  uploading: "Uploading...",
  success: "Success",
  failed: "Failed",
};

export default function FotoUpload({ value, onChange }) {
  const [status, setStatus] = useState(null); // null | "ready"|"compressing"|"uploading"|"success"|"failed"
  const [progress, setProgress] = useState(0);
  const [sizes, setSizes] = useState(null); // { originalSizeMB, compressedSizeMB }
  const [errMsg, setErrMsg] = useState("");
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrMsg("");
    setSizes(null);
    setProgress(0);
    try {
      const result = await uploadMedia(file, {
        kind: "image",
        onProgress: setProgress,
        onStatus: (s, meta) => {
          setStatus(s);
          if (meta.originalSizeMB != null) {
            setSizes({
              originalSizeMB: meta.originalSizeMB,
              compressedSizeMB: meta.compressedSizeMB ?? meta.originalSizeMB,
            });
          }
        },
      });
      onChange(result.url);
    } catch (err) {
      console.error("Upload foto gagal:", err);
      setErrMsg(friendlyMediaErrorMessage(err));
    } finally {
      setProgress(0);
    }
  }

  const isBusy = status === "compressing" || status === "uploading";

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
            onClick={() => {
              onChange("");
              setStatus(null);
              setSizes(null);
              setErrMsg("");
            }}
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
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 border border-dashed border-skin-bdr text-xs text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {status === "uploading"
          ? `Uploading ${progress}%`
          : status
            ? STATUS_LABEL[status]
            : "Pilih Foto"}
      </button>
      {sizes && (
        <p className="mt-1 text-[10px] text-skin-text4">
          {sizes.compressedSizeMB !== sizes.originalSizeMB ? (
            <>
              {sizes.originalSizeMB.toFixed(2)} MB →{" "}
              <span className="text-emerald-600">{sizes.compressedSizeMB.toFixed(2)} MB</span>
            </>
          ) : (
            `${sizes.originalSizeMB.toFixed(2)} MB`
          )}
        </p>
      )}
      {errMsg && <p className="mt-1 text-xs text-red-600 max-w-xs">{errMsg}</p>}
    </div>
  );
}
