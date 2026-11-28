import BackToTop from "@deera/shared/components/BackToTop";
import { toast } from "@deera/shared/features/toast/hooks";
import { useState } from "react";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import { useCreateTransfer, usePasarRestock, useTargetSeriQty } from "../hooks";
import type { RestockCard as RestockCardData, RestockDetail } from "../schema";
import {
  getDefaultTargetMarket,
  MARKETS,
  marketLabel,
  restockItemKey,
  restockTransferQty,
  TIDAK_BERGERAK_DAYS,
} from "../utils";

function MarketPicker({
  market,
  onChange,
}: {
  market: string;
  onChange: (market: string) => void;
}) {
  return (
    <div className="flex gap-2 mb-4">
      {MARKETS.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`flex-1 py-2.5 text-xs font-editorial tracking-[0.15em] uppercase border-2 transition ${
            market === m
              ? "border-skin-accent text-skin-accent-text bg-skin-gold"
              : "border-skin-bdr text-skin-text3 hover:text-skin-text"
          }`}
        >
          {marketLabel(m)}
        </button>
      ))}
    </div>
  );
}

function detailLabel(d: RestockDetail): string {
  return d.warna ? `${d.size} · ${d.warna}` : d.size;
}

interface SelectedItem {
  kode: string;
  size: string;
  warna: string;
  qty: number;
}

function RestockCard({
  card,
  market,
  selected,
  onToggle,
}: {
  card: RestockCardData;
  market: string;
  selected: Map<string, SelectedItem>;
  onToggle: (key: string, item: SelectedItem) => void;
}) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3 space-y-2 h-full">
      <p className="font-semibold text-sm text-skin-text">{card.kode}</p>
      <div className="divide-y divide-skin-bdr-lt">
        {card.details.map((d) => {
          const key = restockItemKey(card.kode, d.size, d.warna);
          const transferQty = restockTransferQty(d);
          const checkable = transferQty > 0;
          const partial = checkable && transferQty < d.butuh;
          return (
            <div key={detailLabel(d)} className="py-1.5 first:pt-0 last:pb-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs text-skin-text2 min-w-0">
                  {checkable && (
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-skin-accent flex-shrink-0"
                      checked={selected.has(key)}
                      onChange={() =>
                        onToggle(key, {
                          kode: card.kode,
                          size: d.size,
                          warna: d.warna,
                          qty: transferQty,
                        })
                      }
                      aria-label={`Tambahkan ${card.kode} ${detailLabel(d)} ke transfer`}
                    />
                  )}
                  <span className="truncate">{detailLabel(d)}</span>
                </span>
                <span
                  className={`shrink-0 text-[9px] font-editorial tracking-[0.08em] uppercase px-1.5 py-0.5 border ${
                    !d.menipis
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : d.hampirHabis
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  }`}
                >
                  {!d.menipis
                    ? "Cukup"
                    : d.hampirHabis
                      ? `Hampir Habis · bawa ${d.butuh}`
                      : `Menipis · butuh ${d.butuh}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-skin-text3">
                <span>
                  <span className="font-bold text-skin-text">{marketLabel(market)}</span>:{" "}
                  <span className="font-bold text-skin-text">{d.marketQty}</span>
                </span>
                <span>
                  Gudang: <span className="font-bold text-skin-text">{d.gudangQty}</span>
                </span>
                {d.otherMarket && (
                  <span>
                    {marketLabel(d.otherMarket)}:{" "}
                    <span className="font-bold text-skin-text">{d.otherQty}</span>
                  </span>
                )}
              </div>
              {d.hampirHabis && (
                <p className="text-[10px] text-rose-600/80">
                  Stok sistem tinggal {d.total} pcs — kalau besok pindah pasar, bawa balik ke gudang
                  dulu.
                </p>
              )}
              {/* Transfer selalu dari Gudang — kalau Gudang-nya tidak cukup
                  (atau 0), jangan sampai qty transfer melebihi yang benar2
                  ada (lihat restockTransferQty). */}
              {!checkable && d.menipis && (
                <p className="text-[10px] text-skin-text4">
                  Gudang kosong — tidak bisa direstock dari sini.
                </p>
              )}
              {partial && (
                <p className="text-[10px] text-amber-600/80">
                  Gudang cuma ada {d.gudangQty} — bisa kirim {transferQty} dari butuh {d.butuh}.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TidakBergerakCard({ card }: { card: RestockCardData }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3 space-y-2 h-full">
      <p className="font-semibold text-sm text-skin-text">{card.kode}</p>
      <div className="flex flex-wrap gap-1.5">
        {card.details.map((d) => (
          <span
            key={detailLabel(d)}
            className="text-[10px] font-editorial px-2 py-0.5 bg-skin-raised text-skin-text2 border border-skin-bdr"
          >
            {detailLabel(d)} · {d.marketQty}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-skin-text3">
        Tidak ada penjualan {TIDAK_BERGERAK_DAYS} hari terakhir — pertimbangkan dibawa pulang.
      </p>
    </div>
  );
}

export default function PasarRestockPage() {
  const [market, setMarket] = useState(() => getDefaultTargetMarket() ?? "cideng");
  const { target, setTarget } = useTargetSeriQty(market);
  const { restockList, tidakBergerakList, loading } = usePasarRestock(market, target);
  const createTransfer = useCreateTransfer();
  const [selected, setSelected] = useState<Map<string, SelectedItem>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  // Ganti pasar -> selection item lama (pasar sebelumnya) tidak relevan lagi.
  function handleMarketChange(m: string) {
    setMarket(m);
    setSelected(new Map());
  }

  function toggleItem(key: string, item: SelectedItem) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, item);
      return next;
    });
  }

  function selectAll() {
    const next = new Map<string, SelectedItem>();
    for (const card of restockList) {
      for (const d of card.details) {
        const qty = restockTransferQty(d);
        if (qty > 0) {
          next.set(restockItemKey(card.kode, d.size, d.warna), {
            kode: card.kode,
            size: d.size,
            warna: d.warna,
            qty,
          });
        }
      }
    }
    setSelected(next);
  }

  // Checklist "oke" -> langsung jadi transfer gudang -> pasar tujuan,
  // berstatus pending seperti transfer manual biasa (tinggal di-approve/
  // decline di halaman Transfer, TIDAK langsung memindahkan stok di sini).
  async function handleBuatTransfer() {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await createTransfer({
        fromLocation: "gudang",
        toLocation: market,
        items: [...selected.values()],
        notes: `Restock pasar ${marketLabel(market)} (Persiapan Pasar)`,
      });
      toast.success(
        `Transfer dibuat — ${selected.size} item ke ${marketLabel(market)}, tinggal di-approve di halaman Transfer.`,
      );
      setSelected(new Map());
    } catch (err: unknown) {
      toast.error(`Gagal membuat transfer: ${(err as Error)?.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="px-4 py-4 md:px-8">
          <h1 className="font-headline text-skin-accent-text text-xl leading-none">
            Persiapan Pasar
          </h1>
          <p className="text-xs text-skin-text4 mt-1">
            Cek H-1 sebelum berangkat — stok menipis & produk tidak bergerak
          </p>
        </div>
      </header>

      <div className="px-4 py-4 md:px-8 xl:px-10 2xl:px-12">
        <MarketPicker market={market} onChange={handleMarketChange} />

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <label htmlFor="target-seri" className="text-xs text-skin-text3">
            Target minimal per warna di {marketLabel(market)}:
          </label>
          <input
            id="target-seri"
            type="number"
            min="1"
            value={target}
            onChange={(e) => setTarget(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
            className="w-16 text-center py-1 px-1 text-sm border border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-skin-accent"
            aria-label={`Target minimal seri ${marketLabel(market)}`}
          />
          <span className="text-xs text-skin-text3">pcs</span>
        </div>

        <p className="text-xs text-skin-text3 mb-4">
          Cek sebelum berangkat ke{" "}
          <span className="text-skin-text2 font-semibold">{marketLabel(market)}</span> — target{" "}
          {target} pcs per warna di pasar tujuan. Centang produk yang mau dibawa, lalu buat transfer
          langsung dari sini — tinggal di-approve/decline nanti di halaman Transfer.
        </p>

        <section className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <h2 className="font-editorial text-xs tracking-[0.18em] uppercase text-skin-text2">
              Perlu Direstock
              {restockList.length > 0 && (
                <span className="ml-1 text-skin-text3">({restockList.length})</span>
              )}
            </h2>
            {restockList.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs font-semibold text-skin-text3 hover:text-skin-text underline underline-offset-2"
                >
                  Pilih Semua
                </button>
                {selected.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBuatTransfer}
                    disabled={submitting}
                    className="px-3 py-1.5 text-xs font-editorial tracking-[0.1em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-50"
                  >
                    {submitting ? "Membuat..." : `Buat Transfer (${selected.size})`}
                  </button>
                )}
              </div>
            )}
          </div>
          {loading ? (
            <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
          ) : restockList.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">
              Semua stok di {marketLabel(market)} masih aman.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 items-stretch">
              {restockList.map((card) => (
                <RestockCard
                  key={card.kode}
                  card={card}
                  market={market}
                  selected={selected}
                  onToggle={toggleItem}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-editorial text-xs tracking-[0.18em] uppercase text-skin-text2 mb-2">
            Tidak Bergerak
            {tidakBergerakList.length > 0 && (
              <span className="ml-1 text-skin-text3">({tidakBergerakList.length})</span>
            )}
          </h2>
          {loading ? (
            <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
          ) : tidakBergerakList.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">
              Semua produk di {marketLabel(market)} masih bergerak.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 items-stretch">
              {tidakBergerakList.map((card) => (
                <TidakBergerakCard key={card.kode} card={card} />
              ))}
            </div>
          )}
        </section>
      </div>

      <BackToTop />
      <AdminSidebar />
      <AdminBottomNav />
    </main>
  );
}
