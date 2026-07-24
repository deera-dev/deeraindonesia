/**
 * WarnaSection.jsx — Section manajemen warna di ProductForm.
 *
 * Props:
 *   warna         — string[]
 *   onAdd         — (warna: string) => void
 *   onRemove      — (warna: string) => void
 *   onRename      — (warnaLama: string, warnaBaru: string) => void  (opsional)
 *   warnaHasStok  — (warna: string) => boolean
 *   saving        — boolean
 */
import { useState } from "react";

export default function WarnaSection({
  warna,
  onAdd,
  onRemove,
  onRename = () => {},
  warnaHasStok,
  saving,
}) {
  const [warnaInput, setWarnaInput] = useState("");
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");

  function doAdd() {
    const v = warnaInput.trim().toUpperCase();
    if (v && !warna.includes(v)) onAdd(v);
    setWarnaInput("");
  }

  function startRename(i, w) {
    setEditingIdx(i);
    setEditValue(w);
    setEditError("");
  }

  function cancelRename() {
    setEditingIdx(null);
    setEditValue("");
    setEditError("");
  }

  function commitRename(i) {
    const old = warna[i];
    const v = editValue.trim().toUpperCase();
    if (!v) {
      setEditError("Nama warna tidak boleh kosong");
      return;
    }
    if (v === old) {
      cancelRename();
      return;
    }
    const dup = warna.some((w, idx) => idx !== i && w === v);
    if (dup) {
      setEditError("Nama warna sudah dipakai warna lain di produk ini");
      return;
    }
    onRename(old, v);
    cancelRename();
  }

  return (
    <div className="mb-8">
      <label className="block text-sm tracking-[0.2em] text-skin-text2 mb-2 uppercase">
        Warna dalam Seri
        <span className="normal-case text-skin-text3 ml-2">({warna.length} warna)</span>
      </label>

      {warna.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {warna.map((w, i) =>
            editingIdx === i ? (
              <span
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 bg-skin-card border-2 border-[#CAB170]"
              >
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    setEditError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename(i);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  className="w-28 bg-transparent text-sm text-skin-text focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => commitRename(i)}
                  title="Simpan nama warna"
                  className="leading-none text-base text-green-600 hover:text-green-700 transition"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={cancelRename}
                  title="Batal ganti nama"
                  className="leading-none text-base text-skin-text3 hover:text-red-500 transition"
                >
                  ×
                </button>
              </span>
            ) : (
              <span
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-skin-gold border-2 border-skin-bdr-gold text-sm text-skin-text"
              >
                {w}
                <button
                  type="button"
                  onClick={() => startRename(i, w)}
                  disabled={saving}
                  title="Ganti nama warna"
                  className="leading-none text-sm text-skin-text3 hover:text-skin-text disabled:opacity-30 transition"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(w)}
                  disabled={saving || warnaHasStok(w)}
                  title={warnaHasStok(w) ? "Tidak bisa dihapus — masih ada stok" : "Hapus warna"}
                  className={`transition leading-none text-base ${
                    warnaHasStok(w)
                      ? "text-skin-text4 opacity-30 cursor-not-allowed"
                      : "text-skin-text3 hover:text-red-500"
                  }`}
                >
                  ×
                </button>
              </span>
            ),
          )}
        </div>
      )}
      {editingIdx !== null && editError && (
        <p className="mb-2 text-xs text-red-500">{editError}</p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={warnaInput}
          onChange={(e) => setWarnaInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              doAdd();
            }
          }}
          disabled={saving}
          placeholder="Hitam, Putih, Navy... (Enter untuk tambah)"
          className="flex-1 bg-skin-card border-2 border-skin-bdr px-4 py-3 text-skin-text text-base focus:outline-none focus:border-[#CAB170] disabled:opacity-40 transition placeholder:text-skin-text4"
        />
        <button
          type="button"
          disabled={saving || !warnaInput.trim() || warna.includes(warnaInput.trim())}
          onClick={doAdd}
          className="px-5 py-3 bg-[#CAB170] text-white text-sm tracking-[0.15em] uppercase hover:bg-[#A8925A] transition disabled:opacity-40"
        >
          Tambah
        </button>
      </div>

      {warna.length > 0 && (
        <p className="mt-2 text-xs text-skin-text3">
          Seri penuh = {warna.join(", ")}
        </p>
      )}
    </div>
  );
}
