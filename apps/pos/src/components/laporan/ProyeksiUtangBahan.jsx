/**
 * ProyeksiUtangBahan.jsx
 *
 * Sub-kartu di tab BEP Pasar — menjawab pertanyaan Denny: "supaya pas jatuh
 * tempo uangnya ada, BEP-nya harus berapa?"
 *
 * Beda dari kartu "Saldo Untung Pasar" di atasnya (yang akrual, tidak peduli
 * bahan sudah dibayar cash atau belum): kartu ini membandingkan PROYEKSI
 * saldo itu ke depan (pakai tren mingguan saat ini) dengan jadwal jatuh
 * tempo utang bahan (bahan_pembelian + bahan_pinjam yang arah_pinjam =
 * "masuk", keduanya status_bayar = "belum") — supaya kelihatan dari
 * SEKARANG, bulan mana yang proyeksinya kurang, dan berapa pcs/minggu
 * tambahan yang perlu dikejar mulai sekarang.
 *
 * Komponen ini presentational saja (tidak fetch data sendiri) — `proyeksi`
 * (hasil computeProyeksiUtangVsSaldo) sudah dihitung sekali di
 * LaporanBep.jsx, supaya: (1) tidak fetch bahan_pembelian/bahan_pinjam dua
 * kali, dan (2) pace "kejar utang" (pcsTambahanPerMinggu) bisa dipakai
 * bareng utk kartu Target Jualan Minggu Ini/Depan di atasnya — satu sumber
 * kebenaran.
 */
function fmtRp(n) {
  const v = Math.round(n ?? 0);
  return (v < 0 ? "-Rp " : "Rp ") + Math.abs(v).toLocaleString("id-ID");
}

function fmtPcs(n) {
  return (Math.round((n ?? 0) * 10) / 10).toLocaleString("id-ID");
}

function fmtBulanTahun(bulanStr) {
  const d = new Date(bulanStr + "-01T00:00:00");
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export default function ProyeksiUtangBahan({ proyeksi }) {
  return (
    <div className="bg-skin-card border border-skin-bdr px-4 py-3 space-y-2">
      <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.1em]">
        Proyeksi Utang Bahan vs Saldo BEP
      </p>

      {proyeksi.skedul.length === 0 ? (
        <p className="text-[11px] text-emerald-600 font-medium leading-snug">
          Tidak ada utang bahan belum lunas yang tercatat — tidak ada jatuh tempo yang perlu
          dikejar saat ini.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-skin-raised border border-skin-bdr px-3 py-2.5 space-y-0.5">
              <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.1em]">
                Total Utang Belum Lunas
              </p>
              <p className="font-headline text-base leading-tight text-red-400">
                {fmtRp(proyeksi.totalUtang)}
              </p>
            </div>
            <div className="bg-skin-raised border border-skin-bdr px-3 py-2.5 space-y-0.5">
              <p className="text-[10px] font-semibold text-skin-text3 uppercase tracking-[0.1em]">
                Tren Saldo Bersih/Minggu
              </p>
              <p
                className={`font-headline text-base leading-tight ${
                  proyeksi.netPerMinggu < 0 ? "text-red-400" : "text-emerald-500"
                }`}
              >
                {fmtRp(proyeksi.netPerMinggu)}
              </p>
            </div>
          </div>

          {proyeksi.bulanKekurangan ? (
            <div className="px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-[11px] leading-snug">
              Mulai <span className="font-bold">{fmtBulanTahun(proyeksi.bulanKekurangan)}</span>,
              proyeksi saldo BELUM CUKUP untuk bayar utang yang jatuh tempo bulan itu. Perlu jual
              tambahan ±
              <span className="font-bold">
                {" "}
                {fmtPcs(
                  proyeksi.skedul.find((s) => s.bulan === proyeksi.bulanKekurangan)?.pcsTambahanPerMinggu,
                )}{" "}
                pcs/minggu
              </span>{" "}
              di atas tren sekarang, mulai dari sekarang sampai bulan itu.
            </div>
          ) : (
            <div className="px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[11px] leading-snug">
              Aman — berdasarkan tren penjualan saat ini, proyeksi saldo diperkirakan cukup untuk
              semua utang bahan sampai jatuh tempo masing-masing.
            </div>
          )}

          <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
            {proyeksi.skedul.map((s) => (
              <div key={s.bulan} className="px-3 py-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-skin-text">{fmtBulanTahun(s.bulan)}</p>
                  <p className="text-[10px] text-skin-text4">
                    Utang bulan ini {fmtRp(s.utangBulanIni)} · kumulatif {fmtRp(s.cumulativeUtang)}
                  </p>
                  <p className="text-[10px] text-skin-text4">Proyeksi saldo {fmtRp(s.saldoProyeksi)}</p>
                </div>
                <span
                  className={`shrink-0 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${
                    s.aman
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  }`}
                >
                  {s.aman ? "Aman" : `Kurang ${fmtRp(Math.abs(s.gap))}`}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-skin-text4 leading-snug">
            Proyeksi pakai tren mingguan saat ini (untung per pcs × pcs laku/minggu, dikurangi
            ongkos pasar) — ESTIMASI, bukan jaminan. Berubah otomatis kalau pola jualan berubah.
            Utang yang dihitung: semua pembelian bahan dan pinjaman bahan yang statusnya masih
            &quot;belum lunas&quot;.
          </p>
        </>
      )}
    </div>
  );
}
