/**
 * BahanForm.jsx — Form edit/tambah satu bahan (pembelian atau pinjam).
 * Digunakan saat mengedit bahan yang sudah ada.
 */
import { useState } from "react";
import { fmtRp, addFourMonths, inputCls, labelCls } from "./bahanUtils";
import FotoUpload from "./FotoUpload";

const SATUAN_OPTIONS = ["meter", "yard", "cm", "kg", "lembar", "roll"];

export default function BahanForm({ mode, initial, onSave, onCancel }) {
  const isPinjam = mode === "pinjam";
  const today = new Date().toISOString().split("T")[0];

  const [arahPinjam, setArahPinjam] = useState(initial?.arah_pinjam ?? "masuk");
  const [fotoUrl, setFotoUrl] = useState(initial?.foto_url ?? "");

  const [form, setForm] = useState({
    tanggal: initial?.tanggal ?? today,
    nama_pemberi: initial?.dari_siapa ?? initial?.nama_pemberi ?? "",
    nama_peminjam: initial?.nama_peminjam ?? "",
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
    if (!form.jumlah || Number(form.jumlah) <= 0) return setErr("Jumlah harus lebih dari 0.");
    if (isPinjam && arahPinjam === "masuk" && !form.nama_pemberi.trim())
      return setErr("Nama pemberi pinjaman wajib diisi.");
    if (isPinjam && arahPinjam === "keluar" && !form.nama_peminjam.trim())
      return setErr("Nama peminjam wajib diisi.");
    setErr("");
    setSaving(true);
    try {
      await onSave({
        tanggal: form.tanggal,
        ...(isPinjam ? { arah_pinjam: arahPinjam } : {}),
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
        foto_url: fotoUrl || null,
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
          {/* Arah pinjam */}
          <div>
            <p className={labelCls}>Arah Bahan</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setArahPinjam("masuk")}
                className={`py-2.5 px-3 border-2 text-xs font-editorial tracking-[0.12em] uppercase transition text-left ${
                  arahPinjam === "masuk"
                    ? "border-[#CAB170] bg-[#CAB170]/10 text-[#CAB170]"
                    : "border-skin-bdr text-skin-text3 hover:border-[#CAB170]"
                }`}
              >
                <span className="block font-bold mb-0.5">↓ Masuk</span>
                <span className="text-[10px] normal-case font-normal opacity-80">
                  Diterima Deera
                </span>
              </button>
              <button
                type="button"
                onClick={() => setArahPinjam("keluar")}
                className={`py-2.5 px-3 border-2 text-xs font-editorial tracking-[0.12em] uppercase transition text-left ${
                  arahPinjam === "keluar"
                    ? "border-amber-500 bg-amber-500/10 text-amber-600"
                    : "border-skin-bdr text-skin-text3 hover:border-amber-500"
                }`}
              >
                <span className="block font-bold mb-0.5">↑ Keluar</span>
                <span className="text-[10px] normal-case font-normal opacity-80">
                  Dipinjamkan Deera
                </span>
              </button>
            </div>
          </div>

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
            {SATUAN_OPTIONS.map((s) => (
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
        <label className={labelCls}>Jumlah {isPinjam ? "" : "(yard)"}</label>
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
          <label className={labelCls}>Jumlah Warna (berapa warna dalam pembelian ini)</label>
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
        <label className={labelCls}>Harga per {isPinjam ? form.satuan || "satuan" : "yard"}</label>
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
        <p className="text-xs text-skin-text3 mt-1">Default: 4 bulan dari tanggal terima</p>
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

      <div>
        <label className={labelCls}>Foto Bahan (opsional)</label>
        <FotoUpload value={fotoUrl} onChange={setFotoUrl} />
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
