/**
 * TripFormModal.jsx — buat/edit jadwal ngorder (info dasar saja: nama,
 * tanggal, daerah, peserta, modal awal, status, catatan). Toko, sampel, dan
 * biaya diisi dari TripDetailModal.
 */
import { useState } from "react";
import { useAuth } from "@deera/shared/features/auth/hooks";
import {
  useCreateTripMutation,
  useUpdateTripMutation,
  validateTrip,
  localDateStr,
  TRIP_STATUSES,
  TRIP_STATUS_LABEL,
} from "../hooks";
import ChipInput from "./ChipInput";

const INPUT = "w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition";
const LABEL = "block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1";

export default function TripFormModal({ initial = null, daerahOptions = [], defaultDate = null, onClose, onSaved }) {
  const { user } = useAuth();
  const today = defaultDate ?? localDateStr();
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [mulai, setMulai] = useState(initial?.tanggal_mulai ?? today);
  const [selesai, setSelesai] = useState(initial?.tanggal_selesai ?? today);
  const [daerah, setDaerah] = useState(initial?.daerah ?? []);
  const [peserta, setPeserta] = useState(initial?.peserta ?? []);
  const [modal, setModal] = useState(initial?.modal_awal ? String(initial.modal_awal) : "");
  const [status, setStatus] = useState(initial?.status ?? "rencana");
  const [catatan, setCatatan] = useState(initial?.catatan ?? "");
  const [error, setError] = useState("");

  const createMutation = useCreateTripMutation();
  const updateMutation = useUpdateTripMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e) {
    e.preventDefault();
    const input = {
      nama,
      tanggal_mulai: mulai,
      tanggal_selesai: selesai,
      daerah,
      peserta,
      modal_awal: Number(modal.replace(/\D/g, "")) || 0,
      status,
      catatan,
    };
    const problem = validateTrip(input);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    try {
      const row = initial
        ? await updateMutation.mutateAsync({ id: initial.id, patch: input })
        : await createMutation.mutateAsync({ ...input, user: { email: user?.email } });
      onSaved?.(row);
      onClose();
    } catch (err) {
      setError(err.message ?? "Gagal menyimpan.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={saving ? undefined : onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-skin-card w-full max-w-md h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text">
            {initial ? "Edit Jadwal" : "Jadwal Baru"}
          </h2>
          <button type="button" onClick={onClose} disabled={saving} className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className={LABEL}>Nama Jadwal *</label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Mis. Ngorder Pantura Oktober" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Mulai</label>
              <input type="date" value={mulai} onChange={(e) => { setMulai(e.target.value); if (selesai < e.target.value) setSelesai(e.target.value); }} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Selesai</label>
              <input type="date" value={selesai} min={mulai} onChange={(e) => setSelesai(e.target.value)} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Daerah Tujuan</label>
            <ChipInput value={daerah} onChange={setDaerah} options={daerahOptions} listId="jadwal-daerah-options" placeholder="Ketik daerah lalu Enter" />
          </div>
          <div>
            <label className={LABEL}>Yang Berangkat</label>
            <ChipInput value={peserta} onChange={setPeserta} placeholder="Ketik nama lalu Enter" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Modal Awal (Rp)</label>
              <input inputMode="numeric" value={modal ? Number(modal.replace(/\D/g, "")).toLocaleString("id-ID") : ""} onChange={(e) => setModal(e.target.value)} placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT}>
                {TRIP_STATUSES.map((s) => (
                  <option key={s} value={s}>{TRIP_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Catatan</label>
            <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} className={INPUT + " resize-none"} />
          </div>
          {error && <p className="text-xs text-red-500 font-editorial">{error}</p>}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-40">
            Batal
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40">
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
