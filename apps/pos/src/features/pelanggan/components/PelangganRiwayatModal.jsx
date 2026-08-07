/**
 * PelangganRiwayatModal.jsx — Riwayat pembelian 1 pelanggan (POS). Dibuka
 * dari 2 tempat: PelangganPage (tap kartu pelanggan terdaftar) dan SaleCard
 * di Laporan/Transaksi (tap nama pembeli pada satu transaksi). Tujuan
 * utama: cara cepat menemukan transaksi LAMA (di luar rentang FilterBar
 * Laporan) untuk diajukan Retur, tanpa perlu tahu tanggal pastinya dulu.
 *
 * Prop `pelanggan` punya 2 bentuk:
 *   - Terdaftar   : { id, nama, no_hp } — riwayat dicari by pelanggan_id
 *     (akurat, FK match).
 *   - Belum terdaftar : { nama } (tanpa id) — banyak transaksi dibuat
 *     dengan nama pembeli diketik manual saat checkout TANPA pernah
 *     disimpan sebagai pelanggan (lihat BuyerInput.jsx), jadi tidak ada
 *     pelanggan_id sama sekali. Utk kasus ini riwayat dicari by NAMA
 *     PERSIS (case-insensitive) — keputusan Denny: no HP pembeli sering
 *     kosong utk transaksi lama, nama adalah satu-satunya kunci yang
 *     tersedia. Risiko: dua pembeli beda orang dgn nama sama akan
 *     ke-gabung jadi satu riwayat — badge "Belum terdaftar" di header
 *     mengingatkan hal ini.
 *
 * SENGAJA HANYA "Lihat Struk" + "Retur" — TIDAK ada Edit/Hapus di sini.
 * Alasan: transaksi di modal ini datang dari fetchSalesByPelanggan /
 * fetchSalesByBuyerName (query langsung ke Supabase, lihat api.js),
 * sehingga `sale.id` adalah UUID Supabase, BUKAN primary key lokal Dexie.
 * useUpdateSale/useDeleteSale (features/penjualan/hooks.js) mengasumsikan
 * `sale.id` cocok dengan baris di `db.sales` lokal (dipakai utk re-read
 * stok_adjustments & keputusan online/offline) — dipanggil dengan sale
 * dari sini, keduanya akan silent-no-op (tidak update apa pun, lokal
 * maupun server). useCreateRetur AMAN dipakai karena murni baca field dari
 * originalSale tanpa pernah mem-lookup ke db.sales lokal (lihat catatan di
 * api.js).
 */
import { useState } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { toast } from "@deera/shared/features/toast/hooks";
import { useSalesByPelanggan, useSalesByBuyerName } from "../hooks";
import { fmtDate, groupSaleItems } from "../utils";
import { useCreateRetur } from "../../penjualan";
import { ReturModal } from "../../laporan";
import Struk from "../../../shared/components/Struk";

export default function PelangganRiwayatModal({ pelanggan, onClose }) {
  const isRegistered = !!pelanggan?.id;
  const byId = useSalesByPelanggan(isRegistered ? pelanggan.id : null);
  const byName = useSalesByBuyerName(!isRegistered ? pelanggan?.nama : null);
  const { sales, loading, error, reload } = isRegistered ? byId : byName;
  const createRetur = useCreateRetur();

  const [strukSale, setStrukSale] = useState(null);
  const [returSale, setReturSale] = useState(null);
  const [returSaving, setReturSaving] = useState(false);

  const totalTransaksi = sales.length;
  const totalOmzet = sales.reduce(
    (sum, s) => sum + (s.type === "retur" ? -1 : 1) * (Number(s.total) || 0),
    0,
  );
  const defaultOpen = totalTransaksi <= 3;

  async function handleReturConfirm(items, total) {
    setReturSaving(true);
    try {
      await createRetur({ originalSale: returSale, items, total });
      setReturSale(null);
      toast.success("Retur berhasil — stok dikembalikan.");
      reload();
    } catch (err) {
      toast.error("Gagal retur: " + err.message);
    }
    setReturSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-4 py-4 border-b-2 border-skin-bdr flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl text-skin-text truncate">{pelanggan?.nama}</h2>
            {pelanggan?.no_hp && (
              <a
                href={`tel:${pelanggan.no_hp}`}
                className="text-sm text-[#CAB170] hover:underline mt-0.5 block"
              >
                {pelanggan.no_hp}
              </a>
            )}
            {!isRegistered && (
              <p className="text-[11px] text-amber-500 mt-1">
                Belum terdaftar sebagai pelanggan — riwayat dicocokkan dari nama pembeli saja.
              </p>
            )}
            {!loading && !error && (
              <p className="text-xs text-skin-text3 mt-1">
                {totalTransaksi} transaksi &middot; Rp {formatHarga(totalOmzet)} bersih
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-skin-text3 hover:text-skin-text text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <p className="text-center text-sm text-skin-text3 py-10">Memuat riwayat...</p>
          )}
          {error && (
            <p className="text-center text-sm text-red-500 py-10">
              Gagal memuat riwayat. Pastikan koneksi internet aktif, lalu coba lagi.
            </p>
          )}
          {!loading && !error && sales.length === 0 && (
            <p className="text-center text-sm text-skin-text4 py-10">
              Belum ada riwayat pembelian tercatat untuk pelanggan ini.
            </p>
          )}

          {!loading &&
            !error &&
            sales.map((s) => {
              const rows = groupSaleItems(s.items);
              const isRetur = s.type === "retur";
              return (
                <details
                  key={s.id}
                  open={defaultOpen}
                  className={`group border-2 ${isRetur ? "border-orange-300" : "border-skin-bdr"}`}
                >
                  <summary className="cursor-pointer select-none list-none px-3 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="inline-block flex-shrink-0 text-skin-text4 transition-transform group-open:rotate-90">
                        ›
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-skin-text">{fmtDate(s.date)}</p>
                        <p className="text-xs text-skin-text4">
                          {LOCATION_LABELS[s.location] ?? s.location}
                          {s.created_by_name ? ` · ${s.created_by_name}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {isRetur && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-orange-600 border border-orange-300">
                          Retur
                        </span>
                      )}
                      <span className="text-sm font-semibold text-skin-text">
                        Rp {formatHarga(s.total)}
                      </span>
                    </div>
                  </summary>

                  <div className="px-3 pb-3 space-y-2 border-t border-skin-bdr-lt pt-2">
                    {rows.map((r, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-skin-text font-mono truncate">
                              {r.kode}
                              {r.size ? ` · ${r.size}` : ""}
                            </p>
                            <p className="text-xs text-skin-text4">
                              {r.qty} pcs &times; Rp {formatHarga(r.harga)}
                              {r.warnaBreakdown.length > 0 &&
                                ` (${r.warnaBreakdown.map((w) => `${w.warna} ${w.qty}`).join(", ")})`}
                            </p>
                          </div>
                          <p className="flex-shrink-0 text-skin-text2 font-medium">
                            Rp {formatHarga(r.subtotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {s.discount > 0 && (
                      <p className="text-xs text-skin-text4 text-right">
                        Diskon Rp {formatHarga(s.discount)}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => setStrukSale(s)}
                        className="text-xs text-skin-text3 hover:text-[#CAB170] transition font-medium tracking-wide uppercase"
                      >
                        Lihat Struk
                      </button>
                      {!isRetur && (
                        <>
                          <span className="text-skin-bdr">|</span>
                          <button
                            onClick={() => setReturSale(s)}
                            className="text-xs text-skin-text3 hover:text-orange-500 transition font-medium tracking-wide uppercase"
                          >
                            Retur
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
        </div>
      </div>

      {strukSale && <Struk sale={strukSale} onClose={() => setStrukSale(null)} />}
      {returSale && (
        <ReturModal
          sale={returSale}
          onClose={() => setReturSale(null)}
          onConfirm={handleReturConfirm}
          saving={returSaving}
        />
      )}
    </div>
  );
}
