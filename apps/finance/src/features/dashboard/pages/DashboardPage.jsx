import { useNavigate } from "react-router-dom";
import FinanceLayout from "../../../shared/components/FinanceLayout";
import { fmtRp, fmtTanggalPendek, getSabtu, getSenin } from "../../../shared/lib/format";
import { useDashboardStats } from "../hooks";
import StatCard from "../components/StatCard";
import SectionHeader from "../components/SectionHeader";
import GajianRecentCard from "../components/GajianRecentCard";

/** DashboardPage.jsx — Ringkasan minggu berjalan & statistik singkat. */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { gajianRecent, pettycashSaldo, pettycashMasuk, pettycashKeluar, kasbonCount, totalSisaKasbon, loading } =
    useDashboardStats();

  const sabtu = getSabtu();
  const senin = getSenin();
  const mingguIni = `${fmtTanggalPendek(senin)} – ${fmtTanggalPendek(sabtu)}`;

  return (
    <FinanceLayout title="Dashboard" subtitle={`Minggu ${fmtTanggalPendek(sabtu)}`}>
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-12">Memuat...</p>
      ) : (
        <div className="space-y-1">
          {/* ── Periode ── */}
          <p className="font-editorial text-xs text-skin-text3 mb-4">{mingguIni}</p>

          {/* ── Petty Cash bulan ini ── */}
          <SectionHeader>Petty Cash Bulan Ini</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Isi Ulang"
              value={fmtRp(pettycashMasuk)}
              color="text-emerald-500"
              onClick={() => navigate("/pettycash")}
            />
            <StatCard
              label="Pengeluaran"
              value={fmtRp(pettycashKeluar)}
              color="text-red-400"
              onClick={() => navigate("/pettycash")}
            />
          </div>
          <StatCard
            label="Saldo Petty Cash"
            value={fmtRp(pettycashSaldo)}
            color={pettycashSaldo >= 0 ? "text-[#CAB170]" : "text-red-400"}
            onClick={() => navigate("/pettycash")}
          />

          {/* ── Kasbon ── */}
          <SectionHeader>Kasbon Aktif</SectionHeader>
          <StatCard
            label="Total Sisa Kasbon"
            value={fmtRp(totalSisaKasbon)}
            sub={`${kasbonCount} karyawan belum lunas`}
            color="text-amber-500"
            onClick={() => navigate("/kasbon")}
          />

          {/* ── Riwayat gajian ── */}
          <SectionHeader>Riwayat Gajian</SectionHeader>
          {gajianRecent.length === 0 ? (
            <p className="text-sm text-skin-text3 py-4 text-center">Belum ada data gajian.</p>
          ) : (
            <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-3 md:space-y-0">
              {gajianRecent.map((g) => (
                <GajianRecentCard key={g.id} g={g} onClick={() => navigate(`/gajian/${g.id}`)} />
              ))}
            </div>
          )}

          {/* ── Quick actions ── */}
          <SectionHeader>Aksi Cepat</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate("/gajian")}
              className="py-3 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-[#CAB170] text-[#CAB170] hover:bg-skin-gold transition"
            >
              + Gajian Baru
            </button>
            <button
              onClick={() => navigate("/pettycash")}
              className="py-3 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition"
            >
              Petty Cash
            </button>
          </div>
        </div>
      )}
    </FinanceLayout>
  );
}
