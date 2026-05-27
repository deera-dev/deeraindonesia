/**
 * MergeDupeModal.jsx
 *
 * Deteksi & gabung entri bahan yang memiliki nama_bahan + kode_bahan + satuan +
 * tanggal yang sama persis (artinya entri duplikat — bukan pembelian berbeda hari).
 *
 * Props:
 *   table    — "bahan_pembelian" | "bahan_pinjam"
 *   onClose  — () => void
 *   onDone   — () => void   (dipanggil setelah merge berhasil, agar parent reload)
 */
import { useState, useEffect } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { fmtRp, fmtDateShort } from "./bahanUtils";

export default function MergeDupeModal({ table, onClose, onDone }) {
  const [step, setStep] = useState("loading"); // loading | result | merging | done
  const [groups, setGroups] = useState([]);
  const [merging, setMerging] = useState(false);

  // Ambil semua records dan kelompokkan di sisi client
  useEffect(() => {
    async function detect() {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("tanggal", { ascending: false });
      if (error || !data) {
        setGroups([]);
        setStep("result");
        return;
      }

      // Kunci duplikat: (nama_bahan, kode_bahan, satuan, tanggal)
      const map = {};
      for (const row of data) {
        const key = [
          (row.nama_bahan ?? "").trim().toLowerCase(),
          (row.kode_bahan ?? "").trim().toLowerCase(),
          (row.satuan ?? "").trim().toLowerCase(),
          row.tanggal ?? "",
        ].join("|");
        if (!map[key]) map[key] = [];
        map[key].push(row);
      }

      // Hanya simpan grup yang punya > 1 record
      const dupes = Object.values(map).filter((g) => g.length > 1);
      setGroups(dupes);
      setStep("result");
    }
    detect();
  }, [table]);

  async function handleMergeAll() {
    if (merging || groups.length === 0) return;
    setMerging(true);

    let errors = 0;
    for (const group of groups) {
      // Urutkan: simpan yang pertama (oldest id) sebagai master, hapus sisanya
      const sorted = [...group].sort((a, b) => (a.id > b.id ? 1 : -1));
      const master = sorted[0];
      const rest = sorted.slice(1);

      // Hitung total jumlah dan total_harga gabungan
      const totalJumlah = group.reduce((s, r) => s + Number(r.jumlah ?? 0), 0);
      const totalHarga = group.reduce((s, r) => s + Number(r.total_harga ?? 0), 0);

      // Update master
      const { error: updateErr } = await supabase
        .from(table)
        .update({ jumlah: totalJumlah, total_harga: totalHarga })
        .eq("id", master.id);

      if (updateErr) {
        errors++;
        continue;
      }

      // Hapus duplikat
      for (const dup of rest) {
        const { error: delErr } = await supabase.from(table).delete().eq("id", dup.id);
        if (delErr) errors++;
      }
    }

    setMerging(false);
    if (errors > 0) {
      setStep("result"); // stay so user can see
    } else {
      setStep("done");
    }
  }

  const isPinjam = table === "bahan_pinjam";
  const tableLabel = isPinjam ? "Bahan Pinjam" : "Pembelian Bahan";
  const totalDupes = groups.reduce((s, g) => s + g.length - 1, 0); // jumlah baris yang akan dihapus

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg max-h-[90dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            Gabung Duplikat · {tableLabel}
          </h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text transition text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === "loading" && (
            <p className="text-sm text-skin-text3 text-center py-8">Mendeteksi duplikat...</p>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-skin-text">Penggabungan berhasil!</p>
              <p className="text-xs text-skin-text3 text-center">
                {totalDupes} entri duplikat berhasil digabung.
              </p>
              <button
                onClick={() => { onDone(); onClose(); }}
                className="mt-2 px-6 py-2.5 bg-[#CAB170] hover:bg-[#A8925A] text-white text-sm font-editorial tracking-[0.18em] uppercase transition"
              >
                Tutup
              </button>
            </div>
          )}

          {step === "result" && groups.length === 0 && (
            <div className="flex flex-col items-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-skin-raised border-2 border-skin-bdr flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-skin-text4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-skin-text">Tidak ada duplikat ditemukan</p>
              <p className="text-xs text-skin-text3">
                Semua entri {tableLabel.toLowerCase()} sudah unik.
              </p>
            </div>
          )}

          {step === "result" && groups.length > 0 && (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 rounded-sm">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-semibold">
                  {groups.length} grup duplikat ditemukan
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {totalDupes} entri akan dihapus — qty & total akan digabung ke entri pertama.
                </p>
              </div>

              <div className="space-y-3">
                {groups.map((group, gi) => {
                  const first = group[0];
                  const totalJumlah = group.reduce((s, r) => s + Number(r.jumlah ?? 0), 0);
                  const totalHarga = group.reduce((s, r) => s + Number(r.total_harga ?? 0), 0);
                  return (
                    <div key={gi} className="border-2 border-amber-200 dark:border-amber-700 bg-skin-card">
                      {/* Judul grup */}
                      <div className="px-4 py-2.5 border-b border-skin-bdr-lt bg-amber-50/50 dark:bg-amber-900/10 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-skin-text">{first.nama_bahan}</p>
                          <p className="text-xs text-skin-text3">
                            {first.kode_bahan ? `Kode: ${first.kode_bahan} · ` : ""}
                            {fmtDateShort(first.tanggal)} · {first.satuan}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                            {group.length} entri
                          </p>
                          <p className="text-xs text-skin-text3">
                            → {totalJumlah} {first.satuan}
                          </p>
                        </div>
                      </div>
                      {/* Entri individual */}
                      <div className="divide-y divide-skin-bdr-lt">
                        {group.map((row, ri) => (
                          <div
                            key={row.id}
                            className={`flex items-center justify-between px-4 py-2 text-xs ${ri === 0 ? "bg-green-50/60 dark:bg-green-900/10" : "text-skin-text3"}`}
                          >
                            <span>
                              {ri === 0 ? (
                                <span className="text-green-700 dark:text-green-400 font-semibold mr-1.5">
                                  [SIMPAN]
                                </span>
                              ) : (
                                <span className="text-red-500 font-semibold mr-1.5">[HAPUS]</span>
                              )}
                              {row.jumlah} {row.satuan}
                            </span>
                            <span>{fmtRp(row.total_harga)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {step === "result" && groups.length > 0 && (
          <div className="shrink-0 px-4 py-4 border-t border-skin-bdr flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition hover:border-skin-text2"
            >
              Batal
            </button>
            <button
              onClick={handleMergeAll}
              disabled={merging}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] disabled:opacity-50 transition"
            >
              {merging ? "Menggabung..." : `Gabung ${groups.length} Grup`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
