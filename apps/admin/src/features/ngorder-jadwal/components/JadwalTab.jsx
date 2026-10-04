/**
 * JadwalTab.jsx — tab "Jadwal" di halaman Ngorder: kalender bulanan jadwal
 * ngorder. Ketuk tanggal = lihat jadwal hari itu (+ buat jadwal di tanggal
 * itu); tanpa tanggal terpilih = daftar jadwal bulan yang sedang dilihat.
 * `tokoList`/`daerahOptions` dikirim dari TokoPage (sumber data toko).
 */
import { useMemo, useState } from "react";
import { useTripsQuery, tripsOnDate, tripsInMonth, fmtTanggalRange, localDateStr } from "../hooks";
import JadwalKalender from "./JadwalKalender";
import TripCard from "./TripCard";
import TripFormModal from "./TripFormModal";
import TripDetailModal from "./TripDetailModal";

export default function JadwalTab({ tokoList, daerahOptions }) {
  const { data: trips = [], isLoading, isError, error } = useTripsQuery();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDate, setSelectedDate] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openId, setOpenId] = useState(null);

  const shown = useMemo(
    () => (selectedDate ? tripsOnDate(trips, selectedDate) : tripsInMonth(trips, cursor.year, cursor.month)),
    [trips, selectedDate, cursor],
  );

  function shiftMonth(delta) {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedDate(null);
  }

  function goToday() {
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDate(localDateStr());
  }

  function openForm(trip = null) {
    setEditing(trip);
    setFormOpen(true);
  }

  return (
    <div className="px-4 pt-4 space-y-3">
      {isError && (
        <p className="text-sm text-red-500 text-center">
          Gagal memuat jadwal ({error?.message ?? "error"}). Pastikan migrasi 20261004_ngorder_jadwal.sql sudah dijalankan.
        </p>
      )}

      <JadwalKalender
        year={cursor.year}
        month={cursor.month}
        trips={trips}
        selectedDate={selectedDate}
        onSelectDate={(d) => setSelectedDate((prev) => (prev === d ? null : d))}
        onOpenTrip={setOpenId}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        onToday={goToday}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3">
          {selectedDate ? fmtTanggalRange(selectedDate, selectedDate) : "Jadwal bulan ini"}
        </p>
        <button
          type="button"
          onClick={() => openForm()}
          className="px-3 py-2 text-xs font-editorial tracking-[0.1em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
        >
          + Jadwal{selectedDate ? " di Tanggal Ini" : ""}
        </button>
      </div>

      {isLoading && <p className="text-sm text-skin-text4 py-6 text-center">Memuat...</p>}
      {!isLoading && !isError && shown.length === 0 && (
        <p className="text-sm text-skin-text4 py-6 text-center">
          {selectedDate ? "Tidak ada jadwal di tanggal ini." : "Belum ada jadwal di bulan ini."}
        </p>
      )}
      {shown.length > 0 && (
        <div className="divide-y divide-skin-bdr-lt border border-skin-bdr-lt bg-skin-card">
          {shown.map((t) => (
            <TripCard key={t.id} trip={t} onOpen={setOpenId} />
          ))}
        </div>
      )}

      {formOpen && (
        <TripFormModal
          initial={editing}
          daerahOptions={daerahOptions}
          defaultDate={selectedDate}
          onClose={() => setFormOpen(false)}
          onSaved={(row) => !editing && setOpenId(row.id)}
        />
      )}
      {openId && (
        <TripDetailModal tripId={openId} tokoList={tokoList} onClose={() => setOpenId(null)} onEdit={openForm} onOpen={setOpenId} />
      )}
    </div>
  );
}
