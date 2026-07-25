import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useKaryawanAktif } from "../../karyawan";
import FinanceLayout from "../../../shared/components/FinanceLayout";
import { fmtTanggalPendek } from "../../../shared/lib/format";
import { useGajianDetail } from "../hooks";
import { TABS } from "../utils";
import TabPotong from "../components/TabPotong";
import TabJahit from "../components/TabJahit";
import TabFinishing from "../components/TabFinishing";
import TabQC from "../components/TabQC";
import TabKreatif from "../components/TabKreatif";
import TabCmt from "../components/TabCmt";
import TabRingkasan from "../components/TabRingkasan";

const TAB_COMPONENTS = {
  Potong: TabPotong,
  Jahit: TabJahit,
  Finishing: TabFinishing,
  QC: TabQC,
  Kreatif: TabKreatif,
  CMT: TabCmt,
  Ringkasan: TabRingkasan,
};

/** GajianDetailPage.jsx — Detail satu periode gajian: tab per tim + Ringkasan. */
export default function GajianDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { gajian, loading } = useGajianDetail(id);
  const { karyawan: karyawanList } = useKaryawanAktif();
  const [activeTab, setActiveTab] = useState("Potong");

  if (loading || !gajian) {
    return (
      <FinanceLayout title="Detail Gajian">
        <p className="text-sm text-skin-text3 text-center py-8">
          {loading ? "Memuat..." : "Periode tidak ditemukan."}
        </p>
      </FinanceLayout>
    );
  }

  const isFinal = gajian.status === "final";
  const headerAction = (
    <div className="flex items-center gap-2">
      <span
        className={`text-[10px] font-editorial tracking-[0.12em] uppercase px-2 py-0.5 border rounded-full ${
          isFinal ? "border-emerald-500 text-emerald-500" : "border-amber-500 text-amber-500"
        }`}
      >
        {gajian.status}
      </span>
      <button onClick={() => navigate("/gajian")} className="font-editorial text-xs text-skin-text3 hover:text-skin-text transition whitespace-nowrap">
        ← Kembali
      </button>
    </div>
  );

  const TabComponent = TAB_COMPONENTS[activeTab];
  // Panel Ringkasan persisten di tablet/desktop (redesign 2026-07): saat
  // sedang mengisi entri tim (Potong/Jahit/dst), total tetap terlihat di
  // samping tanpa perlu klik tab "Ringkasan" terpisah. Saat tab aktif
  // MEMANG "Ringkasan", panel samping disembunyikan supaya tidak dobel
  // (kontennya sudah tampil penuh di area utama). Mobile tidak berubah
  // sama sekali — panel ini "hidden md:block".
  const showRingkasanPanel = activeTab !== "Ringkasan";

  return (
    <FinanceLayout title={`Sabtu ${fmtTanggalPendek(gajian.tanggal_sabtu)}`} headerAction={headerAction}>
      {/* Grid 2 kolom HANYA saat panel Ringkasan tampil (showRingkasanPanel).
          Saat tab "Ringkasan" itu sendiri aktif, panel disembunyikan tapi
          TIDAK BOLEH kolom 380px-nya tetap "dipesan" oleh grid — kalau
          grid-cols-[1fr_380px] tetap dipasang padahal cuma 1 anak yang
          dirender, sisa 380px+gap itu jadi ruang kosong mubazir di kanan
          (persis bug yang sama seperti max-width lama). Makanya di sini
          className grid-cols conditional: cuma dipasang kalau memang ada
          2 kolom yang perlu ditampilkan. */}
      <div
        className={`md:grid md:gap-6 xl:gap-8 md:items-start ${
          showRingkasanPanel ? "md:grid-cols-[1fr_380px]" : ""
        }`}
      >
        <div className="min-w-0">
          {/* Tab bar: flex-wrap (bukan overflow-x-auto) — 7 tab selalu terlihat
              semua, membungkus ke baris berikutnya di layar sempit alih-alih
              minta pengguna geser horizontal. */}
          <div className="flex flex-wrap gap-1.5 pb-3 mb-3 border-b border-skin-bdr-lt">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 font-editorial text-[11px] tracking-[0.1em] uppercase border transition ${
                  activeTab === tab
                    ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                    : "border-skin-bdr text-skin-text3 hover:border-skin-text"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Saat tab "Ringkasan" jadi konten utama (bukan panel sidebar),
              batasi lebarnya di layar sangat lebar — isinya (input
              pettycash, daftar tambahan, dst) adalah form ringkas 1 kolom,
              kalau dibiarkan full-width di layar 1600px+ akan terasa
              aneh/kosong. Tab tim lain (Potong/Jahit/dst) TIDAK dibatasi
              karena isinya grid kartu yang memang harus full-width. */}
          <div className={!showRingkasanPanel ? "xl:max-w-2xl" : ""}>
            <TabComponent gajianId={id} karyawanList={karyawanList} gajian={gajian} />
          </div>
        </div>

        {showRingkasanPanel && (
          <div className="hidden md:block md:sticky md:top-20">
            <TabRingkasan gajianId={id} gajian={gajian} />
          </div>
        )}
      </div>
    </FinanceLayout>
  );
}
