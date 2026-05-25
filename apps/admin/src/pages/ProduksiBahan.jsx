/**
 * ProduksiBahan.jsx
 * Manajemen bahan baku:
 *   Tab "Pembelian" : catat beli bahan + jatuh tempo 4 bulan
 *   Tab "Pinjam"    : catat bahan pinjam + surat jalan + jatuh tempo
 *   Tab "Stok"      : ringkasan stok bahan (masuk - keluar produksi)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/hooks/useAuth";
import BackToTop from "@deera/shared/components/BackToTop";
import ProduksiLayout from "../components/produksi/ProduksiLayout";
import { logHistory } from "../hooks/useHistory";
import { toast } from "@deera/shared/lib/toast";
import { toPng } from "html-to-image";

function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}
function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function fmtDateShort(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function addFourMonths(dateStr) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 4);
  return d.toISOString().split("T")[0];
}
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / 86400000);
}

// ── Badge jatuh tempo ────────────────────────────────────────────────────
function JTBadge({ jatuh_tempo, status_bayar }) {
  if (status_bayar === "lunas")
    return (
      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        Lunas
      </span>
    );
  if (!jatuh_tempo) return null;
  const d = daysUntil(jatuh_tempo);
  if (d < 0)
    return (
      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Lewat {Math.abs(d)}h
      </span>
    );
  if (d <= 30)
    return (
      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500">
        {d}h lagi
      </span>
    );
  return (
    <span className="text-[10px] uppercase px-2 py-0.5 bg-skin-raised text-skin-text3">
      {d}h lagi
    </span>
  );
}

const inputCls =
  "w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
const labelCls =
  "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

// ── Form bulk pembelian bahan (tambah banyak sekaligus) ─────────────────
function PembelianBulkForm({ onSave, onCancel }) {
  const today = new Date().toISOString().split("T")[0];
  const [tanggal, setTanggal] = useState(today);
  const [jatuhTempo, setJatuhTempo] = useState(addFourMonths(today));
  const [catatan, setCatatan] = useState("");
  const [rows, setRows] = useState([newRow()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function newRow() {
    return {
      _id: Math.random(),
      nama_bahan: "",
      kode_bahan: "",
      jumlah: "",
      harga_satuan: "",
    };
  }
  function addRow() {
    setRows((p) => [...p, newRow()]);
  }
  function removeRow(id) {
    setRows((p) => p.filter((r) => r._id !== id));
  }
  function updateRow(id, f, v) {
    setRows((p) => p.map((r) => (r._id === id ? { ...r, [f]: v } : r)));
  }

  function handleTanggal(val) {
    setTanggal(val);
    setJatuhTempo(addFourMonths(val));
  }

  const grandTotal = rows.reduce(
    (s, r) =>
      s + Math.round((Number(r.jumlah) || 0) * (Number(r.harga_satuan) || 0)),
    0,
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const valid = rows.filter(
      (r) => r.nama_bahan.trim() && Number(r.jumlah) > 0,
    );
    if (valid.length === 0)
      return setErr("Isi minimal 1 bahan dengan jumlah > 0.");
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
          total_harga: Math.round(
            (Number(r.jumlah) || 0) * (Number(r.harga_satuan) || 0),
          ),
          jatuh_tempo: jatuhTempo,
          catatan: catatan || null,
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
      {/* Header bersama */}
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
          <p className="text-xs text-skin-text3 mt-1">
            Default: 4 bulan dari tanggal terima
          </p>
        </div>
        <div>
          <label className={labelCls}>
            Catatan (berlaku untuk semua bahan)
          </label>
          <textarea
            rows={2}
            className={inputCls}
            placeholder="Opsional..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
      </div>

      {/* Daftar bahan */}
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
          const subtotal = Math.round(
            (Number(row.jumlah) || 0) * (Number(row.harga_satuan) || 0),
          );
          return (
            <div
              key={row._id}
              className="border border-skin-bdr p-3 space-y-2.5 bg-skin-raised"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-skin-text2">
                  Bahan {idx + 1}
                </span>
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
                onChange={(e) =>
                  updateRow(row._id, "nama_bahan", e.target.value)
                }
              />

              <input
                type="text"
                placeholder="Kode bahan (opsional)"
                className={inputCls}
                value={row.kode_bahan}
                onChange={(e) =>
                  updateRow(row._id, "kode_bahan", e.target.value)
                }
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
                    onChange={(e) =>
                      updateRow(row._id, "jumlah", e.target.value)
                    }
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
                    onChange={(e) =>
                      updateRow(row._id, "harga_satuan", e.target.value)
                    }
                  />
                </div>
              </div>

              {subtotal > 0 && (
                <div className="flex justify-between text-xs px-0.5">
                  <span className="text-skin-text3">Subtotal</span>
                  <span className="font-semibold text-[#CAB170]">
                    {fmtRp(subtotal)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand total */}
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

// ── Form bulk pinjam bahan ───────────────────────────────────────────────
function PinjamBulkForm({ onSave, onCancel }) {
  const today = new Date().toISOString().split("T")[0];
  const [tanggal, setTanggal] = useState(today);
  const [namaPemberi, setNamaPemberi] = useState("");
  const [namaPeminjam, setNamaPeminjam] = useState("");
  const [catatan, setCatatan] = useState("");
  const [rows, setRows] = useState([newRow()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function newRow() {
    return {
      _id: Math.random(),
      nama_bahan: "",
      kode_bahan: "",
      satuan: "meter",
      jumlah: "",
      harga_satuan: "",
    };
  }
  function addRow() {
    setRows((p) => [...p, newRow()]);
  }
  function removeRow(id) {
    setRows((p) => p.filter((r) => r._id !== id));
  }
  function updateRow(id, f, v) {
    setRows((p) => p.map((r) => (r._id === id ? { ...r, [f]: v } : r)));
  }

  const grandTotal = rows.reduce(
    (s, r) =>
      s + Math.round((Number(r.jumlah) || 0) * (Number(r.harga_satuan) || 0)),
    0,
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!namaPemberi.trim())
      return setErr("Nama pemberi pinjaman wajib diisi.");
    const valid = rows.filter(
      (r) => r.nama_bahan.trim() && Number(r.jumlah) > 0,
    );
    if (valid.length === 0)
      return setErr("Isi minimal 1 bahan dengan jumlah > 0.");
    setErr("");
    setSaving(true);
    try {
      await onSave(
        valid.map((r) => ({
          tanggal,
          nama_pemberi: namaPemberi.trim(),
          nama_peminjam: namaPeminjam.trim() || null,
          nama_bahan: r.nama_bahan.trim(),
          kode_bahan: r.kode_bahan.trim() || null,
          satuan: r.satuan,
          jumlah: Number(r.jumlah),
          harga_satuan: Number(r.harga_satuan) || 0,
          total_harga: Math.round(
            (Number(r.jumlah) || 0) * (Number(r.harga_satuan) || 0),
          ),
          catatan: catatan || null,
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
      {/* Header bersama */}
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Tanggal Terima</label>
          <input
            type="date"
            className={inputCls}
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Nama Pemberi (yang meminjamkan)</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Nama supplier / toko"
            value={namaPemberi}
            onChange={(e) => setNamaPemberi(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Nama Peminjam (yang menerima)</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Nama Anda / toko Anda"
            value={namaPeminjam}
            onChange={(e) => setNamaPeminjam(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>
            Catatan (berlaku untuk semua bahan)
          </label>
          <textarea
            rows={2}
            className={inputCls}
            placeholder="Opsional..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
      </div>

      {/* Daftar bahan */}
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
          const subtotal = Math.round(
            (Number(row.jumlah) || 0) * (Number(row.harga_satuan) || 0),
          );
          return (
            <div
              key={row._id}
              className="border border-skin-bdr p-3 space-y-2.5 bg-skin-raised"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-skin-text2">
                  Bahan {idx + 1}
                </span>
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
                onChange={(e) =>
                  updateRow(row._id, "nama_bahan", e.target.value)
                }
              />

              <input
                type="text"
                placeholder="Kode bahan (opsional)"
                className={inputCls}
                value={row.kode_bahan}
                onChange={(e) =>
                  updateRow(row._id, "kode_bahan", e.target.value)
                }
              />

              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <label className={labelCls}>Jumlah</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    className={inputCls}
                    value={row.jumlah}
                    onChange={(e) =>
                      updateRow(row._id, "jumlah", e.target.value)
                    }
                  />
                </div>
                <div className="w-24 shrink-0">
                  <label className={labelCls}>Satuan</label>
                  <select
                    className={inputCls}
                    value={row.satuan}
                    onChange={(e) =>
                      updateRow(row._id, "satuan", e.target.value)
                    }
                  >
                    {["meter", "yard", "cm", "kg", "lembar", "roll"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Harga / {row.satuan}</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className={inputCls}
                  value={row.harga_satuan}
                  onChange={(e) =>
                    updateRow(row._id, "harga_satuan", e.target.value)
                  }
                />
              </div>

              {subtotal > 0 && (
                <div className="flex justify-between text-xs px-0.5">
                  <span className="text-skin-text3">Subtotal</span>
                  <span className="font-semibold text-[#CAB170]">
                    {fmtRp(subtotal)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand total */}
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

// ── Form tambah/edit bahan ───────────────────────────────────────────────
function BahanForm({ mode, initial, onSave, onCancel }) {
  const isPinjam = mode === "pinjam";
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    tanggal: initial?.tanggal ?? today,
    nama_pemberi: initial?.dari_siapa ?? initial?.nama_pemberi ?? "", // siapa yang memberi/menjual
    nama_peminjam: initial?.nama_peminjam ?? "", // siapa yang menerima (pinjam)
    nama_bahan: initial?.nama_bahan ?? "",
    kode_bahan: initial?.kode_bahan ?? "",
    satuan: initial?.satuan ?? (isPinjam ? "meter" : "yard"),
    jumlah: initial?.jumlah ?? "",
    jumlah_warna: initial?.jumlah_warna ?? "1",
    harga_satuan: initial?.harga_satuan ?? "",
    jatuh_tempo: initial?.jatuh_tempo ?? addFourMonths(today),
    catatan: initial?.catatan ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const total = (Number(form.jumlah) || 0) * (Number(form.harga_satuan) || 0);

  function set(field, val) {
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === "tanggal") next.jatuh_tempo = addFourMonths(val);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama_bahan.trim()) return setErr("Nama bahan wajib diisi.");
    if (!form.jumlah || Number(form.jumlah) <= 0)
      return setErr("Jumlah harus lebih dari 0.");
    if (isPinjam && !form.nama_pemberi.trim())
      return setErr("Nama pemberi pinjaman wajib diisi.");
    setErr("");
    setSaving(true);
    try {
      await onSave({
        tanggal: form.tanggal,
        nama_pemberi: isPinjam ? form.nama_pemberi : undefined,
        nama_peminjam: isPinjam ? form.nama_peminjam : undefined,
        nama_bahan: form.nama_bahan,
        kode_bahan: form.kode_bahan || null,
        satuan: isPinjam ? form.satuan : "yard",
        jumlah: Number(form.jumlah),
        jumlah_warna: isPinjam ? Number(form.jumlah_warna) || 1 : undefined,
        harga_satuan: Number(form.harga_satuan) || 0,
        total_harga: Math.round(total),
        jatuh_tempo: form.jatuh_tempo,
        catatan: form.catatan || null,
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Tanggal Terima</label>
        <input
          type="date"
          className={inputCls}
          value={form.tanggal}
          onChange={(e) => set("tanggal", e.target.value)}
          required
        />
      </div>

      {isPinjam && (
        <>
          <div>
            <label className={labelCls}>Nama Pemberi (yang meminjamkan)</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Nama supplier / toko"
              value={form.nama_pemberi}
              onChange={(e) => set("nama_pemberi", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Nama Peminjam (yang menerima)</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Nama Anda / toko Anda"
              value={form.nama_peminjam}
              onChange={(e) => set("nama_peminjam", e.target.value)}
            />
          </div>
        </>
      )}

      <div>
        <label className={labelCls}>Nama Bahan</label>
        <input
          type="text"
          className={inputCls}
          placeholder="Cth: Wolfis, Sifon, Katun"
          value={form.nama_bahan}
          onChange={(e) => set("nama_bahan", e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Kode Bahan (opsional)</label>
        <input
          type="text"
          className={inputCls}
          placeholder="Cth: WLF-01"
          value={form.kode_bahan}
          onChange={(e) => set("kode_bahan", e.target.value)}
        />
      </div>

      {isPinjam ? (
        <div>
          <label className={labelCls}>Satuan</label>
          <select
            className={inputCls}
            value={form.satuan}
            onChange={(e) => set("satuan", e.target.value)}
          >
            {["meter", "yard", "cm", "kg", "lembar", "roll"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-skin-raised border border-skin-bdr-lt">
          <span className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">
            Satuan
          </span>
          <span className="text-sm font-semibold text-skin-text">yard</span>
        </div>
      )}

      <div>
        <label className={labelCls}>Jumlah (yard)</label>
        <input
          type="number"
          min="0"
          step="0.1"
          className={inputCls}
          placeholder="0"
          value={form.jumlah}
          onChange={(e) => set("jumlah", e.target.value)}
        />
      </div>

      {isPinjam && (
        <div>
          <label className={labelCls}>
            Jumlah Warna (berapa warna dalam pembelian ini)
          </label>
          <input
            type="number"
            min="1"
            className={inputCls}
            placeholder="1"
            value={form.jumlah_warna}
            onChange={(e) => set("jumlah_warna", e.target.value)}
          />
        </div>
      )}

      <div>
        <label className={labelCls}>
          Harga per {isPinjam ? form.satuan || "satuan" : "yard"}
        </label>
        <input
          type="number"
          min="0"
          className={inputCls}
          placeholder="0"
          value={form.harga_satuan}
          onChange={(e) => set("harga_satuan", e.target.value)}
        />
      </div>

      <div className="flex justify-between items-center px-3 py-2.5 bg-skin-raised border border-skin-bdr">
        <span className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">
          Total Harga
        </span>
        <span className="font-semibold text-[#CAB170]">{fmtRp(total)}</span>
      </div>

      <div>
        <label className={labelCls}>Jatuh Tempo</label>
        <input
          type="date"
          className={inputCls}
          value={form.jatuh_tempo}
          onChange={(e) => set("jatuh_tempo", e.target.value)}
          required
        />
        <p className="text-xs text-skin-text3 mt-1">
          Default: 4 bulan dari tanggal terima
        </p>
      </div>

      <div>
        <label className={labelCls}>Catatan</label>
        <textarea
          rows={2}
          className={inputCls}
          placeholder="Opsional..."
          value={form.catatan}
          onChange={(e) => set("catatan", e.target.value)}
        />
      </div>

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
          {saving ? "Menyimpan..." : initial ? "Simpan Perubahan" : "Tambah"}
        </button>
      </div>
    </form>
  );
}

// ── Surat Jalan Pinjam (print modal) ─────────────────────────────────────
// items = array semua bahan dari satu transaksi (sama pemberi + tanggal)
function SuratJalanModal({ items, onClose }) {
  const printRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const rep = items[0] ?? {}; // representatif untuk header
  const totalKeseluruhan = items.reduce(
    (s, i) => s + (Number(i.total_harga) || 0),
    0,
  );
  const nomorSurat = `SJ-${(rep.tanggal ?? "").replace(/-/g, "")}-${String(
    rep.id ?? "",
  )
    .slice(-4)
    .toUpperCase()}`;

  async function capturePng() {
    const el = printRef.current;
    if (!el) return null;
    return toPng(el, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
  }

  async function handleDownload() {
    setSharing(true);
    try {
      const dataUrl = await capturePng();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${nomorSurat}.png`;
      a.click();
    } catch (e) {
      console.error("Download gagal:", e);
    } finally {
      setSharing(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const dataUrl = await capturePng();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${nomorSurat}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: nomorSurat });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${nomorSurat}.png`;
        a.click();
      }
    } catch (e) {
      if (e?.name !== "AbortError") console.error("Share gagal:", e);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-xl max-h-[92dvh] overflow-y-auto border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt sticky top-0 bg-skin-card z-10">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            Surat Jalan Pinjam Bahan
          </h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text transition text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Preview area */}
        <div className="p-5 bg-white">
          <div
            ref={printRef}
            style={{
              fontFamily: "Georgia, serif",
              color: "#1a1a1a",
              fontSize: "12px",
            }}
          >
            {/* Kop */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                paddingBottom: "14px",
                borderBottom: "3px solid #a8925a",
                marginBottom: "18px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    letterSpacing: "3px",
                    color: "#a8925a",
                  }}
                >
                  DEERA
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: "#888",
                    marginTop: "3px",
                  }}
                >
                  Graceful Elegance
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "bold",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                  }}
                >
                  Surat Jalan
                </div>
                <div
                  style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}
                >
                  Pinjam Bahan
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#a8925a",
                    marginTop: "2px",
                    fontWeight: "600",
                  }}
                >
                  {nomorSurat}
                </div>
              </div>
            </div>

            {/* Pihak */}
            <div
              style={{
                display: "flex",
                border: "1px solid #ddd",
                marginBottom: "18px",
              }}
            >
              <div style={{ flex: 1, padding: "12px 16px" }}>
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    color: "#a8925a",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  Pemberi Pinjaman
                </div>
                <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                  {rep.nama_pemberi || "—"}
                </div>
                <div
                  style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}
                >
                  Tanggal: {fmtDate(rep.tanggal)}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderLeft: "1px solid #ddd",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    color: "#a8925a",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  Penerima Pinjaman
                </div>
                <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                  {rep.nama_peminjam || "—"}
                </div>
              </div>
            </div>

            {/* Tabel bahan */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "14px",
                fontSize: "11.5px",
              }}
            >
              <thead>
                <tr style={{ background: "#a8925a", color: "#fff" }}>
                  <th
                    style={{
                      padding: "8px 10px",
                      textAlign: "center",
                      width: "32px",
                    }}
                  >
                    No
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>
                    Nama Bahan
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>
                    Jumlah
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>
                    Harga / Satuan
                  </th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr
                    key={it.id ?? i}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td
                      style={{
                        padding: "9px 10px",
                        textAlign: "center",
                        color: "#888",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      <div style={{ fontWeight: "600" }}>{it.nama_bahan}</div>
                      {it.kode_bahan && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#888",
                            marginTop: "2px",
                          }}
                        >
                          {it.kode_bahan}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "center" }}>
                      {Number(it.jumlah)} {it.satuan}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right" }}>
                      {fmtRp(it.harga_satuan)}
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        textAlign: "right",
                        fontWeight: "600",
                      }}
                    >
                      {fmtRp(it.total_harga)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  border: "2px solid #a8925a",
                  padding: "10px 20px",
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "1.5px",
                    color: "#888",
                  }}
                >
                  Total Keseluruhan
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#a8925a",
                    marginTop: "2px",
                  }}
                >
                  {fmtRp(totalKeseluruhan)}
                </div>
              </div>
            </div>

            {/* Catatan */}
            {rep.catatan && (
              <div
                style={{
                  background: "#faf9f7",
                  borderLeft: "3px solid #ddd",
                  padding: "10px 14px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "1.5px",
                    color: "#a8925a",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  Catatan
                </div>
                <div style={{ fontSize: "11px", color: "#555" }}>
                  {rep.catatan}
                </div>
              </div>
            )}

            {/* Tanda tangan */}
            <div style={{ display: "flex", gap: "32px", marginTop: "56px" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    color: "#888",
                    marginBottom: "60px",
                  }}
                >
                  Pemberi Pinjaman
                </div>
                <div style={{ borderTop: "1px solid #333", paddingTop: "6px" }}>
                  <div style={{ fontWeight: "bold" }}>
                    {rep.nama_pemberi || "—"}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    color: "#888",
                    marginBottom: "60px",
                  }}
                >
                  Penerima Pinjaman
                </div>
                <div style={{ borderTop: "1px solid #333", paddingTop: "6px" }}>
                  <div style={{ fontWeight: "bold" }}>
                    {rep.nama_peminjam || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: "32px",
                borderTop: "1px solid #eee",
                paddingTop: "10px",
                textAlign: "center",
                fontSize: "9px",
                color: "#aaa",
                letterSpacing: "1px",
              }}
            >
              DEERA INDONESIA · Dokumen ini sah tanpa tanda tangan basah apabila
              ditandatangani secara digital
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-skin-bdr-lt flex gap-2">
          <button
            onClick={onClose}
            className="py-2.5 px-4 font-editorial text-xs tracking-[0.2em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
          >
            Tutup
          </button>
          <button
            onClick={handleDownload}
            disabled={sharing}
            className="flex-1 py-2.5 font-editorial text-xs tracking-[0.2em] uppercase border-2 border-[#CAB170] text-[#CAB170] hover:bg-[#CAB170] hover:text-white transition disabled:opacity-50"
          >
            {sharing ? "..." : "↓ Unduh"}
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 py-2.5 font-editorial text-xs tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50"
          >
            {sharing ? "..." : "↑ Bagikan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal wrapper ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg max-h-[95dvh] overflow-y-auto border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt sticky top-0 bg-skin-card z-10">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text transition text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ── Kartu bahan ──────────────────────────────────────────────────────────
function BahanCard({
  item,
  isPinjam,
  onEdit,
  onDelete,
  onToggleLunas,
  onSuratJalan,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="bg-skin-card border border-skin-bdr p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-skin-text leading-snug">
            {item.nama_bahan}
          </p>
          <p className="text-xs text-skin-text3">
            {Number(item.jumlah)} {item.satuan}
            {isPinjam && item.jumlah_warna > 1
              ? ` · ${item.jumlah_warna} warna`
              : ""}
            {item.kode_bahan ? ` · ${item.kode_bahan}` : ""}
          </p>
          {isPinjam && (
            <p className="text-xs text-skin-text3">
              dari:{" "}
              <span className="text-skin-text2">
                {item.nama_pemberi || "—"}
              </span>
              {item.nama_peminjam ? (
                <>
                  {" "}
                  →{" "}
                  <span className="text-skin-text2">{item.nama_peminjam}</span>
                </>
              ) : null}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <JTBadge
            jatuh_tempo={item.jatuh_tempo}
            status_bayar={item.status_bayar}
          />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center text-skin-text3 hover:text-skin-text border border-skin-bdr transition text-lg leading-none"
            >
              ⋮
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-9 z-50 bg-skin-card border border-skin-bdr shadow-lg w-40 py-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(item);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-skin-text2 hover:text-[#CAB170] transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleLunas(item);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-skin-text2 hover:text-[#CAB170] transition"
                  >
                    {item.status_bayar === "lunas"
                      ? "Tandai Belum Lunas"
                      : "Tandai Lunas"}
                  </button>
                  {isPinjam && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onSuratJalan(item);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-skin-text2 hover:text-[#CAB170] transition"
                    >
                      Surat Jalan
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(item);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:text-red-600 transition"
                  >
                    Hapus
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-skin-text3">
          JT:{" "}
          <span className="text-skin-text2">
            {fmtDateShort(item.jatuh_tempo)}
          </span>
        </span>
        <span className="font-semibold text-sm text-[#CAB170]">
          {fmtRp(item.total_harga)}
        </span>
      </div>

      {item.catatan && (
        <p className="text-xs text-skin-text3 italic border-t border-skin-bdr-lt pt-1.5">
          {item.catatan}
        </p>
      )}
    </div>
  );
}

// ── Panel stok bahan ──────────────────────────────────────────────────────
function StokPanel() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from("v_stok_bahan")
      .select("*")
      .order("nama_bahan")
      .then(({ data }) => {
        setData(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
    );
  if (!data.length)
    return (
      <p className="text-sm text-skin-text3 text-center py-8">
        Belum ada data bahan.
      </p>
    );

  return (
    <div className="space-y-2">
      {data.map((row, i) => (
        <div key={i} className="bg-skin-card border border-skin-bdr p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-sm text-skin-text">
                {row.nama_bahan}
              </p>
              <p className="text-xs text-skin-text3">{row.satuan}</p>
            </div>
            <span
              className={`text-lg font-bold ${Number(row.stok_sisa) < 0 ? "text-red-500" : Number(row.stok_sisa) === 0 ? "text-amber-500" : "text-emerald-500"}`}
            >
              {Number(row.stok_sisa).toFixed(2)}
            </span>
          </div>
          <div className="flex gap-4 text-xs text-skin-text3">
            <span>
              Masuk:{" "}
              <span className="text-skin-text font-medium">
                {Number(row.total_masuk).toFixed(2)}
              </span>
            </span>
            <span>
              Keluar:{" "}
              <span className="text-skin-text font-medium">
                {Number(row.total_keluar).toFixed(2)}
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Halaman utama ─────────────────────────────────────────────────────────
export default function ProduksiBahan() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pembelian");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suratJalan, setSuratJalan] = useState(null);
  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState("");

  const table = activeTab === "pinjam" ? "bahan_pinjam" : "bahan_pembelian";

  const loadItems = useCallback(async () => {
    if (activeTab === "stok") return;
    setLoading(true);
    const { data } = await supabase
      .from(table)
      .select("*")
      .order("tanggal", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [activeTab, table]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleSave(payload) {
    const meta = {
      created_by: user?.email,
      created_by_name: user?.user_metadata?.full_name ?? user?.email,
    };
    if (Array.isArray(payload)) {
      // Bulk insert (PembelianBulkForm atau PinjamBulkForm)
      await supabase
        .from(table)
        .insert(payload.map((p) => ({ ...p, ...meta })))
        .throwOnError();
    } else if (editing) {
      await supabase
        .from(table)
        .update({ ...payload, ...meta })
        .eq("id", editing.id)
        .throwOnError();
    } else {
      await supabase
        .from(table)
        .insert({ ...payload, ...meta })
        .throwOnError();
    }
    logHistory({
      action: activeTab === "pinjam" ? "bahan-pinjam" : "bahan-beli",
      category: "produksi",
      kode: Array.isArray(payload) ? (payload[0]?.kode_bahan ?? "") : (payload.kode_bahan ?? editing?.kode_bahan ?? ""),
      nama: Array.isArray(payload) ? (payload[0]?.nama_bahan ?? "") : (payload.nama_bahan ?? editing?.nama_bahan ?? ""),
      snapshot: Array.isArray(payload) ? { bulk: payload.length } : payload,
      before: editing ? { ...editing } : undefined,
    }).catch(() => {});
    toast.success(editing ? "Data berhasil diperbarui." : "Data berhasil disimpan.");
    setShowForm(false);
    setEditing(null);
    loadItems();
  }

  async function handleToggleLunas(item) {
    const next = item.status_bayar === "lunas" ? "belum" : "lunas";
    await supabase.from(table).update({ status_bayar: next }).eq("id", item.id);
    setItems((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, status_bayar: next } : r)),
    );
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from(table).delete().eq("id", deleteTarget.id);
    logHistory({
      action: "bahan-hapus",
      category: "produksi",
      kode: deleteTarget.kode_bahan ?? "",
      nama: deleteTarget.nama_bahan ?? "",
      snapshot: { ...deleteTarget, sumber: activeTab },
    }).catch(() => {});
    toast.success("Data berhasil dihapus.");
    setDeleteTarget(null);
    loadItems();
  }

  const displayed = items.filter((item) => {
    const matchStatus =
      filterStatus === "semua" || item.status_bayar === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (item.nama_bahan ?? "").toLowerCase().includes(q) ||
      (item.kode_bahan ?? "").toLowerCase().includes(q) ||
      (item.nama_pemberi ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalBelum = items
    .filter((r) => r.status_bayar === "belum")
    .reduce((s, r) => s + (r.total_harga ?? 0), 0);

  const tabs = [
    { key: "pembelian", label: "Pembelian" },
    { key: "pinjam", label: "Pinjam" },
    { key: "stok", label: "Stok Bahan" },
  ];

  return (
    <ProduksiLayout title="Bahan Baku">
      {/* Tab */}
      <div className="flex border border-skin-bdr mb-5">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              setSearch("");
              setFilterStatus("semua");
            }}
            className={`flex-1 py-2.5 font-editorial text-xs tracking-[0.18em] uppercase transition border-r last:border-r-0 border-skin-bdr ${
              activeTab === key
                ? "bg-[#CAB170] text-white"
                : "text-skin-text3 hover:text-skin-text bg-skin-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "stok" ? (
        <StokPanel />
      ) : (
        <>
          {/* Ringkasan tagihan */}
          {totalBelum > 0 && (
            <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <span className="text-xs font-editorial tracking-[0.15em] uppercase text-amber-700 dark:text-amber-400">
                Belum Lunas
              </span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {fmtRp(totalBelum)}
              </span>
            </div>
          )}

          {/* Toolbar */}
          <div className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="Cari nama bahan, kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition"
            />
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition"
              >
                <option value="semua">Semua Status</option>
                <option value="belum">Belum Lunas</option>
                <option value="lunas">Lunas</option>
              </select>
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="px-5 py-2 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition shrink-0"
              >
                + Tambah
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-skin-text3 text-center py-8">
              Memuat...
            </p>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">
              {items.length === 0
                ? `Belum ada data ${activeTab === "pinjam" ? "bahan pinjam" : "pembelian bahan"}.`
                : "Tidak ada data yang cocok."}
            </p>
          ) : (
            <div className="space-y-3">
              {displayed.map((item) => (
                <BahanCard
                  key={item.id}
                  item={item}
                  isPinjam={activeTab === "pinjam"}
                  onEdit={(i) => {
                    setEditing(i);
                    setShowForm(true);
                  }}
                  onDelete={setDeleteTarget}
                  onToggleLunas={handleToggleLunas}
                  onSuratJalan={(clicked) => {
                    // Gabungkan semua bahan dari pemberi + tanggal yang sama jadi satu surat
                    const related = items.filter(
                      (r) =>
                        r.nama_pemberi === clicked.nama_pemberi &&
                        r.tanggal === clicked.tanggal,
                    );
                    setSuratJalan(related.length > 0 ? related : [clicked]);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <BackToTop bottomClass="bottom-24" />

      {/* ── Modal Form ── */}
      {showForm && (
        <Modal
          title={
            !editing && activeTab === "pembelian"
              ? "Tambah Pembelian Bahan"
              : !editing && activeTab === "pinjam"
                ? "Tambah Bahan Pinjam"
                : `Edit ${activeTab === "pinjam" ? "Bahan Pinjam" : "Pembelian Bahan"}`
          }
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          {activeTab === "pembelian" && !editing ? (
            <PembelianBulkForm
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          ) : activeTab === "pinjam" && !editing ? (
            <PinjamBulkForm
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <BahanForm
              mode={activeTab}
              initial={editing}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          )}
        </Modal>
      )}

      {/* ── Modal Hapus ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div
            className="absolute inset-0"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-skin-card border-2 border-skin-bdr p-6 w-full max-w-sm space-y-4">
            <p className="font-editorial text-sm uppercase text-skin-text2">
              Hapus Data
            </p>
            <p className="text-sm text-skin-text">
              Hapus <strong>{deleteTarget.nama_bahan}</strong>? Data tidak bisa
              dikembalikan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-red-500 hover:bg-red-600 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Surat Jalan ── */}
      {suratJalan && (
        <SuratJalanModal
          items={suratJalan}
          onClose={() => setSuratJalan(null)}
        />
      )}
    </ProduksiLayout>
  );
}
