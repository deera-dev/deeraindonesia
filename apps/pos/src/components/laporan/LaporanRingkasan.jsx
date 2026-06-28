/**
 * LaporanRingkasan.jsx
 *
 * Sub-tab "Laporan" — kesimpulan singkat dari semua sub-tab lain, dirangkum
 * jadi cuma 2 kartu: "BEP Pasar" dan "Transaksi". Kartu Transaksi menggabungkan
 * Transaksi + Keuangan + Stok + Pembeli jadi satu (dipisah border tipis per
 * bagian) karena keempatnya saling berhubungan — sama-sama ringkasan dari
 * `sales` hari/rentang yang difilter. Tombol "Detail" di header tiap kartu
 * navigate ke sub-tab terkait (kartu Transaksi → sub-tab "transaksi"). Tab ini
 * jadi default/tab pertama saat halaman Laporan dibuka.
 *
 * Kartu BEP ditaruh paling atas & paling detail (bukan cuma saldo) karena ini
 * info yang paling sering dicek — termasuk status hari ini & target minggu
 * depan, supaya tidak perlu pindah tab untuk lihat itu semua.
 *
 * Sumber data:
 * - Transaksi/Keuangan/Stok/Pembeli (di dalam kartu Transaksi) dihitung dari
 *   `sales` yang sama persis dengan tab lain (sudah ikut filter tanggal di atas).
 * - BEP fetch sendiri (lokasi_pasar_biaya + hpp_template + histori SEMUA
 *   sales, bukan cuma lokasi pasar — saldo BEP boleh ditutup dari untung
 *   jualan di mana saja), karena bersifat akumulatif lintas waktu, tidak
 *   ikut filter tanggal halaman. Pakai fungsi murni yang sama dari bepUtils
 *   supaya angkanya selalu konsisten dengan tab BEP.
 *
 * Props:
 * - sales      : array transaksi (sudah difilter tanggal oleh Laporan.jsx)
 * - onNavigate : (tabKey) => void — pindah ke sub-tab terkait
 */
import { useEffect, useState } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import { getMarketLocation } from "@deera/shared/lib/marketDay";
import { supabase } from "@deera/shared/lib/supabase";
import {
  computeMarginPerPcs,
  computeSaldoHarian,
  computeTargetProduksi,
  findEarliestMarketDate,
  localDateStr,
  DEFAULT_BIAYA_PASAR,
} from "@deera/shared/lib/bepUtils";
import { effectiveQty, itemProfit } from "../../lib/salesUtils";

const MARKET_LOCS = ["cideng", "tegalgubug"];
const LOC_LABEL = { cideng: "Cideng", tegalgubug: "Tegalgubug" };

function fmtRp(n) {
  const v = Math.round(n ?? 0);
  return (v < 0 ? "-Rp " : "Rp ") + Math.abs(v).toLocaleString("id-ID");
}

function fmtPcs(n) {
  return (Math.round((n ?? 0) * 10) / 10).toLocaleString("id-ID");
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <p className="text-[10px] text-skin-text4 uppercase tracking-[0.12em]">{label}</p>
      <p className={`font-headline text-lg leading-tight mt-1 ${accent ?? "text-skin-text"}`}>{value}</p>
    </div>
  );
}

export default function LaporanRingkasan({ sales, onNavigate }) {
  const realSales = sales.filter((s) => s.type !== "retur");

  // ── Transaksi & Keuangan ──
  const omset = realSales.reduce((s, t) => s + (t.total ?? 0), 0);
  const untung = realSales.reduce(
    (s, t) => s + (t.items ?? []).reduce((ss, item) => ss + itemProfit(item), 0),
    0,
  );
  const totalPcs = realSales.reduce(
    (s, t) => s + (t.items ?? []).reduce((ss, item) => ss + (effectiveQty(item) ?? 0), 0),
    0,
  );
  const marginPct = omset > 0 ? Math.round((untung / omset) * 100) : 0;

  // ── Stok ──
  const keluarMap = {};
  for (const t of realSales) {
    for (const item of t.items ?? []) {
      const key = `${item.kode}|${item.size}`;
      keluarMap[key] = (keluarMap[key] ?? 0) + effectiveQty(item);
    }
  }
  const topStok = Object.entries(keluarMap)
    .map(([key, qty]) => {
      const [kode, size] = key.split("|");
      return { kode, size, qty };
    })
    .sort((a, b) => b.qty - a.qty)[0];

  // ── Pembeli ──
  const buyerMap = {};
  for (const t of realSales) {
    if (!t.buyer_name) continue;
    const key = t.buyer_name.trim().toLowerCase();
    if (!buyerMap[key]) buyerMap[key] = { nama: t.buyer_name, total: 0 };
    buyerMap[key].total += t.total ?? 0;
  }
  const buyerList = Object.values(buyerMap).sort((a, b) => b.total - a.total);
  const topBuyer = buyerList[0];

  // ── BEP — fetch independen, saldo akumulatif lintas waktu & lintas lokasi ──
  const [bep, setBep] = useState({ loading: true, ada: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [biayaRes, salesRes, hppRes] = await Promise.all([
          supabase.from("lokasi_pasar_biaya").select("*"),
          supabase.from("sales").select("date, location, type, items").order("date", { ascending: true }),
          supabase.from("hpp_template").select("total_hpp"),
        ]);
        if (cancelled) return;

        const biayaMap = {};
        for (const r of biayaRes.data ?? []) biayaMap[r.lokasi] = r;
        const effMap = {};
        for (const loc of MARKET_LOCS) {
          const row = biayaMap[loc];
          const sudahDiatur =
            row && ((row.transport_per_trip ?? 0) > 0 || (row.sewa_lapak_per_tahun ?? 0) > 0);
          effMap[loc] = sudahDiatur ? row : DEFAULT_BIAYA_PASAR[loc];
        }

        const rows = salesRes.data ?? [];
        const startDate = findEarliestMarketDate(rows);
        if (!startDate) {
          if (!cancelled) setBep({ loading: false, ada: false });
          return;
        }

        const { marginPerPcs } = computeMarginPerPcs(rows);
        const { ledger, saldoAkhir } = computeSaldoHarian({
          salesRows: rows,
          biayaMap: effMap,
          marginPerPcs,
          startDate,
        });

        const validTemplates = (hppRes.data ?? []).filter((t) => (t.total_hpp ?? 0) > 0);
        const hppRataRata =
          validTemplates.length > 0
            ? validTemplates.reduce((s, t) => s + t.total_hpp, 0) / validTemplates.length
            : 0;

        const targetProduksi = computeTargetProduksi({
          saldoBerjalan: saldoAkhir,
          biayaMap: effMap,
          marginPerPcs,
          biayaPerPcs: hppRataRata,
        });

        const todayStr = localDateStr();
        const todayLoc = getMarketLocation(new Date());
        const todayEntry = ledger.find((l) => l.tanggal === todayStr);

        if (!cancelled) {
          setBep({
            loading: false,
            ada: true,
            saldoAkhir,
            marginPerPcs,
            todayEntry,
            isMarketDayToday: todayLoc !== "gudang",
            todayLocLabel: LOC_LABEL[todayLoc],
            targetProduksi,
          });
        }
      } catch (err) {
        console.error("[LaporanRingkasan] BEP load error:", err);
        if (!cancelled) setBep({ loading: false, ada: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saldoNeg = bep.ada && bep.saldoAkhir < 0;

  return (
    <div className="p-4 space-y-3">
      <div className="space-y-1 mb-1">
        <p className="font-editorial text-[10px] tracking-[0.24em] uppercase text-[#CAB170]">Ringkasan</p>
        <p className="text-xs text-skin-text4 leading-relaxed">
          Kesimpulan tiap laporan ikut filter tanggal di atas — kecuali kartu BEP, yang saldonya
          akumulatif sejak hari pasar pertama tercatat dan mengikutsertakan untung jualan dari mana
          saja, bukan cuma yang tercatat di hari/lokasi pasar.
        </p>
      </div>

      {/* ── BEP — kartu utama, paling banyak info ── */}
      <div
        className={`relative bg-skin-card border-2 overflow-hidden ${
          saldoNeg ? "border-red-400" : "border-[#CAB170]"
        }`}
      >
        <div className="px-4 py-2.5 border-b border-skin-bdr-lt flex items-center justify-between">
          <p className="font-editorial text-[11px] text-skin-text3 uppercase tracking-[0.18em] font-semibold">
            BEP Pasar
          </p>
          <button
            type="button"
            onClick={() => onNavigate("bep")}
            className="text-[10px] font-editorial font-semibold text-[#CAB170] hover:text-[#A8925A] transition uppercase tracking-[0.12em] flex items-center gap-1 flex-shrink-0 border border-[#CAB170]/30 hover:border-[#CAB170] px-2 py-1"
          >
            Detail <span aria-hidden="true">→</span>
          </button>
        </div>

        {bep.loading ? (
          <p className="text-sm text-skin-text4 px-4 py-6 text-center">Memuat ringkasan BEP...</p>
        ) : !bep.ada ? (
          <p className="text-sm text-skin-text4 px-4 py-6 text-center">
            Belum ada transaksi pasar tercatat.
          </p>
        ) : (
          <>
            <div className="px-4 pt-4 pb-3 text-center border-b border-skin-bdr-lt">
              <p className="font-editorial text-[10px] uppercase tracking-[0.2em] text-skin-text3">
                Saldo Untung Pasar
              </p>
              <p
                className={`font-headline text-3xl leading-none mt-1.5 ${
                  saldoNeg ? "text-red-400" : "text-[#CAB170]"
                }`}
              >
                {fmtRp(bep.saldoAkhir)}
              </p>
              <p
                className={`text-[11px] font-semibold mt-1.5 ${
                  saldoNeg ? "text-red-400" : "text-emerald-500"
                }`}
              >
                {saldoNeg
                  ? "Defisit — ongkos pasar belum tertutup untung."
                  : "Tabungan — ongkos pasar sudah tertutup untung."}
              </p>
            </div>

            {bep.isMarketDayToday && bep.todayEntry && (
              <div className="px-4 py-3 border-b border-skin-bdr-lt">
                <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.12em] mb-2">
                  Status Hari Ini · {bep.todayLocLabel}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Target Pcs" value={fmtPcs(bep.todayEntry.targetPcsHariIni)} />
                  <Stat
                    label="Pcs Laku"
                    value={fmtPcs(bep.todayEntry.pcsLakuAktual)}
                    accent="text-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="px-4 py-3 border-b border-skin-bdr-lt">
              <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.12em] mb-2">
                Target Minggu Depan
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Perlu Terjual" value={`${fmtPcs(bep.targetProduksi.targetProduksiPcs)} pcs`} />
                <Stat label="Modal Kalau Produksi Baru" value={fmtRp(bep.targetProduksi.modalBahanDibutuhkan)} />
              </div>
              <p className="text-[10px] text-skin-text4 mt-2 leading-snug">
                Pcs yang perlu terjual (dari mana saja) agar ongkos pasar minggu depan tertutup untung.
                Modal bahan cuma berlaku kalau pcs itu harus diproduksi baru — bukan dari stok yang
                sudah ada.
              </p>
            </div>

            <div className="px-4 py-2.5">
              <p className="text-[10px] text-skin-text4">
                Margin rata-rata {fmtRp(bep.marginPerPcs)}/pcs (60 hari terakhir)
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Transaksi — gabungan Transaksi + Keuangan + Stok + Pembeli ── */}
      <div className="relative bg-skin-card border border-skin-bdr overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#CAB170]/0 via-[#CAB170]/60 to-[#CAB170]/0" />
        <div className="px-4 py-3 border-b border-skin-bdr-lt flex items-center justify-between">
          <p className="font-editorial text-[11px] text-skin-text3 uppercase tracking-[0.18em] font-semibold">
            Transaksi
          </p>
          <button
            type="button"
            onClick={() => onNavigate("transaksi")}
            className="text-[10px] font-editorial font-semibold text-[#CAB170] hover:text-[#A8925A] transition uppercase tracking-[0.12em] flex items-center gap-1 flex-shrink-0 border border-[#CAB170]/30 hover:border-[#CAB170] px-2 py-1"
          >
            Detail <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* Transaksi & Keuangan */}
        <div className="px-4 py-3.5 border-b border-skin-bdr-lt space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Transaksi" value={realSales.length} />
            <Stat label="Pcs Terjual" value={totalPcs} />
            <Stat
              label="Omset"
              value={omset > 0 ? `Rp ${formatHarga(omset)}` : "—"}
              accent="text-[#CAB170]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Keuntungan"
              value={untung > 0 ? `Rp ${formatHarga(untung)}` : "—"}
              accent="text-green-600"
            />
            <Stat label="Margin" value={omset > 0 ? `${marginPct}%` : "—"} />
          </div>
        </div>

        {/* Stok */}
        <div className="px-4 py-3 border-b border-skin-bdr-lt">
          <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.12em] mb-2">Stok</p>
          {topStok ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-skin-text4 uppercase tracking-[0.12em]">Produk Terlaris</p>
                <p className="font-headline text-base text-skin-text mt-0.5 truncate">
                  {topStok.kode} <span className="text-skin-text3 text-sm">· {topStok.size}</span>
                </p>
              </div>
              <p className="font-headline text-lg text-[#CAB170] flex-shrink-0">{topStok.qty} pcs</p>
            </div>
          ) : (
            <p className="text-sm text-skin-text4">Belum ada data stok</p>
          )}
        </div>

        {/* Pembeli */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.12em] mb-2">
            Pembeli
          </p>
          {topBuyer ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-skin-text4 uppercase tracking-[0.12em]">Top Pembeli</p>
                <p className="font-headline text-base text-skin-text mt-0.5 truncate">{topBuyer.nama}</p>
              </div>
              <p className="font-headline text-lg text-[#CAB170] flex-shrink-0">
                Rp {formatHarga(topBuyer.total)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-skin-text4">Belum ada data pembeli bernama</p>
          )}
        </div>
      </div>
    </div>
  );
}
