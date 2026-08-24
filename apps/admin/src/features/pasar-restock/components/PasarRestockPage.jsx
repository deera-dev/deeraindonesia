/**
 * PasarRestockPage.jsx — /pasar-restock
 * Persiapan H-1 sebelum ke pasar Cideng/Tegalgubug: produk apa yang perlu
 * direstock (stok di pasar tujuan menipis dibanding total semua lokasi) dan
 * produk apa yang tidak bergerak (tidak ada penjualan belakangan) — supaya
 * admin bisa putuskan apa yang perlu dibawa/dibawa-pulang sebelum berangkat.
 */
import { useMemo, useState } from "react";
import { localDateStr } from "@deera/shared/lib/bepUtils";
import BackToTop from "@deera/shared/components/BackToTop";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import { useStokAll, useSoldKodes } from "../hooks";
import {
  buildRestockList,
  buildTidakBergerakList,
  getDefaultTargetMarket,
  marketLabel,
  MARKETS,
  TIDAK_BERGERAK_DAYS,
  TARGET_SERI_QTY,
} from "../utils";

function MarketPicker({ market, onChange }) {
  return (
    <div className="flex gap-2 mb-4">
      {MARKETS.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`flex-1 py-2.5 text-xs font-editorial tracking-[0.15em] uppercase border-2 transition ${
            market === m
              ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
              : "border-skin-bdr text-skin-text3 hover:text-skin-text"
          }`}
        >
          {marketLabel(m)}
        </button>
      ))}
    </div>
  );
}

// Label "Midi · HITAM" / "Midi" (produk tanpa warna) untuk satu baris rincian.
function detailLabel(d) {
  return d.warna ? `${d.size} · ${d.warna}` : d.size;
}

// Satu kartu = satu kode. Rincian per size/warna ditampilkan di dalam kartu —
// supaya kelihatan warna mana yang perlu dibawa (Menipis) dan warna mana yang
// stoknya di pasar ini sudah cukup (permintaan Denny 2026-08).
//
// Aturan target 2026-08: normalnya bawa 3 pcs/warna ke pasar (TARGET_SERI_QTY).
// Kalau total stok sistem utk warna itu sendiri < 3, target turun jadi "bawa
// semua yang ada" — ditandai "Hampir Habis" (bukan cuma "Menipis") karena
// barangnya memang mau habis, bukan sekadar kurang restock dari gudang.
function RestockCard({ card }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3 space-y-2">
      <p className="font-semibold text-sm text-skin-text">{card.kode}</p>
      <div className="divide-y divide-skin-bdr-lt">
        {card.details.map((d) => (
          <div key={detailLabel(d)} className="py-1.5 first:pt-0 last:pb-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-skin-text2">{detailLabel(d)}</span>
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
                Di sini: <span className="font-semibold text-skin-text2">{d.marketQty}</span>
              </span>
              <span>
                Gudang: <span className="font-semibold text-skin-text2">{d.gudangQty}</span>
              </span>
              {d.otherMarket && (
                <span>
                  {marketLabel(d.otherMarket)}: <span className="font-semibold text-skin-text2">{d.otherQty}</span>
                </span>
              )}
            </div>
            {d.hampirHabis && (
              <p className="text-[10px] text-rose-600/80">
                Stok sistem tinggal {d.total} pcs — kalau besok pindah pasar, bawa balik ke gudang dulu.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TidakBergerakCard({ card }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3 space-y-2">
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

  const { stok, loading } = useStokAll();

  const sinceDateStr = useMemo(
    () => localDateStr(new Date(Date.now() - TIDAK_BERGERAK_DAYS * 86400000)),
    [],
  );
  const { soldKodes, loading: loadingSold } = useSoldKodes(market, sinceDateStr);

  const restockList = useMemo(
    () => buildRestockList(stok, market),
    [stok, market],
  );
  const tidakBergerakList = useMemo(
    () => buildTidakBergerakList(stok, market, soldKodes),
    [stok, market, soldKodes],
  );

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="px-4 py-4 md:px-8">
          <h1 className="font-headline text-[#CAB170] text-xl leading-none">Persiapan Pasar</h1>
          <p className="text-xs text-skin-text4 mt-1">
            Cek H-1 sebelum berangkat — stok menipis & produk tidak bergerak
          </p>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="px-4 py-4 md:px-8 md:max-w-3xl md:mx-auto">
        <MarketPicker market={market} onChange={setMarket} />

        <p className="text-xs text-skin-text3 mb-4">
          Cek sebelum berangkat ke <span className="text-skin-text2 font-semibold">{marketLabel(market)}</span> —
          target {TARGET_SERI_QTY} pcs per warna di pasar tujuan. Produk apa yang stoknya di sana belum
          sampai target dan perlu dibawa, dan produk apa yang tidak laku supaya bisa dibawa pulang.
        </p>

        <section className="mb-6">
          <h2 className="font-editorial text-xs tracking-[0.18em] uppercase text-skin-text2 mb-2">
            Perlu Direstock
            {restockList.length > 0 && <span className="ml-1 text-skin-text3">({restockList.length})</span>}
          </h2>
          {loading ? (
            <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
          ) : restockList.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">
              Semua stok di {marketLabel(market)} masih aman.
            </p>
          ) : (
            <div className="space-y-2">
              {restockList.map((card) => (
                <RestockCard key={card.kode} card={card} />
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
          {loading || loadingSold ? (
            <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
          ) : tidakBergerakList.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">
              Semua produk di {marketLabel(market)} masih bergerak.
            </p>
          ) : (
            <div className="space-y-2">
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
