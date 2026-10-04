/**
 * TripCard.jsx — satu jadwal di daftar: nama, tanggal, daerah, progres toko,
 * dan pemakaian modal (bar merah kalau lewat modal).
 */
import { TRIP_STATUS_LABEL, fmtTanggalRange, fmtRp, summarizeTrip } from "../hooks";

const STATUS_STYLE = {
  rencana: "border-skin-bdr-lt text-skin-text3",
  berjalan: "bg-[#CAB170]/15 text-[#A8925A] border-[#CAB170]",
  selesai: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-transparent",
  batal: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-transparent",
};

export default function TripCard({ trip, onOpen }) {
  const s = summarizeTrip(trip);
  return (
    <button type="button" onClick={() => onOpen(trip.id)} className="w-full text-left px-4 py-3 hover:bg-skin-page transition">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-skin-text">{trip.nama}</p>
        <span className={`flex-shrink-0 text-[10px] font-editorial tracking-[0.05em] uppercase px-1.5 py-0.5 border ${STATUS_STYLE[trip.status] ?? ""}`}>
          {TRIP_STATUS_LABEL[trip.status] ?? trip.status}
        </span>
      </div>
      <p className="text-xs text-skin-text3 mt-0.5">
        {fmtTanggalRange(trip.tanggal_mulai, trip.tanggal_selesai)} · {s.hari} hari
        {trip.peserta?.length ? ` · ${trip.peserta.length} orang` : ""}
      </p>
      {trip.daerah?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {trip.daerah.map((d) => (
            <span key={d} className="text-[10px] px-1.5 py-0.5 bg-skin-raised text-skin-text2">
              {d}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-skin-text3 mt-2">
        <span>
          Toko {s.dikunjungi}/{s.totalToko}
          {s.sampelBawa > 0 ? ` · Sampel ${s.sampelTerbagi}/${s.sampelBawa}` : ""}
        </span>
        {s.modal > 0 && (
          <span className={s.overBudget ? "text-red-500" : ""}>
            {fmtRp(s.terpakai)} / {fmtRp(s.modal)}
          </span>
        )}
      </div>
      {s.modal > 0 && (
        <div className="h-1 bg-skin-raised mt-1">
          <div className={`h-full ${s.overBudget ? "bg-red-500" : "bg-[#CAB170]"}`} style={{ width: `${s.persenModal}%` }} />
        </div>
      )}
    </button>
  );
}
