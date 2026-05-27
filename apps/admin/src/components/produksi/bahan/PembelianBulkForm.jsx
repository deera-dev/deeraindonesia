/**
 * PembelianBulkForm.jsx — Form input banyak bahan pembelian sekaligus.
 */
import { useState } from "react";
import { fmtRp, addFourMonths, inputCls, labelCls } from "./bahanUtils";
import FotoUpload from "./FotoUpload";

export default function PembelianBulkForm({ onSave, onCancel }) {
  const today = new Date().toISOString().split("T")[0];
  const [tanggal, setTanggal] = useState(today);
  const [jatuhTempo, setJatuhTempo] = useState(addFourMonths(today));
  const [catatan, setCatatan] = useState("");
  const [rows, setRows] = useState([newRow()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function newRow() {
    return { _id: Math.random(), nama_bahan: "", kode_bahan: "", jumlah: "", harga_satuan: "", foto_url: "" };
  }
  const addRow = () => setRows((p) => [...p, newRow()]);
  const removeRow = (id) => setRows((p) => p.filter((r) => r._id !== id));
  const updateRow = (id, f, v) =>
    setRows((p) => p.map((r) => (r._id === id ? { ...r, [f]: v } : r)));

  function handleTanggal(val) {
    setTanggal(val);
    setJatuhTempo(addFourMonths(val));
  }

  const grandTotal = rows.reduce(
    (s, r) => s + Math.round((Number(r.jumlah) || 0) * (Number(r.harga_satuan) || 0)),
    0,
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const valid = rows.filter((r) => r.nama_bahan.trim() && Number(r.jumlah) > 0);
    if (valid.length === 0) return setErr("Isi minimal 1 bahan dengan jumlah > 0.");
    setErr("");
    setSaving(true);
    try {
      await onSave(
        valid.map((r) => ({
          tanggal,
          nama_bahan: r.nama_bahan.trim(),
          kode_bahan: r.kode_bahan.trim() || null,
          satuan: "yard",
          jumlah: Number(r.jumlah),
          harga_satuan: Number(r.harga_satuan) || 0,
          total_harga: Math.round((Number(r.jumlah) || 0) * (Number(r.harga_satuan) || 0)),
          jatuh_tempo: jatuhTempo,
          catatan: catatan || null,
          foto_url: r.foto_url || null,
          status_bayar: "belum",
        })),
      );
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-2">
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Tanggal Terima</label>
          <input
            type="date"
            className={inputCls}
            value={tanggal}
            onChange={(e) => handleTanggal(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Jatuh Tempo</label>
          <input
            type="date"
            className={inputCls}
            value={jatuhTempo}
            onChange={(e) => setJatuhTempo(e.target.value)}
            required
          />
          <p className="text-xs text-skin-text3 mt-1">Default: 4 bulan dari tanggal terima</p>
        </div>
        <div>
          <label className={labelCls}>Catatan (berlaku untuk semua bahan)</label>
          <textarea
            rows={2}
            className={inputCls}
            placeholder="Opsional..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">
            Daftar Bahan <span className="normal-case">({rows.length})</span>
          </p>
          <button
            type="button"
            onClick={addRow}
            className="text-xs font-editorial tracking-[0.15em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
          >
            + Tambah Baris
          </button>
        </div>

        {rows.map((row, idx) => {
          const subtotal = Math.round((Number(row.jumlah) || 0) * (Number(row.harga_satuan) || 0));
          return (
            <div key={row._id} className="border border-skin-bdr p-3 space-y-2.5 bg-skin-raised">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-skin-text2">Bahan {idx + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row._id)}
                    className="text-red-400 hover:text-red-600 text-xl leading-none transition"
                  >
                    ×
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Nama bahan (cth: Wolfis, Sifon)"
                className={inputCls}
                value={row.nama_bahan}
                onChange={(e) => updateRow(row._id, "nama_bahan", e.target.value)}
              />
              <input
                type="text"
                placeholder="Kode bahan (opsional)"
                className={inputCls}
                value={row.kode_bahan}
                onChange={(e) => updateRow(row._id, "kode_bahan", e.target.value)}
              />
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <label className={labelCls}>Jumlah (yard)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    className={inputCls}
                    value={row.jumlah}
                    onChange={(e) => updateRow(row._id, "jumlah", e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className={labelCls}>Harga / yard</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className={inputCls}
                    value={row.harga_satuan}
                    onChange={(e) => updateRow(row._id, "harga_satuan", e.target.value)}
                  />
                </div>
              </div>
              {subtotal > 0 && (
                <div className="flex justify-between text-xs px-0.5">
                  <span className="text-skin-text3">Subtotal</span>
                  <span className="font-semibold text-[#CAB170]">{fmtRp(subtotal)}</span>
                </div>
              )}
              <div>
                <label className={labelCls}>Foto (opsional)</label>
                <FotoUpload
                  value={row.foto_url}
                  onChange={(url) => updateRow(row._id, "foto_url", url)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {grandTotal > 0 && (
        <div className="flex justify-between items-center px-3 py-2.5 border-2 border-[#CAB170]">
          <span className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">
            Total Keseluruhan
          </span>
          <span className="font-bold text-[#CAB170]">{fmtRp(grandTotal)}</span>
        </div>
      )}

      {err && <p className="text-sm text-red-500">{err}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-60"
        >
          {saving
            ? "Menyimpan..."
            : `Simpan ${rows.filter((r) => r.nama_bahan.trim()).length} Bahan`}
        </button>
      </div>
    </form>
  );
}
