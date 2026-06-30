/**
 * PelangganForm.jsx — Form tambah/edit pelanggan.
 * Diekstrak dari pages/Pelanggan.jsx agar halaman tetap lean orchestrator
 * (CLAUDE.md §13: "Jangan taruh logika bisnis di halaman").
 */
import { useState } from "react";

export default function PelangganForm({ initial, onSave, onCancel, saving }) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [noHp, setNoHp] = useState(initial?.no_hp ?? "");
  const [alamat, setAlamat] = useState(initial?.alamat ?? "");
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nama.trim()) return setErr("Nama wajib diisi");
    try {
      await onSave({ nama, no_hp: noHp, alamat });
    } catch (ex) {
      setErr("Gagal simpan: " + ex.message);
    }
  }

  const cls =
    "w-full bg-skin-card border-2 border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4 disabled:opacity-40";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs tracking-[0.15em] text-skin-text3 uppercase mb-1.5">
          Nama *
        </label>
        <input
          type="text"
          value={nama}
          onChange={(e) => setNama(e.target.value.toUpperCase())}
          required
          disabled={saving}
          placeholder="IBU SARI"
          className={cls}
        />
      </div>
      <div>
        <label className="block text-xs tracking-[0.15em] text-skin-text3 uppercase mb-1.5">
          No HP / WhatsApp
        </label>
        <input
          type="tel"
          value={noHp}
          onChange={(e) => setNoHp(e.target.value)}
          disabled={saving}
          placeholder="0812 3456 7890"
          className={cls}
        />
      </div>
      <div>
        <label className="block text-xs tracking-[0.15em] text-skin-text3 uppercase mb-1.5">
          Alamat
        </label>
        <textarea
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          rows={2}
          disabled={saving}
          placeholder="Jl. Contoh No. 1, Jakarta"
          className={cls}
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3.5 bg-[#CAB170] text-white text-sm tracking-[0.2em] uppercase hover:bg-[#A8925A] transition disabled:opacity-40"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-3.5 border-2 border-skin-bdr text-sm text-skin-text3 tracking-[0.15em] uppercase hover:border-[#1A1918] hover:text-skin-text transition disabled:opacity-40"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
