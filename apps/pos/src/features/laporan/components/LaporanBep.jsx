/**
 * LaporanBep.jsx
 *
 * Sub-tab BEP (Break-Even Point) — dashboard pasar.
 * Konsep HPP Pasar / BEP per lokasi / Saldo akumulatif lintas lokasi / Target
 * produksi, dihitung LIVE dari data yang sudah ada (sales, hpp_template) —
 * lihat packages/shared/lib/bepUtils.js untuk detail kalkulasi.
 *
 * Satu-satunya data baru yang disimpan: biaya transport & sewa lapak per
 * lokasi (tabel lokasi_pasar_biaya), diatur lewat modal "Atur Biaya Pasar".
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
  ReferenceLine,
  Cell,
} from "recharts";
import { supabase } from "@deera/shared/lib/supabase";
import { getMarketLocation, LOCATIONS } from "@deera/shared/lib/marketDay";
import {
  computeMarginPerPcs,
  computeBepLokasi,
  computeSaldoHarian,
  computeTargetProduksi,
  computeKebutuhanBahanMingguan,
  computeProyeksiUtangVsSaldo,
  findEarliestMarketDate,
  localDateStr,
  getSisaHariMingguIni,
  DEFAULT_BIAYA_PASAR,
} from "@deera/shared/lib/bepUtils";
import { toast } from "@deera/shared/features/toast/hooks";
import ProyeksiUtangBahan from "./ProyeksiUtangBahan";

const MARKET_LOCS = LOCATIONS.filter((l) => l !== "gudang");
const LOC_LABEL = { cideng: "Cideng", tegalgubug: "Tegalgubug" };

function fmtRp(n) {
  const v = Math.round(n ?? 0);
  return (v < 0 ? "-Rp " : "Rp ") + Math.abs(v).toLocaleString("id-ID");
}

function fmtPcs(n) {
  return (Math.round((n ?? 0) * 10) / 10).toLocaleString("id-ID");
}

/** Versi singkat Rupiah untuk label sumbu chart, misal -1.2jt / 500rb. */
function fmtRpCompact(n) {
  const v = Math.round(n ?? 0);
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}jt`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}${abs}`;
}

function fmtTanggalShort(tanggal) {
  const d = new Date(tanggal + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" });
}

function fmtTanggalLong(tanggal) {
  const d = new Date(tanggal + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

// ── Modal: Atur Biaya Pasar ──────────────────────────────────────────────────
function BiayaPasarModal({ biayaMap, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const f = {};
    for (const loc of MARKET_LOCS) {
      const row = biayaMap[loc];
      // Kosong (bukan "0") kalau belum pernah disimpan manual — supaya nilai
      // acuan tampil sebagai placeholder, bukan dikira nilai tersimpan asli.
      f[loc] = {
        transport_per_trip: row && (row.transport_per_trip ?? 0) > 0 ? String(row.transport_per_trip) : "",
        sewa_lapak_per_tahun:
          row && (row.sewa_lapak_per_tahun ?? 0) > 0 ? String(row.sewa_lapak_per_tahun) : "",
      };
    }
    return f;
  });
  const [saving, setSaving] = useState(false);

  function set(loc, key, val) {
    setForm((f) => ({ ...f, [loc]: { ...f[loc], [key]: val } }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const loc of MARKET_LOCS) {
        const payload = {
          lokasi: loc,
          // Kosong/0 → pakai nilai acuan (placeholder) supaya tersimpan eksplisit,
          // bukan 0 — biar BEP tetap akurat walau Denny tidak ubah apa-apa.
          transport_per_trip: Number(form[loc].transport_per_trip) || DEFAULT_BIAYA_PASAR[loc].transport_per_trip,
          sewa_lapak_per_tahun:
            Number(form[loc].sewa_lapak_per_tahun) || DEFAULT_BIAYA_PASAR[loc].sewa_lapak_per_tahun,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("lokasi_pasar_biaya")
          .upsert(payload, { onConflict: "lokasi" });
        if (error) throw error;
      }
      toast.success("Biaya pasar disimpan.");
      onSaved();
    } catch (err) {
      toast.error("Gagal simpan: " + err.message);
    }
    setSaving(false);
  }

  const inputCls =
    "w-full bg-skin-input border border-skin-bdr text-skin-text px-3 py-2 font-editorial text-sm outline-none focus:border-[#CAB170] transition";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col max-h-[90dvh]">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            Atur Biaya Pasar
          </h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <p className="text-xs text-skin-text3">
            Ongkos transport &amp; sewa lapak dipakai untuk hitung HPP Pasar per hari. Margin per
            pcs &amp; harga jual diambil otomatis dari transaksi POS — tidak perlu diisi manual.
          </p>
          {MARKET_LOCS.map((loc) => (
            <div key={loc} className="space-y-3">
              <p className="font-editorial text-xs tracking-[0.15em] uppercase text-[#CAB170] font-semibold">
                {LOC_LABEL[loc]}
              </p>
              <div className="space-y-1.5">
                <label className="text-xs text-skin-text3">Transport per trip (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={form[loc].transport_per_trip}
                  onChange={(e) => set(loc, "transport_per_trip", e.target.value)}
                  placeholder={String(DEFAULT_BIAYA_PASAR[loc].transport_per_trip)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-skin-text3">Sewa lapak per tahun (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={form[loc].sewa_lapak_per_tahun}
                  onChange={(e) => set(loc, "sewa_lapak_per_tahun", e.target.value)}
                  placeholder={String(DEFAULT_BIAYA_PASAR[loc].sewa_lapak_per_tahun)}
                  className={inputCls}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-skin-bdr px-5 pt-3 pb-4 flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tooltip detail untuk chart tren saldo ────────────────────────────────────
function BepChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-skin-card border border-skin-bdr px-3 py-2 shadow-lg text-xs space-y-1 max-w-[230px]">
      <p className="font-semibold text-skin-text">{fmtTanggalLong(d.tanggal)}</p>
      <p className="text-skin-text3">{d.isMarketDay ? LOC_LABEL[d.lokasi] : "Bukan hari pasar"}</p>
      <div className="border-t border-skin-bdr-lt my-1" />
      <p className="text-skin-text2">
        Pcs laku: <span className="font-semibold text-skin-text">{fmtPcs(d.pcsLakuAktual)}</span>
      </p>
      <p className="text-skin-text2">
        Margin terkumpul: <span className="font-semibold text-skin-text">{fmtRp(d.marginTerkumpul)}</span>
      </p>
      <p className="text-skin-text2">
        HPP Pasar hari ini: <span className="font-semibold text-skin-text">{fmtRp(d.hppPasarHariIni)}</span>
      </p>
      <p className={`font-semibold ${d.dailyNet < 0 ? "text-red-400" : "text-emerald-500"}`}>
        Posisi hari ini: {fmtRp(d.dailyNet)}
      </p>
      <div className="border-t border-skin-bdr-lt my-1" />
      <p className={`font-bold ${d.saldoBaru < 0 ? "text-red-400" : "text-[#CAB170]"}`}>
        Saldo: {fmtRp(d.saldoBaru)} · {d.status === "DEFISIT" ? "Defisit" : "Tabungan"}
      </p>
    </div>
  );
}

// ── Chart tren saldo: bar posisi harian + line saldo kumulatif (recharts) ───
const CHART_MUTED = "#94a3b8";

function SaldoTrendChart({ ledger }) {
  const points = useMemo(
    () =>
      ledger.slice(-45).map((p) => ({
        ...p,
        dailyNet: p.marginTerkumpul - p.hppPasarHariIni,
        tanggalLabel: fmtTanggalShort(p.tanggal),
      })),
    [ledger],
  );
  if (points.length < 2) return null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 22 }}>
          <CartesianGrid stroke={CHART_MUTED} strokeOpacity={0.2} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="tanggalLabel"
            tick={{ fontSize: 9, fill: CHART_MUTED }}
            axisLine={{ stroke: CHART_MUTED, opacity: 0.3 }}
            tickLine={false}
            tickMargin={8}
            height={28}
            interval={points.length > 18 ? Math.ceil(points.length / 9) : 0}
          />
          <YAxis
            yAxisId="net"
            tick={{ fontSize: 9, fill: CHART_MUTED }}
            tickFormatter={fmtRpCompact}
            width={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="saldo"
            orientation="right"
            tick={{ fontSize: 9, fill: CHART_MUTED }}
            tickFormatter={fmtRpCompact}
            width={40}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<BepChartTooltip />} />
          <ReferenceLine yAxisId="net" y={0} stroke={CHART_MUTED} strokeOpacity={0.4} strokeDasharray="3 3" />
          <Bar yAxisId="net" dataKey="dailyNet" radius={[2, 2, 0, 0]} maxBarSize={18}>
            {points.map((p, i) => (
              <Cell key={i} fill={p.dailyNet < 0 ? "#f87171" : "#34d399"} />
            ))}
          </Bar>
          <Line
            yAxisId="saldo"
            type="monotone"
            dataKey="saldoBaru"
            stroke="#CAB170"
            strokeWidth={2}
            dot={{ r: 2, fill: "#CAB170", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center flex-wrap gap-3 mt-1 text-[9px] text-skin-text4">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 inline-block bg-emerald-400 rounded-sm" /> Posisi harian (surplus)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 inline-block bg-red-400 rounded-sm" /> Posisi harian (defisit)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 inline-block bg-[#CAB170]" /> Saldo kumulatif
        </span>
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-skin-raised border border-skin-bdr px-3 py-2.5 space-y-0.5">
      <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.1em]">{label}</p>
      <p className={`font-headline text-base leading-tight ${accent ?? "text-skin-text"}`}>{value}</p>
      {sub && <p className="text-[10px] text-skin-text4">{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LaporanBep() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [biayaMap, setBiayaMap] = useState({});
  const [salesRows, setSalesRows] = useState([]);
  const [hppRataRata, setHppRataRata] = useState(0);
  const [utangRows, setUtangRows] = useState([]);
  const [showBiayaModal, setShowBiayaModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [biayaRes, salesRes, hppRes, utangPembelianRes, utangPinjamRes] = await Promise.all([
        supabase.from("lokasi_pasar_biaya").select("*"),
        supabase
          .from("sales")
          .select("date, location, type, items")
          .order("date", { ascending: true }),
        supabase.from("hpp_template").select("total_hpp"),
        supabase.from("bahan_pembelian").select("total_harga, jatuh_tempo").eq("status_bayar", "belum"),
        supabase
          .from("bahan_pinjam")
          .select("total_harga, jatuh_tempo")
          .eq("status_bayar", "belum")
          .eq("arah_pinjam", "masuk"),
      ]);
      if (biayaRes.error) throw biayaRes.error;
      if (salesRes.error) throw salesRes.error;
      if (hppRes.error) throw hppRes.error;
      // Utang non-fatal: tahan banting kalau RLS belum izinkan apps/pos baca
      // tabel bahan_* — jangan sampai seluruh halaman BEP ikut gagal, cukup
      // anggap utangnya 0 utk sementara.
      if (utangPembelianRes.error) console.error("[LaporanBep] bahan_pembelian:", utangPembelianRes.error);
      if (utangPinjamRes.error) console.error("[LaporanBep] bahan_pinjam:", utangPinjamRes.error);

      const map = {};
      for (const r of biayaRes.data ?? []) map[r.lokasi] = r;
      setBiayaMap(map);
      setSalesRows(salesRes.data ?? []);
      setUtangRows([...(utangPembelianRes.data ?? []), ...(utangPinjamRes.data ?? [])]);

      const validTemplates = (hppRes.data ?? []).filter((t) => (t.total_hpp ?? 0) > 0);
      setHppRataRata(
        validTemplates.length > 0
          ? validTemplates.reduce((s, t) => s + t.total_hpp, 0) / validTemplates.length
          : 0,
      );
    } catch (err) {
      console.error("[LaporanBep] load error:", err);
      setLoadError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Biaya pasar efektif: pakai nilai tersimpan kalau sudah pernah diatur
  // manual, kalau belum (baris kosong atau masih 0/0) jatuh balik ke nilai
  // acuan DEFAULT_BIAYA_PASAR — supaya BEP tetap akurat dari awal tanpa
  // Denny harus isi modal atau jalankan migration dulu.
  const effectiveBiayaMap = useMemo(() => {
    const out = {};
    for (const loc of MARKET_LOCS) {
      const row = biayaMap[loc];
      const sudahDiatur = row && ((row.transport_per_trip ?? 0) > 0 || (row.sewa_lapak_per_tahun ?? 0) > 0);
      out[loc] = sudahDiatur ? row : DEFAULT_BIAYA_PASAR[loc];
    }
    return out;
  }, [biayaMap]);

  const { marginPerPcs, hargaJualRataRata } = useMemo(() => computeMarginPerPcs(salesRows), [salesRows]);

  const startDate = useMemo(() => findEarliestMarketDate(salesRows), [salesRows]);

  const { ledger, saldoAkhir } = useMemo(() => {
    if (!startDate) return { ledger: [], saldoAkhir: 0 };
    return computeSaldoHarian({ salesRows, biayaMap: effectiveBiayaMap, marginPerPcs, startDate });
  }, [salesRows, effectiveBiayaMap, marginPerPcs, startDate]);

  // Total SEMUA utang bahan belum lunas (bahan_pembelian + bahan_pinjam arah
  // masuk) — dipakai utk kartu "Saldo Bersih" di bawah, menjawab "kalau
  // semua utang ditagih hari ini, uangnya masih cukup atau tidak".
  const totalUtangBahan = useMemo(
    () => utangRows.reduce((s, u) => s + (u.total_harga > 0 ? u.total_harga : 0), 0),
    [utangRows],
  );
  const saldoBersih = saldoAkhir - totalUtangBahan;

  // Estimasi modal bahan utk restock rutin — independen dari status BEP,
  // tetap muncul walau saldo BEP di atas sudah surplus (lihat bepUtils.js).
  // Dipindah ke atas karena pcsPerMinggu-nya jadi input proyeksi utang di
  // bawah (dipakai bareng utk Target Jualan Minggu Ini/Depan).
  const kebutuhanBahan = useMemo(
    () => computeKebutuhanBahanMingguan(salesRows, hppRataRata),
    [salesRows, hppRataRata],
  );

  // Proyeksi saldo BEP ke depan vs jadwal jatuh tempo utang bahan (pakai
  // tren mingguan saat ini) — SATU sumber kebenaran utk pace "kejar utang"
  // yang dipakai baik di kartu Target Jualan Minggu Ini/Depan di bawah,
  // maupun di kartu detail <ProyeksiUtangBahan> — supaya angkanya konsisten
  // & tidak fetch data utang dua kali.
  const proyeksiUtang = useMemo(
    () =>
      computeProyeksiUtangVsSaldo({
        utangRows,
        saldoSaatIni: saldoAkhir,
        marginPerPcs,
        pcsPerMinggu: kebutuhanBahan.pcsPerMinggu,
        biayaMap: effectiveBiayaMap,
      }),
    [utangRows, saldoAkhir, marginPerPcs, kebutuhanBahan.pcsPerMinggu, effectiveBiayaMap],
  );

  // Pace EKSTRA pcs/minggu (di atas tren saat ini) yang perlu dikejar SEKARANG
  // demi utang bahan jatuh tempo TERDEKAT yang proyeksinya belum cukup (0
  // kalau lagi aman) — pengganti cara lama yang nambahin SELURUH total utang
  // bahan ke tiap periode (bikin "minggu ini" & "minggu depan" sama-sama
  // menagih utang yang sama dari nol → dobel kalau dijumlah, lihat diskusi
  // sama Denny soal 4.001 pcs + 4.046,5 pcs yang ternyata gak masuk akal).
  const pcsTambahanPerMinggu = proyeksiUtang.bulanKekurangan
    ? (proyeksiUtang.skedul.find((s) => s.bulan === proyeksiUtang.bulanKekurangan)
        ?.pcsTambahanPerMinggu ?? 0)
    : 0;

  const targetProduksi = useMemo(
    () =>
      computeTargetProduksi({
        saldoBerjalan: saldoAkhir,
        biayaMap: effectiveBiayaMap,
        marginPerPcs,
        biayaPerPcs: hppRataRata,
        pcsTambahanPerMinggu,
      }),
    [saldoAkhir, effectiveBiayaMap, marginPerPcs, hppRataRata, pcsTambahanPerMinggu],
  );

  // "Minggu ini" = sisa hari pasar minggu kalender ini, mulai HARI INI —
  // beda dari targetProduksi di atas ("minggu depan", selalu 7 hari penuh
  // mulai besok). Pace kejar-utang (pcsTambahanPerMinggu) SAMA dengan
  // targetProduksi di atas — pace mingguan yang konsisten, bukan dihitung
  // ulang dari nol — cuma di-skala proporsional ke jumlah hari periode ini
  // (lihat bepUtils.js). Kalau target minggu ini tidak tercapai, saldo &
  // tren yang dipakai minggu depan otomatis lebih rendah (dihitung dari
  // data ASLI, bukan asumsi tercapai) — jadi kekurangannya otomatis numpuk
  // ke perhitungan berikutnya.
  const targetMingguIni = useMemo(
    () =>
      computeTargetProduksi({
        saldoBerjalan: saldoAkhir,
        biayaMap: effectiveBiayaMap,
        marginPerPcs,
        biayaPerPcs: hppRataRata,
        mulaiOffsetHari: 0,
        hariKeDepan: getSisaHariMingguIni(),
        pcsTambahanPerMinggu,
      }),
    [saldoAkhir, effectiveBiayaMap, marginPerPcs, hppRataRata, pcsTambahanPerMinggu],
  );

  const today = localDateStr();
  const todayLoc = getMarketLocation(new Date());
  const isMarketDay = todayLoc !== "gudang";
  const todayLedger = ledger.find((l) => l.tanggal === today && l.lokasi === todayLoc);

  const bepByLokasi = useMemo(() => {
    const out = {};
    for (const loc of MARKET_LOCS)
      out[loc] = computeBepLokasi(effectiveBiayaMap[loc], loc, marginPerPcs, hargaJualRataRata);
    return out;
  }, [effectiveBiayaMap, marginPerPcs, hargaJualRataRata]);

  // Hanya tampil kalau ada lokasi yang BENAR-BENAR tanpa acuan (mis. lokasi
  // pasar baru yang belum ditambahkan ke DEFAULT_BIAYA_PASAR) — bukan lagi
  // karena 0 di tabel, karena itu sudah otomatis pakai nilai acuan di atas.
  const belumAdaConfig = MARKET_LOCS.some(
    (loc) =>
      (effectiveBiayaMap[loc]?.transport_per_trip ?? 0) === 0 &&
      (effectiveBiayaMap[loc]?.sewa_lapak_per_tahun ?? 0) === 0,
  );

  if (loading) {
    return (
      <p className="text-center text-base text-skin-text3 py-16 tracking-[0.1em]">Memuat data BEP...</p>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {loadError && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-editorial">
          ⚠ Gagal memuat data BEP: {loadError}. Pastikan tabel lokasi_pasar_biaya sudah dibuat di
          Supabase (jalankan supabase-migration-bep-lokasi.sql).
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="font-editorial text-xs tracking-[0.15em] uppercase text-skin-text3">
          Break-Even Point Keseluruhan
        </p>
        <button
          onClick={() => setShowBiayaModal(true)}
          className="px-3 py-1.5 font-editorial text-[11px] tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition"
        >
          ⚙ Atur Biaya Pasar
        </button>
      </div>

      {belumAdaConfig && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-editorial">
          Biaya transport &amp; sewa lapak belum diisi — tap &quot;Atur Biaya Pasar&quot; supaya
          hitungan BEP akurat.
        </div>
      )}

      {!startDate ? (
        <p className="text-center text-sm text-skin-text4 py-16">
          Belum ada transaksi pasar (Cideng/Tegalgubug) yang tercatat — BEP akan mulai dihitung
          begitu ada transaksi pertama.
        </p>
      ) : (
        <>
          {/* Saldo gabungan */}
          <div
            className={`bg-skin-card border-2 px-4 py-4 text-center ${
              saldoAkhir < 0 ? "border-red-400" : "border-[#CAB170]"
            }`}
          >
            <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">
              Saldo Untung Pasar (Gabungan)
            </p>
            <p
              className={`font-headline text-2xl leading-none mt-1 ${
                saldoAkhir < 0 ? "text-red-400" : "text-[#CAB170]"
              }`}
            >
              {fmtRp(saldoAkhir)}
            </p>
            <p className="text-[10px] text-skin-text4 mt-2 leading-snug">
              Ini total untung dari semua jualan di pasar (Cideng &amp; Tegalgubug), dikurangi ongkos
              pasar (ongkos transport dan sewa lapak) — dihitung sejak hari pasar pertama tercatat:{" "}
              <span className="font-semibold">{fmtTanggalLong(startDate)}</span>.
            </p>
            <p
              className={`text-[10px] font-semibold mt-2 leading-snug ${
                saldoAkhir < 0 ? "text-red-400" : "text-emerald-500"
              }`}
            >
              {saldoAkhir < 0
                ? `Untung jualan belum cukup menutup ongkos pasar — masih butuh sekitar ${fmtRp(
                    Math.abs(saldoAkhir),
                  )} lagi dari untung jualan ke depan.`
                : "Untung jualan sudah lebih besar dari ongkos pasar — sisa di atas jadi tabungan yang mengurangi jumlah jualan yang perlu dikejar minggu-minggu depan."}
            </p>

            {/* Saldo bersih setelah utang bahan — saldo di atas belum
                memperhitungkan utang ke pemasok bahan yang belum dibayar;
                angka ini menjawab "kalau semua utang bahan ditagih sekarang,
                uangnya masih cukup atau tidak". */}
            <div className="mt-3 pt-3 border-t border-skin-bdr-lt">
              <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">
                Saldo Bersih (Setelah Utang Bahan)
              </p>
              <p
                className={`font-headline text-xl leading-none mt-1 ${
                  saldoBersih < 0 ? "text-red-400" : "text-emerald-500"
                }`}
              >
                {fmtRp(saldoBersih)}
              </p>
              <p className="text-[10px] text-skin-text4 mt-1.5 leading-snug">
                Saldo di atas belum memperhitungkan utang bahan kain yang masih harus dibayar ke
                pemasok/toko bahan, totalnya{" "}
                <span className="font-semibold">{fmtRp(totalUtangBahan)}</span>. Setelah utang itu
                dikurangkan, inilah saldo yang sebenarnya — seandainya semua utang bahan ditagih
                hari ini.
              </p>
              <p
                className={`text-[10px] font-semibold mt-1.5 leading-snug ${
                  saldoBersih < 0 ? "text-red-400" : "text-emerald-500"
                }`}
              >
                {saldoBersih < 0
                  ? "Hasilnya minus — tabungan dari untung jualan pasar belum cukup untuk melunasi semua utang bahan itu."
                  : "Hasilnya masih positif — tabungan dari untung jualan pasar masih cukup, walau semua utang bahan dilunasi sekarang."}
              </p>
            </div>
          </div>

          {/* Trend chart */}
          {ledger.length >= 2 && (
            <div className="bg-skin-card border border-skin-bdr px-3 py-3">
              <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.1em] mb-1">
                Tren BEP ({Math.min(ledger.length, 45)} hari terakhir) — bar = posisi hari itu, garis =
                saldo kumulatif
              </p>
              <SaldoTrendChart ledger={ledger} />
            </div>
          )}

          {/* Status hari ini */}
          {isMarketDay && todayLedger && (
            <div className="bg-skin-gold/30 border-2 border-[#CAB170]/60 px-4 py-3 space-y-2">
              <p className="text-xs font-bold text-[#CAB170] uppercase tracking-[0.1em]">
                Status BEP Hari Ini · {LOC_LABEL[todayLoc]}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Target Pcs" value={fmtPcs(todayLedger.targetPcsHariIni)} />
                <StatCard label="Pcs Laku" value={fmtPcs(todayLedger.pcsLakuAktual)} accent="text-emerald-500" />
              </div>
              {todayLedger.targetPcsHariIni > 0 ? (
                <div className="w-full h-2 bg-skin-bdr rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#CAB170] transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (todayLedger.pcsLakuAktual / todayLedger.targetPcsHariIni) * 100,
                      )}%`,
                    }}
                  />
                </div>
              ) : (
                <p className="text-[11px] text-emerald-600 font-medium">
                  Sudah tertutup tabungan — target hari ini 0 pcs.
                </p>
              )}
            </div>
          )}

          {/* BEP per lokasi */}
          <div className="bg-skin-card border border-skin-bdr">
            <p className="px-4 py-2 text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.1em] border-b border-skin-bdr">
              BEP per Lokasi
            </p>
            {MARKET_LOCS.map((loc) => {
              const b = bepByLokasi[loc];
              return (
                <div key={loc} className="px-4 py-3 border-b border-skin-bdr-lt last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-editorial text-sm font-semibold text-skin-text">{LOC_LABEL[loc]}</p>
                    <p className="text-[10px] text-skin-text4">HPP Pasar/hari {fmtRp(b.hppPasar.perHari)}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    {[
                      ["Hari", b.pcsPerHari],
                      ["Minggu", b.pcsPerMinggu],
                      ["Bulan", b.pcsPerBulan],
                      ["Tahun", b.pcsPerTahun],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-skin-raised py-1.5">
                        <p className="text-[9px] text-skin-text4 uppercase">{label}</p>
                        <p className="text-xs font-semibold text-skin-text">{fmtPcs(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Target jualan minggu ini (sisa hari pasar minggu kalender ini, supaya BEP tetap aman) */}
          <div className="bg-skin-card border border-skin-bdr px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.1em]">
              Target Jualan Minggu Ini
            </p>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Perlu Terjual" value={`${fmtPcs(targetMingguIni.targetProduksiPcs)} pcs`} />
              <StatCard label="Modal Kalau Produksi Baru" value={fmtRp(targetMingguIni.modalBahanDibutuhkan)} />
            </div>
            <p className="text-[10px] text-skin-text4 leading-snug">
              Sisa hari pasar minggu kalender ini (mulai hari ini) diperkirakan ongkos pasarnya{" "}
              {fmtRp(targetMingguIni.hppPasarPeriode)} — setelah dikurangi saldo tabungan saat ini,
              kebutuhan dari ongkos pasar saja ada di {fmtPcs(targetMingguIni.pcsOngkosPasar)} pcs.
              {targetMingguIni.pcsKejarUtang > 0
                ? ` Ditambah ${fmtPcs(targetMingguIni.pcsKejarUtang)} pcs porsi cicilan supaya utang bahan yang jatuh tempo terdekat tetap kekejar (detail bulannya di kartu "Proyeksi Utang Bahan" di bawah).`
                : " Belum perlu tambahan porsi kejar utang bahan — tren jualan saat ini sudah diperkirakan cukup sampai jatuh tempo terdekat."}
            </p>
          </div>

          {/* Target jualan minggu depan (supaya BEP tetap aman) */}
          <div className="bg-skin-card border border-skin-bdr px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.1em]">
              Target Jualan Minggu Depan
            </p>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Perlu Terjual" value={`${fmtPcs(targetProduksi.targetProduksiPcs)} pcs`} />
              <StatCard label="Modal Kalau Produksi Baru" value={fmtRp(targetProduksi.modalBahanDibutuhkan)} />
            </div>
            <p className="text-[10px] text-skin-text4 leading-snug">
              Minggu depan (7 hari penuh) ongkos pasar diperkirakan {fmtRp(targetProduksi.hppPasarPeriode)}{" "}
              — setelah dikurangi saldo tabungan saat ini, kebutuhan dari ongkos pasar saja ada di{" "}
              {fmtPcs(targetProduksi.pcsOngkosPasar)} pcs.
              {targetProduksi.pcsKejarUtang > 0
                ? ` Ditambah ${fmtPcs(targetProduksi.pcsKejarUtang)} pcs porsi cicilan kejar utang bahan — pace mingguan yang sama dengan target minggu ini, supaya utang yang sama tidak ditagih dua kali.`
                : " Belum perlu tambahan porsi kejar utang bahan — tren jualan saat ini sudah diperkirakan cukup sampai jatuh tempo terdekat."}{" "}
              Boleh dari mana saja (tidak harus di pasar). &quot;Modal Kalau Produksi Baru&quot;
              HANYA berlaku kalau pcs sebanyak itu harus dibuat baru (bukan dari stok yang sudah
              ada), dihitung dari rata-rata HPP {hppRataRata > 0 ? fmtRp(hppRataRata) : "—"}/pcs
              (semua Template HPP yang sudah dibuat).
            </p>
          </div>

          {/* Estimasi modal bahan mingguan — beda konsep dari target di atas,
              tetap tampil walau BEP sudah surplus */}
          <div className="bg-skin-card border border-skin-bdr px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.1em]">
              Estimasi Modal Bahan — Restock Rutin
            </p>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Pcs Terjual/Minggu" value={`${fmtPcs(kebutuhanBahan.pcsPerMinggu)} pcs`} sub="rata-rata, semua lokasi" />
              <StatCard
                label="Modal Bahan Dibutuhkan"
                value={fmtRp(kebutuhanBahan.modalBahanMingguan)}
                accent="text-[#CAB170]"
              />
            </div>
            <p className="text-[10px] text-skin-text4 leading-snug">
              Ini BUKAN soal BEP — beda dari kartu di atas. Ini perkiraan modal bahan supaya stok
              yang terjual terus ke-restock, dihitung dari rata-rata {fmtPcs(kebutuhanBahan.pcsPerMinggu)}{" "}
              pcs/minggu (semua lokasi, {Math.round(kebutuhanBahan.effectiveWindowDays)} hari terakhir) ×
              rata-rata HPP {hppRataRata > 0 ? fmtRp(hppRataRata) : "—"}/pcs. Tetap muncul walau saldo
              BEP di atas sudah surplus, karena restock rutin jalan terus terlepas dari status BEP. Ini
              angka MODAL yang idealnya disiapkan (akrual) — untuk cek apakah uang kas-nya sudah
              tersedia, lihat Kas → kategori &quot;Bahan &amp; Produksi&quot; di Keuangan.
            </p>
          </div>

          {/* Proyeksi saldo BEP ke depan vs jadwal jatuh tempo utang bahan —
              beda dari "Saldo Untung Pasar" di atas (akrual, tidak peduli
              bahan sudah dibayar cash atau belum) */}
          <ProyeksiUtangBahan proyeksi={proyeksiUtang} />

          {/* Margin acuan */}
          <p className="text-center text-[10px] text-skin-text4">
            Margin per pcs (60 hari terakhir, dari transaksi asli): {fmtRp(marginPerPcs)} · harga
            jual rata-rata {fmtRp(hargaJualRataRata)}
          </p>
        </>
      )}

      {showBiayaModal && (
        <BiayaPasarModal
          biayaMap={biayaMap}
          onClose={() => setShowBiayaModal(false)}
          onSaved={() => {
            setShowBiayaModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
