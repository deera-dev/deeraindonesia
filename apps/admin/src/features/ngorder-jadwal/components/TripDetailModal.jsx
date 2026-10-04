/**
 * TripDetailModal.jsx — detail satu jadwal: ringkasan modal/biaya, toko,
 * sampel, biaya, + aksi (edit, bagikan WA, duplikat, hapus). Data dibaca
 * dari cache query (bukan snapshot) supaya langsung ikut berubah tiap edit.
 */
import { useState } from "react";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import {
  useTripsQuery,
  useUpdateTripMutation,
  useCreateTripMutation,
  useDeleteTripMutation,
  TRIP_STATUSES,
  TRIP_STATUS_LABEL,
  fmtRp,
  fmtTanggalRange,
  summarizeTrip,
  biayaPerKategori,
  duplicateTripPayload,
  buildTripShareText,
} from "../hooks";
import TripTokoSection from "./TripTokoSection";
import TripSampelSection from "./TripSampelSection";
import TripBiayaSection from "./TripBiayaSection";

function Section({ title, hint, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-editorial tracking-[0.12em] uppercase text-skin-text3">
        {title}
        {hint ? <span className="ml-2 normal-case tracking-normal text-skin-text4">{hint}</span> : null}
      </h3>
      {children}
    </section>
  );
}

export default function TripDetailModal({ tripId, tokoList, onClose, onEdit, onOpen }) {
  const { user } = useAuth();
  const { data: trips = [] } = useTripsQuery();
  const updateMutation = useUpdateTripMutation();
  const createMutation = useCreateTripMutation();
  const deleteMutation = useDeleteTripMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) return null;

  const s = summarizeTrip(trip);
  const kategori = biayaPerKategori(trip.biaya);

  async function save(patch) {
    try {
      await updateMutation.mutateAsync({ id: trip.id, patch });
    } catch (err) {
      toast.error(err.message ?? "Gagal menyimpan.");
    }
  }

  async function handleDuplicate() {
    try {
      const row = await createMutation.mutateAsync({ ...duplicateTripPayload(trip), user: { email: user?.email } });
      toast.success("Jadwal disalin - atur tanggalnya lewat Edit.");
      onOpen(row.id);
    } catch (err) {
      toast.error(err.message ?? "Gagal menyalin jadwal.");
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(trip.id);
      onClose();
    } catch (err) {
      toast.error(err.message ?? "Gagal menghapus.");
    }
  }

  const stat = "flex-1 border border-skin-bdr-lt px-3 py-2";
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-start justify-between gap-2 px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-editorial text-sm tracking-[0.15em] uppercase text-skin-text truncate">{trip.nama}</h2>
            <p className="text-xs text-skin-text3 mt-0.5">
              {fmtTanggalRange(trip.tanggal_mulai, trip.tanggal_selesai)} · {s.hari} hari
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex-shrink-0">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={trip.status}
                onChange={(e) => save({ status: e.target.value })}
                className="bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-[#CAB170]"
              >
                {TRIP_STATUSES.map((st) => (
                  <option key={st} value={st}>{TRIP_STATUS_LABEL[st]}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1 min-w-0">
                {(trip.daerah ?? []).map((d) => (
                  <span key={d} className="text-[10px] px-1.5 py-0.5 bg-skin-raised text-skin-text2">{d}</span>
                ))}
              </div>
            </div>
            {trip.peserta?.length > 0 && <p className="text-xs text-skin-text3">Berangkat: {trip.peserta.join(", ")}</p>}
            {trip.catatan && <p className="text-xs text-skin-text3 whitespace-pre-line">{trip.catatan}</p>}
          </div>

          <Section title="Modal">
            <div className="flex gap-2">
              <div className={stat}>
                <p className="text-[10px] uppercase text-skin-text4">Awal</p>
                <p className="text-sm font-semibold text-skin-text">{fmtRp(s.modal)}</p>
              </div>
              <div className={stat}>
                <p className="text-[10px] uppercase text-skin-text4">Terpakai</p>
                <p className="text-sm font-semibold text-skin-text">{fmtRp(s.terpakai)}</p>
              </div>
              <div className={stat}>
                <p className="text-[10px] uppercase text-skin-text4">Sisa</p>
                <p className={`text-sm font-semibold ${s.overBudget ? "text-red-500" : "text-green-600"}`}>{fmtRp(s.sisa)}</p>
              </div>
            </div>
            {s.modal > 0 && (
              <div className="h-1.5 bg-skin-raised">
                <div className={`h-full ${s.overBudget ? "bg-red-500" : "bg-[#CAB170]"}`} style={{ width: `${s.persenModal}%` }} />
              </div>
            )}
            {kategori.length > 0 && (
              <p className="text-xs text-skin-text3">{kategori.map((k) => `${k.label} ${fmtRp(k.total)}`).join(" · ")}</p>
            )}
          </Section>

          <Section title="Toko" hint={`${s.dikunjungi}/${s.totalToko} dikunjungi`}>
            <TripTokoSection trip={trip} tokoList={tokoList} save={save} />
          </Section>

          <Section title="Sampel" hint={s.sampelBawa > 0 ? `${s.sampelTerbagi}/${s.sampelBawa} terbagi` : ""}>
            <TripSampelSection trip={trip} save={save} />
          </Section>

          <Section title="Biaya">
            <TripBiayaSection trip={trip} save={save} />
          </Section>
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-3 flex items-center gap-4 text-xs font-editorial tracking-[0.08em] uppercase">
          {confirmDelete ? (
            <>
              <span className="text-skin-text2 normal-case tracking-normal">Hapus jadwal ini?</span>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-skin-text3 underline">Batal</button>
              <button type="button" onClick={handleDelete} className="text-red-500 underline">Ya, hapus</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => onEdit(trip)} className="text-[#CAB170] underline">Edit</button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(buildTripShareText(trip))}`}
                target="_blank"
                rel="noreferrer"
                className="text-green-600 underline"
              >
                Bagikan
              </a>
              <button type="button" onClick={handleDuplicate} disabled={createMutation.isPending} className="text-skin-text2 underline disabled:opacity-40">
                Duplikat
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-skin-text3 hover:text-red-500 underline ml-auto">
                Hapus
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
