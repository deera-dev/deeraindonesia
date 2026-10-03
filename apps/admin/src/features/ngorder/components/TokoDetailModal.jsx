/**
 * TokoDetailModal.jsx — Detail riwayat sampel SATU toko: ringkasan
 * Dikirim/Dipilih/Tidak Dipilih/Menunggu (gaya laporan manual yang sudah
 * ada sebelumnya, lihat screenshot "PESANAN ORDER UD PUTRA TOSERBA" —
 * permintaan Denny 2026-10: jangan sampai cuma UD Putra Toserba yang
 * tercatat lengkap), tabel kode per status (klik item "Menunggu" utk
 * langsung tandai Dipilih/Tidak Dipilih begitu tim sales dapat kabar dari
 * toko), + daftar "Belum Dikirim" (produk yang belum pernah dibawakan ke
 * toko ini sama sekali, dihitung dari selisih dgn katalog) supaya tim
 * sales tahu apa yang perlu dibawa kunjungan berikutnya.
 */
import { useState } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import { useTokoItemsQuery, useUpdateItemStatusMutation, summarizeTokoItems } from "../hooks";
import KirimSampelModal from "./KirimSampelModal";

const SECTION_STYLE = {
  dipilih: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
  tidak_dipilih: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
  pending: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
};

function ItemRow({ item, onMarkDipilih, onMarkTidakDipilih, onUndo, busy }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${SECTION_STYLE[item.status] ?? ""}`}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold truncate">{item.kode}</span>
        {item.nama && <span className="block text-xs opacity-70 truncate">{item.nama}</span>}
      </span>
      {item.status === "pending" ? (
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkTidakDipilih(item)}
            className="px-2.5 py-1.5 text-xs font-editorial tracking-[0.05em] uppercase border border-current rounded disabled:opacity-40"
          >
            Tidak Diambil
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkDipilih(item)}
            className="px-2.5 py-1.5 text-xs font-editorial tracking-[0.05em] uppercase bg-current rounded disabled:opacity-40"
          >
            <span className="text-white">Diambil</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUndo(item)}
          className="flex-shrink-0 text-xs underline opacity-70 hover:opacity-100 disabled:opacity-30"
        >
          Batal
        </button>
      )}
    </div>
  );
}

export default function TokoDetailModal({ toko, onClose }) {
  const { products = [] } = useProducts();
  const { data: items = [], isLoading } = useTokoItemsQuery(toko.id);
  const updateMutation = useUpdateItemStatusMutation(toko.id);
  const [showKirim, setShowKirim] = useState(false);
  const [tab, setTab] = useState("riwayat"); // "riwayat" | "belum-dikirim"

  const summary = summarizeTokoItems(items, products);

  function setStatus(item, status) {
    updateMutation.mutate({ itemId: item.id, status });
  }

  const ordered = [...summary.pending, ...summary.dipilih, ...summary.tidakDipilih].sort(
    (a, b) => a.kode.localeCompare(b.kode),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-headline text-lg text-skin-text truncate">{toko.nama}</h2>
            <p className="text-xs text-skin-text3 mt-0.5">
              Dikirim: {summary.counts.dikirim} · Dipilih: {summary.counts.dipilih} · Tidak Dipilih:{" "}
              {summary.counts.tidakDipilih}
              {summary.counts.pending > 0 ? ` · Menunggu: ${summary.counts.pending}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="px-4 pt-3 flex-shrink-0 flex gap-2 border-b border-skin-bdr-lt">
          {[
            { key: "riwayat", label: `Riwayat (${summary.counts.dikirim})` },
            { key: "belum-dikirim", label: `Belum Dikirim (${summary.counts.belumDikirim})` },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs font-editorial tracking-[0.08em] uppercase border-b-2 transition ${
                tab === t.key
                  ? "border-[#CAB170] text-[#CAB170]"
                  : "border-transparent text-skin-text3 hover:text-skin-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <p className="text-sm text-skin-text4 py-8 text-center">Memuat...</p>}

          {!isLoading && tab === "riwayat" && (
            <div className="divide-y divide-skin-bdr-lt">
              {ordered.length === 0 && (
                <p className="text-sm text-skin-text4 py-8 text-center px-4">
                  Belum pernah kirim sampel ke toko ini. Mulai lewat "+ Kirim Sampel".
                </p>
              )}
              {ordered.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  busy={updateMutation.isPending}
                  onMarkDipilih={(it) => setStatus(it, "dipilih")}
                  onMarkTidakDipilih={(it) => setStatus(it, "tidak_dipilih")}
                  onUndo={(it) => setStatus(it, "pending")}
                />
              ))}
            </div>
          )}

          {!isLoading && tab === "belum-dikirim" && (
            <div className="divide-y divide-skin-bdr-lt">
              {summary.belumDikirim.length === 0 && (
                <p className="text-sm text-skin-text4 py-8 text-center px-4">
                  Semua produk katalog sudah pernah dikirim ke toko ini.
                </p>
              )}
              {summary.belumDikirim.map((p) => (
                <div key={p.kode} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-skin-text truncate">{p.kode}</span>
                    <span className="block text-xs text-skin-text3 truncate">{p.nama}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4">
          <button
            type="button"
            onClick={() => setShowKirim(true)}
            className="w-full py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
          >
            + Kirim Sampel
          </button>
        </div>
      </div>

      {showKirim && (
        <KirimSampelModal
          toko={toko}
          statusByKode={summary.latestByKode}
          onClose={() => setShowKirim(false)}
          onCreated={() => {
            setShowKirim(false);
            setTab("riwayat");
          }}
        />
      )}
    </div>
  );
}
