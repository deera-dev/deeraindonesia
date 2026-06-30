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

  return (
    <FinanceLayout title={`Sabtu ${fmtTanggalPendek(gajian.tanggal_sabtu)}`} headerAction={headerAction}>
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-skin-bdr-lt">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3 py-1.5 font-editorial text-[11px] tracking-[0.1em] uppercase border transition ${
              activeTab === tab
                ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                : "border-skin-bdr text-skin-text3 hover:border-skin-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <TabComponent gajianId={id} karyawanList={karyawanList} gajian={gajian} />
    </FinanceLayout>
  );
}
