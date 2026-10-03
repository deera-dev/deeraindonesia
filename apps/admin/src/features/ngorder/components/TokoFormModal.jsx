/**
 * TokoFormModal.jsx — Tambah/edit satu toko/mitra sampel. Diperluas
 * (permintaan Denny 2026-10: "catat per lokasi ... lengkap dengan lokasi
 * dan alamat, media sosialnya, serta nomor telfonnya ... apakah mereka
 * tertarik atau belum tertarik") dari form dasar (nama/alamat/kontak)
 * jadi mencakup daerah, media sosial, dan status approach + kesan.
 *
 * `daerahOptions` (dari TokoPage, hasil distinctDaerahList toko yang
 * sudah ada) dipasang sbg <datalist> di field Daerah — supaya penamaan
 * daerah konsisten antar toko (mis. selalu "Sidoarjo", bukan kadang
 * "sidoarjo"/"SDA") tanpa memaksa jadi dropdown tertutup (daerah baru yang
 * belum pernah dicatat tetap bisa diketik bebas).
 */
import { useState } from "react";
import { useCreateTokoMutation, useUpdateTokoMutation } from "../hooks";

export default function TokoFormModal({ initial = null, daerahOptions = [], onClose, onSaved }) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [alamat, setAlamat] = useState(initial?.alamat ?? "");
  const [daerah, setDaerah] = useState(initial?.daerah ?? "");
  const [mediaSosial, setMediaSosial] = useState(initial?.media_sosial ?? "");
  const [kontakNama, setKontakNama] = useState(initial?.kontak_nama ?? "");
  const [noHp, setNoHp] = useState(initial?.no_hp ?? "");
  const [statusApproach, setStatusApproach] = useState(initial?.status_approach ?? "belum");
  const [kesan, setKesan] = useState(initial?.kesan ?? "");
  const [catatan, setCatatan] = useState(initial?.catatan ?? "");
  const [error, setError] = useState("");

  const createMutation = useCreateTokoMutation();
  const updateMutation = useUpdateTokoMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama toko wajib diisi.");
      return;
    }
    setError("");
    try {
      const patch = {
        nama,
        alamat,
        daerah,
        media_sosial: mediaSosial,
        kontak_nama: kontakNama,
        no_hp: noHp,
        status_approach: statusApproach,
        kesan,
        catatan,
      };
      const row = initial
        ? await updateMutation.mutateAsync({ id: initial.id, patch })
        : await createMutation.mutateAsync(patch);
      onSaved?.(row);
      onClose();
    } catch (err) {
      setError(err.message ?? "Gagal menyimpan.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={saving ? undefined : onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-skin-card w-full max-w-md h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text">
            {initial ? "Edit Toko" : "Tambah Toko"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
              Nama Toko *
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Mis. UD Putra Toserba"
              className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                Daerah
              </label>
              <input
                type="text"
                list="toko-daerah-options"
                value={daerah}
                onChange={(e) => setDaerah(e.target.value)}
                placeholder="Mis. Sidoarjo"
                className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
              />
              <datalist id="toko-daerah-options">
                {daerahOptions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                No. HP
              </label>
              <input
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
              Alamat
            </label>
            <textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              rows={2}
              className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                Nama Kontak
              </label>
              <input
                type="text"
                value={kontakNama}
                onChange={(e) => setKontakNama(e.target.value)}
                className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                Media Sosial
              </label>
              <input
                type="text"
                value={mediaSosial}
                onChange={(e) => setMediaSosial(e.target.value)}
                placeholder="Mis. @namatoko / link IG"
                className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
              Status Approach
            </label>
            <div className="flex border border-skin-bdr overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setStatusApproach("belum");
                  setKesan("");
                }}
                className={`flex-1 py-2.5 text-sm font-medium transition ${
                  statusApproach === "belum" ? "bg-skin-text3 text-white" : "bg-skin-page text-skin-text2"
                }`}
              >
                Belum Di-Approach
              </button>
              <button
                type="button"
                onClick={() => setStatusApproach("sudah")}
                className={`flex-1 py-2.5 text-sm font-medium transition border-l border-skin-bdr ${
                  statusApproach === "sudah" ? "bg-[#CAB170] text-white" : "bg-skin-page text-skin-text2"
                }`}
              >
                Sudah Di-Approach
              </button>
            </div>
          </div>

          {statusApproach === "sudah" && (
            <div>
              <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                Kesan Mereka
              </label>
              <div className="flex border border-skin-bdr overflow-hidden">
                <button
                  type="button"
                  onClick={() => setKesan("")}
                  className={`flex-1 py-2.5 text-xs font-medium transition ${
                    !kesan ? "bg-skin-text3 text-white" : "bg-skin-page text-skin-text2"
                  }`}
                >
                  Belum Tahu
                </button>
                <button
                  type="button"
                  onClick={() => setKesan("tertarik")}
                  className={`flex-1 py-2.5 text-xs font-medium transition border-l border-skin-bdr ${
                    kesan === "tertarik" ? "bg-green-600 text-white" : "bg-skin-page text-skin-text2"
                  }`}
                >
                  Tertarik
                </button>
                <button
                  type="button"
                  onClick={() => setKesan("belum_tertarik")}
                  className={`flex-1 py-2.5 text-xs font-medium transition border-l border-skin-bdr ${
                    kesan === "belum_tertarik" ? "bg-red-500 text-white" : "bg-skin-page text-skin-text2"
                  }`}
                >
                  Belum Tertarik
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
              Catatan
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition resize-none"
              placeholder="Mis. jam buka, preferensi model, kesan detail kunjungan, dll (opsional)"
            />
          </div>
          {error && <p className="text-xs text-red-500 font-editorial">{error}</p>}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
