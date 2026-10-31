import { useState } from "react";
import { addBiaya, BIAYA_KATEGORI, BIAYA_LABEL, fmtRp, localDateStr, removeBiaya } from "../hooks";

const INPUT =
  "w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition";

export default function TripBiayaSection({ trip, save }) {
  const [kategori, setKategori] = useState("bensin");
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [tanggal, setTanggal] = useState(() => {
    const t = localDateStr();
    return t >= trip.tanggal_mulai && t <= trip.tanggal_selesai ? t : trip.tanggal_mulai;
  });
  const list = trip.biaya ?? [];
  const sorted = [...list]
    .reverse()
    .sort((a, b) => (b.tanggal ?? "").localeCompare(a.tanggal ?? ""));
  const angka = Number(jumlah.replace(/\D/g, "")) || 0;

  function handleAdd() {
    if (angka <= 0) return;
    save({ biaya: addBiaya(list, { tanggal, kategori, jumlah: angka, catatan }) });
    setJumlah("");
    setCatatan("");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition"
        >
          {BIAYA_KATEGORI.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition"
        />
        <input
          inputMode="numeric"
          value={angka ? angka.toLocaleString("id-ID") : ""}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder="Jumlah (Rp)"
          className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition"
        />
        <input
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Catatan (opsional)"
          className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition"
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={angka <= 0}
        className="w-full py-2 font-editorial text-xs tracking-[0.15em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-40"
      >
        + Catat Biaya
      </button>

      {sorted.length === 0 && <p className="text-xs text-skin-text4">Belum ada biaya tercatat.</p>}
      <div className="divide-y divide-skin-bdr-lt">
        {sorted.map((b) => (
          <div key={b.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-skin-text">
                {BIAYA_LABEL[b.kategori] ?? b.kategori}
                {b.catatan ? <span className="text-skin-text3"> · {b.catatan}</span> : null}
              </p>
              <p className="text-[11px] text-skin-text4">{b.tanggal}</p>
            </div>
            <span className="text-sm font-semibold text-skin-text">{fmtRp(b.jumlah)}</span>
            <button
              type="button"
              onClick={() => save({ biaya: removeBiaya(list, b.id) })}
              aria-label="Hapus"
              className="text-skin-text3 hover:text-red-500 text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
