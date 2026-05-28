/**
 * Dashboard.jsx — Ringkasan minggu berjalan & statistik singkat.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@deera/shared/lib/supabase";
import FinanceLayout from "../components/FinanceLayout";
import { fmtRp, fmtTanggalPendek, getSabtu, getSenin } from "../lib/financeUtils";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "text-skin-text", onClick }) {
  return (
    <div
      className={`bg-skin-card border border-skin-bdr p-4 space-y-1 ${onClick ? "cursor-pointer hover:border-[#CAB170] transition" : ""}`}
      onClick={onClick}
    >
      <p className="font-editorial text-[10px] tracking-[0.18em] uppercase text-skin-text3">{label}</p>
      <p className={`font-headline text-xl leading-none ${color}`}>{value}</p>
      {sub && <p className="font-editorial text-xs text-skin-text3">{sub}</p>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ children }) {
  return (
    <p className="font-editorial text-[10px] tracking-[0.22em] uppercase text-skin-text3 mt-5 mb-2">
      {children}
    </p>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const sabtu = getSabtu();
  const senin = getSenin();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Gajian minggu ini
      const { data: gajianList } = await supabase
        .from("gajian_minggu")
        .select("id, tanggal_sabtu, status, total_gaji, total_potong, total_jahit, total_finishing, total_kreatif, total_cmt")
        .order("tanggal_sabtu", { ascending: false })
        .limit(5);

      // 2. Kas: masuk & keluar bulan berjalan
      const bulanAwal = new Date();
      bulanAwal.setDate(1);
      const bulanAwalStr = bulanAwal.toISOString().slice(0, 10);

      const { data: kasList } = await supabase
        .from("kas")
        .select("jenis, jumlah")
        .gte("tanggal", bulanAwalStr);

      const kasMasuk = (kasList ?? [])
        .filter((k) => k.jenis === "masuk")
        .reduce((s, k) => s + (k.jumlah || 0), 0);
      const kasKeluar = (kasList ?? [])
        .filter((k) => k.jenis === "keluar")
        .reduce((s, k) => s + (k.jumlah || 0), 0);

      // 3. Kasbon aktif
      const { count: kasbonCount } = await supabase
        .from("kasbon")
        .select("id", { count: "exact", head: true })
        .eq("status", "belum");

      const { data: kasbonSisa } = await supabase
        .from("kasbon")
        .select("sisa")
        .eq("status", "belum");
      const totalSisaKasbon = (kasbonSisa ?? []).reduce((s, k) => s + (k.sisa || 0), 0);

      setStats({
        gajianList: gajianList ?? [],
        kasMasuk,
        kasKeluar,
        kasbonCount: kasbonCount ?? 0,
        totalSisaKasbon,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const mingguIni = `${fmtTanggalPendek(senin)} – ${fmtTanggalPendek(sabtu)}`;

  return (
    <FinanceLayout title="Dashboard" subtitle={`Minggu ${fmtTanggalPendek(sabtu)}`}>
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-12">Memuat...</p>
      ) : (
        <div className="space-y-1">
          {/* ── Periode ── */}
          <p className="font-editorial text-xs text-skin-text3 mb-4">{mingguIni}</p>

          {/* ── Kas bulan ini ── */}
          <SectionHeader>Kas Bulan Ini</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Kas Masuk"
              value={fmtRp(stats.kasMasuk)}
              color="text-emerald-500"
              onClick={() => navigate("/kas")}
            />
            <StatCard
              label="Kas Keluar"
              value={fmtRp(stats.kasKeluar)}
              color="text-red-400"
              onClick={() => navigate("/kas")}
            />
          </div>

          {/* ── Kasbon ── */}
          <SectionHeader>Kasbon Aktif</SectionHeader>
          <StatCard
            label="Total Sisa Kasbon"
            value={fmtRp(stats.totalSisaKasbon)}
            sub={`${stats.kasbonCount} karyawan belum lunas`}
            color="text-amber-500"
            onClick={() => navigate("/kasbon")}
          />

          {/* ── Riwayat gajian ── */}
          <SectionHeader>Riwayat Gajian</SectionHeader>
          {stats.gajianList.length === 0 ? (
            <p className="text-sm text-skin-text3 py-4 text-center">Belum ada data gajian.</p>
          ) : (
            <div className="space-y-2">
              {stats.gajianList.map((g) => (
                <div
                  key={g.id}
                  className="bg-skin-card border border-skin-bdr p-4 cursor-pointer hover:border-[#CAB170] transition"
                  onClick={() => navigate(`/gajian/${g.id}`)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-editorial text-sm font-semibold text-skin-text">
                      Sabtu, {fmtTanggalPendek(g.tanggal_sabtu)}
                    </p>
                    <span
                      className={`font-editorial text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 border ${
                        g.status === "final"
                          ? "border-emerald-500/40 text-emerald-500"
                          : "border-amber-400/40 text-amber-400"
                      }`}
                    >
                      {g.status}
                    </span>
                  </div>
                  <p className="font-headline text-[#CAB170] text-lg leading-none">
                    {fmtRp(g.total_gaji)}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
                    {[
                      { label: "Potong", val: g.total_potong },
                      { label: "Jahit",  val: g.total_jahit  },
                      { label: "Finishing", val: g.total_finishing },
                      { label: "Kreatif",   val: g.total_kreatif  },
                      { label: "CMT",       val: g.total_cmt      },
                    ].map(({ label, val }) =>
                      val > 0 ? (
                        <p key={label} className="font-editorial text-xs text-skin-text3">
                          {label}: {fmtRp(val)}
                        </p>
                      ) : null
                    )}
                  </div>
                </div>
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
              onClick={() => navigate("/kas")}
              className="py-3 font-editorial text-xs tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition"
            >
              + Catat Kas
            </button>
          </div>
        </div>
      )}
    </FinanceLayout>
  );
}
