/**
 * SampelForm.jsx — Form buat/edit sampel.
 * - Upload foto langsung saat dipilih, tampilkan progress per foto.
 * - Tombol simpan dinonaktifkan selama ada foto yang sedang upload.
 * - Create mode: multi-entry (3 slot default).
 * - Edit mode: single entry.
 */
import { useState, useCallback } from "react";
import { uploadImage } from "@deera/shared/lib/cloudinary";

function mkId() { return Math.random().toString(36).slice(2, 9); }

const fieldCls =
  "w-full px-3 py-2 bg-skin-raised border border-skin-bdr text-sm text-skin-text font-editorial placeholder:text-skin-text4 focus:outline-none focus:border-[#CAB170] transition";
const labelCls =
  "block font-editorial text-xs tracking-[0.15em] text-skin-text2 mb-1 uppercase";

// ── FotoGrid: grid foto + progress bars ───────────────────────────────────────
// fotos: [{ id, type:"url"|"uploading"|"done"|"error", url?, preview?, pct?, errMsg? }]
function FotoGrid({ fotos, onAdd, onRemove }) {
  function handleInput(e) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onAdd(files);
    e.target.value = "";
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {fotos.map((f) => (
        <div
          key={f.id}
          className="relative aspect-[3/4] border border-skin-bdr overflow-hidden bg-skin-raised"
        >
          <img
            src={f.preview ?? f.url}
            className={`w-full h-full object-cover ${f.type === "uploading" ? "opacity-60" : ""}`}
            alt=""
          />

          {/* Progress bar */}
          {f.type === "uploading" && (
            <div className="absolute bottom-0 left-0 right-0">
              <div className="h-1 bg-black/30">
                <div
                  className="h-full bg-[#CAB170] transition-all duration-150"
                  style={{ width: `${f.pct}%` }}
                />
              </div>
              <p className="text-center text-[9px] text-white bg-black/50 py-0.5 font-editorial">
                {f.pct}%
              </p>
            </div>
          )}

          {/* Done badge */}
          {f.type === "done" && (
            <div className="absolute top-1 left-1 w-4 h-4 bg-emerald-500 flex items-center justify-center rounded-sm">
              <span className="text-white text-[9px] leading-none">✓</span>
            </div>
          )}

          {/* Error overlay */}
          {f.type === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 p-1">
              <p className="text-[9px] text-red-400 font-editorial text-center leading-tight">
                Gagal upload
              </p>
            </div>
          )}

          {/* Hapus (bukan saat uploading) */}
          {f.type !== "uploading" && (
            <button
              type="button"
              onClick={() => onRemove(f.id)}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 transition"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Add button */}
      <label className="flex aspect-[3/4] items-center justify-center border-2 border-dashed border-skin-bdr hover:border-[#CAB170] cursor-pointer flex-col gap-1 text-skin-text3 hover:text-[#CAB170] transition">
        <span className="text-2xl leading-none">+</span>
        <span className="font-editorial text-[10px] tracking-[0.1em] uppercase">Foto</span>
        <input type="file" accept="image/*" multiple onChange={handleInput} className="hidden" />
      </label>
    </div>
  );
}

// ── Helper: mulai upload file, panggil onUpdate dengan functional updater ──────
function startUploads(files, entryId, currentFotos, onUpdate) {
  const newItems = files.map((file) => ({
    id: mkId(),
    type: "uploading",
    preview: URL.createObjectURL(file),
    pct: 0,
  }));

  onUpdate(entryId, (en) => ({ ...en, fotos: [...en.fotos, ...newItems] }));

  newItems.forEach(({ id, preview }, idx) => {
    uploadImage(files[idx], {
      onProgress: (pct) =>
        onUpdate(entryId, (en) => ({
          ...en,
          fotos: en.fotos.map((f) => (f.id === id ? { ...f, pct } : f)),
        })),
    })
      .then((result) =>
        onUpdate(entryId, (en) => ({
          ...en,
          fotos: en.fotos.map((f) =>
            f.id === id ? { id, type: "done", url: result.url, preview } : f,
          ),
        })),
      )
      .catch((err) =>
        onUpdate(entryId, (en) => ({
          ...en,
          fotos: en.fotos.map((f) =>
            f.id === id ? { id, type: "error", preview, errMsg: err.message } : f,
          ),
        })),
      );
  });
}

// ── EntryCard: satu slot sampel dalam create mode ─────────────────────────────
function EntryCard({ entry, index, total, onUpdate, onRemove }) {
  return (
    <div className="border border-skin-bdr bg-skin-raised/30 p-4 space-y-4">
      {/* Card header */}
      <div className="flex items-center justify-between">
        <span className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3">
          Sampel {index + 1}
        </span>
        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="text-xs text-red-400 hover:text-red-500 font-editorial tracking-[0.08em] uppercase transition"
          >
            Hapus
          </button>
        )}
      </div>

      {/* Nama */}
      <div>
        <label className={labelCls}>Nama *</label>
        <input
          type="text"
          required
          value={entry.nama}
          onChange={(e) =>
            onUpdate(entry.id, (en) => ({ ...en, nama: e.target.value }))
          }
          placeholder={`cth. Gamis OSK Motif Bunga v${index + 1}`}
          className={fieldCls}
        />
      </div>

      {/* Tanggal */}
      <div>
        <label className={labelCls}>Tanggal</label>
        <input
          type="date"
          value={entry.tanggal}
          onChange={(e) =>
            onUpdate(entry.id, (en) => ({ ...en, tanggal: e.target.value }))
          }
          className={fieldCls}
        />
      </div>

      {/* Foto */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={labelCls + " mb-0"}>Foto</label>
          {entry.fotos.some((f) => f.type === "uploading") && (
            <span className="text-[9px] text-[#CAB170] font-editorial animate-pulse">
              Mengupload...
            </span>
          )}
        </div>
        <FotoGrid
          fotos={entry.fotos}
          onAdd={(files) => startUploads(files, entry.id, entry.fotos, onUpdate)}
          onRemove={(fotoId) =>
            onUpdate(entry.id, (en) => ({
              ...en,
              fotos: en.fotos.filter((f) => f.id !== fotoId),
            }))
          }
        />
      </div>
    </div>
  );
}

// ── makeEntry: buat entry kosong ──────────────────────────────────────────────
function makeEntry(idx) {
  return {
    id: mkId() + idx,
    nama: "",
    tanggal: new Date().toISOString().split("T")[0],
    fotos: [],
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SampelForm({ initial, onSave, onCancel, saving }) {
  const isEdit = !!initial;

  // ── Edit mode state ───────────────────────────────────────────────────────
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [tanggal, setTanggal] = useState(
    initial?.tanggal ?? new Date().toISOString().split("T")[0],
  );
  // fotos edit: dari initial foto URLs → { id, type:"url", url }
  const [editFotos, setEditFotos] = useState(
    () => (initial?.foto ?? []).map((url) => ({ id: mkId(), type: "url", url })),
  );

  // ── Create mode state ─────────────────────────────────────────────────────
  const [entries, setEntries] = useState(() => [makeEntry(0), makeEntry(1), makeEntry(2)]);

  // Functional updater per entry (stale-closure-safe)
  const updateEntry = useCallback((entryId, updater) => {
    setEntries((prev) => prev.map((e) => (e.id === entryId ? updater(e) : e)));
  }, []);
  const removeEntry = useCallback(
    (entryId) => setEntries((prev) => prev.filter((e) => e.id !== entryId)),
    [],
  );

  // ── Upload progress helper (edit mode) ───────────────────────────────────
  function addEditFiles(files) {
    const newItems = files.map((file) => ({
      id: mkId(),
      type: "uploading",
      preview: URL.createObjectURL(file),
      pct: 0,
    }));
    setEditFotos((prev) => [...prev, ...newItems]);
    newItems.forEach(({ id, preview }, idx) => {
      uploadImage(files[idx], {
        onProgress: (pct) =>
          setEditFotos((prev) =>
            prev.map((f) => (f.id === id ? { ...f, pct } : f)),
          ),
      })
        .then((result) =>
          setEditFotos((prev) =>
            prev.map((f) =>
              f.id === id ? { id, type: "done", url: result.url, preview } : f,
            ),
          ),
        )
        .catch((err) =>
          setEditFotos((prev) =>
            prev.map((f) =>
              f.id === id ? { id, type: "error", preview, errMsg: err.message } : f,
            ),
          ),
        );
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    if (isEdit) {
      const resolvedUrls = editFotos
        .filter((f) => f.type === "url" || f.type === "done")
        .map((f) => f.url);
      onSave({ nama: nama.trim(), tanggal }, resolvedUrls);
    } else {
      const valid = entries.filter((en) => en.nama.trim());
      if (!valid.length) return;
      const dataArr = valid.map((en) => ({ nama: en.nama.trim(), tanggal: en.tanggal }));
      const urlsArr = valid.map((en) =>
        en.fotos.filter((f) => f.type === "url" || f.type === "done").map((f) => f.url),
      );
      onSave(dataArr, urlsArr);
    }
  }

  // ── Disabled states ───────────────────────────────────────────────────────
  const editUploading = editFotos.some((f) => f.type === "uploading");
  const createUploading = entries.some((en) =>
    en.fotos.some((f) => f.type === "uploading"),
  );
  const isUploading = isEdit ? editUploading : createUploading;
  const canSubmit = isEdit
    ? !!nama.trim() && !isUploading
    : entries.some((en) => en.nama.trim()) && !isUploading;

  const uploadingCount = isEdit
    ? editFotos.filter((f) => f.type === "uploading").length
    : entries.flatMap((en) => en.fotos).filter((f) => f.type === "uploading").length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {/* ── EDIT MODE ── */}
        {isEdit && (
          <>
            <div>
              <label className={labelCls}>Nama Sampel *</label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
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
                <label className={labelCls + " mb-0"}>Foto Sampel</label>
                {editUploading && (
                  <span className="text-[9px] text-[#CAB170] font-editorial animate-pulse">
                    Mengupload...
                  </span>
                )}
              </div>
              <FotoGrid
                fotos={editFotos}
                onAdd={addEditFiles}
                onRemove={(fotoId) =>
                  setEditFotos((prev) => prev.filter((f) => f.id !== fotoId))
                }
              />
            </div>
          </>
        )}

        {/* ── CREATE MODE ── */}
        {!isEdit && (
          <>
            {entries.map((entry, idx) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                index={idx}
                total={entries.length}
                onUpdate={updateEntry}
                onRemove={removeEntry}
              />
            ))}
            <button
              type="button"
              onClick={() =>
                setEntries((prev) => [...prev, makeEntry(prev.length)])
              }
              className="w-full py-2.5 border-2 border-dashed border-skin-bdr text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition"
            >
              + Sampel Lagi
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-skin-bdr-lt">
        {/* Upload status bar */}
        {isUploading && (
          <div className="px-4 py-2 bg-[#CAB170]/5 border-b border-[#CAB170]/20 flex items-center gap-2">
            <div className="flex-1 h-1 bg-skin-bdr rounded-full overflow-hidden">
              <div className="h-full bg-[#CAB170] animate-pulse rounded-full" style={{ width: "60%" }} />
            </div>
            <span className="text-[10px] text-[#CAB170] font-editorial shrink-0">
              {uploadingCount} foto sedang diupload...
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
            className="flex-[2] py-2.5 bg-[#CAB170] text-white text-xs font-editorial tracking-[0.15em] uppercase hover:bg-[#A8925A] disabled:opacity-50 disabled:pointer-events-none transition"
          >
            {saving
              ? "Menyimpan..."
              : isUploading
              ? `Menunggu upload (${uploadingCount})...`
              : isEdit
              ? "Simpan"
              : `Buat ${entries.filter((en) => en.nama.trim()).length || entries.length} Sampel`}
          </button>
        </div>
      </div>
    </form>
  );
}
