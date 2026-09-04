/**
 * PlanningForm.jsx — Form buat Planning (tahap sebelum sampel fisik dibuat).
 * Diisi: nama rencana, tanggal, satu atau lebih BAHAN (tiap bahan dengan foto
 * sendiri, opsional), sampai 3 foto model referensi. Setelah disimpan →
 * status "planning". Sampel fisik dibuat kemudian, ditandai lewat modal
 * "Tandai Sudah Dibuat" (lihat MarkDibuatModal.jsx) yang memindahkan status
 * ke "draft" (Menunggu Review) — flow approve/reject lama di
 * ProduksiSampelPage dipakai ulang tanpa perubahan dari titik ini.
 *
 * Pola upload identik dengan SampelForm.jsx (uploadMedia + progress per foto),
 * disengaja duplikasi kecil demi menjaga file ini tetap sederhana & lean
 * (bahan: list baris dgn 1 foto per baris, model foto: grid maks 3 — beda
 * cukup jauh dari FotoGrid generik SampelForm untuk tidak dipaksakan jadi
 * satu abstraksi).
 *
 * Bahan: dulu dropdown tunggal 1 bahan + 1 foto bahan terpisah. Permintaan
 * Denny 2026-09: "foto bahan harusnya bisa lebih dari 1, karena keseringan
 * memang menggunakan lebih dari 1 bahan" — jadi list baris repeatable, tiap
 * baris pilih SATU bahan (via BahanPickerModal yang sudah ada dari
 * produksi-hpp, sekalian dapat search "pilih bahan bisa search" tanpa
 * komponen baru) + 1 foto opsional utk bahan itu. `bahan_foto` (kolom lama,
 * 1 foto generik) TIDAK dipakai lagi utk planning BARU — SampelCard.jsx dkk
 * tetap fallback baca kolom itu utk data lama yang sudah ada sebelum
 * perubahan ini.
 */
import { useState } from "react";
import { uploadMedia, friendlyMediaErrorMessage } from "@deera/shared/lib/mediaUpload";
import PhotoLightbox from "../../../shared/components/PhotoLightbox";
import { useBahanOptions, BahanPickerModal } from "../../produksi-hpp";

function mkId() {
  return Math.random().toString(36).slice(2, 9);
}

const fieldCls =
  "w-full px-3 py-2 bg-skin-raised border border-skin-bdr text-sm text-skin-text font-editorial placeholder:text-skin-text4 focus:outline-none focus:border-[#CAB170] transition";
const labelCls = "block font-editorial text-xs tracking-[0.15em] text-skin-text2 mb-1 uppercase";

// ── Satu slot foto (dipakai utk bahan tunggal & tiap slot model) ─────────────
// Tap foto (bukan tombol ×) buka full-size (PhotoLightbox) — permintaan
// Denny 2026-08: "tiap foto bisa di klik untuk lihat secara full size".
function FotoSlot({ foto, onAdd, onRemove, placeholder }) {
  const [zoomOpen, setZoomOpen] = useState(false);

  function handleInput(e) {
    const file = e.target.files?.[0];
    if (file) onAdd(file);
    e.target.value = "";
  }

  if (!foto) {
    return (
      <label className="flex aspect-[3/4] items-center justify-center border-2 border-dashed border-skin-bdr hover:border-[#CAB170] cursor-pointer flex-col gap-1 text-skin-text3 hover:text-[#CAB170] transition">
        <span className="text-2xl leading-none">+</span>
        <span className="font-editorial text-[10px] tracking-[0.1em] uppercase text-center px-1">
          {placeholder}
        </span>
        <input type="file" accept="image/*" onChange={handleInput} className="hidden" />
      </label>
    );
  }

  const previewSrc = foto.preview ?? foto.url;

  return (
    <div className="relative aspect-[3/4] border border-skin-bdr overflow-hidden bg-skin-raised">
      <img
        src={previewSrc}
        onClick={() => setZoomOpen(true)}
        className={`w-full h-full object-cover cursor-zoom-in ${
          foto.type === "uploading" || foto.type === "compressing" ? "opacity-60" : ""
        }`}
        alt=""
      />
      {zoomOpen && (
        <PhotoLightbox
          images={[previewSrc]}
          index={0}
          onClose={() => setZoomOpen(false)}
          onNavigate={() => {}}
        />
      )}
      {foto.type === "compressing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <p className="text-[9px] text-white bg-black/50 px-1.5 py-0.5 font-editorial animate-pulse">
            Compressing...
          </p>
        </div>
      )}
      {foto.type === "uploading" && (
        <div className="absolute bottom-0 left-0 right-0">
          <div className="h-1 bg-black/30">
            <div
              className="h-full bg-[#CAB170] transition-all duration-150"
              style={{ width: `${foto.pct}%` }}
            />
          </div>
          <p className="text-center text-[9px] text-white bg-black/50 py-0.5 font-editorial">
            {foto.pct}%
          </p>
        </div>
      )}
      {foto.type === "done" && (
        <div className="absolute top-1 left-1 w-4 h-4 bg-emerald-500 flex items-center justify-center rounded-sm">
          <span className="text-white text-[9px] leading-none">✓</span>
        </div>
      )}
      {foto.type === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 p-1">
          <p className="text-[9px] text-red-400 font-editorial text-center leading-tight">
            {foto.errMsg || "Gagal upload"}
          </p>
        </div>
      )}
      {foto.type !== "uploading" && foto.type !== "compressing" && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 transition"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Helper upload generik: 1 file → functional updater ────────────────────────
function startSingleUpload(file, setFoto) {
  const item = { id: mkId(), type: "ready", preview: URL.createObjectURL(file), pct: 0 };
  setFoto(item);
  uploadMedia(file, {
    kind: "image",
    onProgress: (pct) => setFoto((f) => (f?.id === item.id ? { ...f, type: "uploading", pct } : f)),
    onStatus: (status) =>
      setFoto((f) =>
        f?.id === item.id && (status === "compressing" || status === "uploading")
          ? { ...f, type: status }
          : f,
      ),
  })
    .then((result) =>
      setFoto((f) => (f?.id === item.id ? { ...f, type: "done", url: result.url } : f)),
    )
    .catch((err) =>
      setFoto((f) =>
        f?.id === item.id ? { ...f, type: "error", errMsg: friendlyMediaErrorMessage(err) } : f,
      ),
    );
}

const MAX_MODEL_FOTO = 3;

function mkBahanRow() {
  return { id: mkId(), bahan: null, foto: null };
}

export default function PlanningForm({ onSave, onCancel, saving }) {
  const [nama, setNama] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [bahanRows, setBahanRows] = useState([mkBahanRow()]); // [{id, bahan, foto}]
  const [pickerRowId, setPickerRowId] = useState(null); // baris yg sedang buka BahanPickerModal
  const [modelFotos, setModelFotos] = useState([]); // array of foto objects, maks 3
  const bahanOptions = useBahanOptions();

  function addBahanRow() {
    setBahanRows((prev) => [...prev, mkBahanRow()]);
  }

  function removeBahanRow(id) {
    setBahanRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function setBahanRowFoto(id, updater) {
    setBahanRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, foto: typeof updater === "function" ? updater(r.foto) : updater } : r,
      ),
    );
  }

  function handlePickBahan(option) {
    setBahanRows((prev) => prev.map((r) => (r.id === pickerRowId ? { ...r, bahan: option } : r)));
    setPickerRowId(null);
  }

  function addModelFoto(file) {
    const item = { id: mkId(), type: "ready", preview: URL.createObjectURL(file), pct: 0 };
    setModelFotos((prev) => [...prev, item]);
    uploadMedia(file, {
      kind: "image",
      onProgress: (pct) =>
        setModelFotos((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, type: "uploading", pct } : f)),
        ),
      onStatus: (status) =>
        setModelFotos((prev) =>
          prev.map((f) =>
            f.id === item.id && (status === "compressing" || status === "uploading")
              ? { ...f, type: status }
              : f,
          ),
        ),
    })
      .then((result) =>
        setModelFotos((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, type: "done", url: result.url } : f)),
        ),
      )
      .catch((err) =>
        setModelFotos((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, type: "error", errMsg: friendlyMediaErrorMessage(err) } : f,
          ),
        ),
      );
  }

  const isBusyFoto = (f) => f?.type === "uploading" || f?.type === "compressing";
  const filledBahanRows = bahanRows.filter((r) => r.bahan);
  const isUploading = bahanRows.some((r) => isBusyFoto(r.foto)) || modelFotos.some(isBusyFoto);
  // Pilih bahan wajib (permintaan Denny 2026-08) — minimal 1 BARIS bahan
  // terisi (sekarang bisa lebih dari 1, permintaan Denny 2026-09).
  const canSubmit = !!nama.trim() && !isUploading && filledBahanRows.length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    const modelUrls = modelFotos.filter((f) => f.type === "done").map((f) => f.url);
    const bahanItems = filledBahanRows.map((r) => ({
      nama_bahan: r.bahan.nama_bahan,
      kode_bahan: r.bahan.kode_bahan ?? null,
      satuan: r.bahan.satuan ?? null,
      foto: r.foto?.type === "done" ? r.foto.url : null,
    }));
    // bahanFotoUrl (arg ke-2) sengaja selalu null — kolom `bahan_foto` cuma
    // dibaca lagi utk fallback data LAMA, planning baru simpan foto per
    // bahan lewat bahanItems[].foto (lihat docblock di atas).
    onSave({ nama: nama.trim(), tanggal }, null, modelUrls, bahanItems);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <div>
          <label className={labelCls}>Nama Rencana *</label>
          <input
            type="text"
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="cth. Gamis OSK Motif Bunga — batch Agustus"
            className={fieldCls}
          />
        </div>

        <div>
          <label className={labelCls}>Tanggal</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className={fieldCls}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={labelCls + " mb-0"}>Bahan *</label>
            <button
              type="button"
              onClick={addBahanRow}
              className="font-editorial text-[10px] tracking-[0.1em] uppercase text-[#CAB170] hover:underline"
            >
              + Tambah Bahan
            </button>
          </div>
          <div className="space-y-2">
            {bahanRows.map((row) => (
              <div key={row.id} className="flex gap-2 items-start border border-skin-bdr p-2">
                <div className="w-14 shrink-0">
                  <FotoSlot
                    foto={row.foto}
                    onAdd={(file) => startSingleUpload(file, (updater) => setBahanRowFoto(row.id, updater))}
                    onRemove={() => setBahanRowFoto(row.id, null)}
                    placeholder="Foto"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPickerRowId(row.id)}
                  className={fieldCls + " flex-1 min-w-0 text-left truncate self-stretch"}
                >
                  {row.bahan ? row.bahan._label : "Pilih bahan..."}
                </button>
                {bahanRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBahanRow(row.id)}
                    className="shrink-0 w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 border border-skin-bdr transition"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={labelCls + " mb-0"}>
              Foto Model Referensi <span className="text-skin-text4">(maks {MAX_MODEL_FOTO})</span>
            </label>
            {modelFotos.some(isBusyFoto) && (
              <span className="text-[9px] text-[#CAB170] font-editorial animate-pulse">
                Mengupload...
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {modelFotos.map((f) => (
              <FotoSlot
                key={f.id}
                foto={f}
                onAdd={() => {}}
                onRemove={() => setModelFotos((prev) => prev.filter((x) => x.id !== f.id))}
              />
            ))}
            {modelFotos.length < MAX_MODEL_FOTO && (
              <FotoSlot foto={null} onAdd={addModelFoto} placeholder="Model" />
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-skin-bdr-lt">
        {isUploading && (
          <div className="px-4 py-2 bg-[#CAB170]/5 border-b border-[#CAB170]/20 flex items-center gap-2">
            <div className="flex-1 h-1 bg-skin-bdr rounded-full overflow-hidden">
              <div
                className="h-full bg-[#CAB170] animate-pulse rounded-full"
                style={{ width: "60%" }}
              />
            </div>
            <span className="text-[10px] text-[#CAB170] font-editorial shrink-0">
              Foto sedang diproses...
            </span>
          </div>
        )}
        <div className="flex gap-2 px-4 py-4">
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
            disabled={saving || !canSubmit}
            className="flex-[2] py-2.5 bg-[#CAB170] text-white text-xs font-editorial tracking-[0.15em] uppercase hover:bg-[#A8925A] disabled:opacity-50 transition"
          >
            {saving ? "Menyimpan..." : "Simpan Planning"}
          </button>
        </div>
      </div>

      {pickerRowId !== null && (
        <BahanPickerModal
          options={bahanOptions}
          onSelect={handlePickBahan}
          onClose={() => setPickerRowId(null)}
        />
      )}
    </form>
  );
}
