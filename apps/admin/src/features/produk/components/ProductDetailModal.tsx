import type { Product } from "@deera/shared/features/products/schema";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { formatHarga } from "@deera/shared/lib/constants";
import { useState } from "react";
import { CetakLabelModal } from "../../cetak-label";
import {
  useDikirimByKode,
  useProducedByKode,
  useProductAchievements,
  useProductBadgeHistory,
  useProductBadgeReason,
  useSalesByKode,
  useSalesDetailByKode,
  useStokWarnaByKode,
} from "../hooks";
import type {
  ProducedByKodeMap,
  SalesByKodeMap,
  StokByLocation,
  StokWarnaByKodeMap,
} from "../schema";
import { BADGE_META, describeBadgeHistory, fmtTanggal } from "../utils";
import ProductChangeHistory from "./ProductChangeHistory";
import ProductCodeImageModal from "./ProductCodeImageModal";

const LOCS = [
  { key: "gudang", label: "Gudang" },
  { key: "cideng", label: "Cideng" },
  { key: "tegalgubug", label: "Tegalgubug" },
  { key: "ngorder", label: "Ngorder" },
];
const LOC_LABEL: Record<string, string> = Object.fromEntries(LOCS.map((l) => [l.key, l.label]));

function AccordionSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-skin-bdr-lt pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-3"
      >
        <span className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold">
          {title}
        </span>
        <span
          aria-hidden="true"
          className={`text-skin-text3 text-[10px] transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && children}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
  title,
  sub,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  title?: string;
  sub?: string;
}) {
  return (
    <div className="bg-skin-raised p-2.5 text-center">
      <p className="text-[10px] text-skin-text3 uppercase tracking-[0.1em] font-semibold">
        {label}
      </p>
      <p
        title={title}
        className={`text-lg font-bold mt-0.5 ${accent ? "text-skin-accent-text" : "text-skin-text"}`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-sky-600 font-semibold mt-0.5">{sub}</p>}
    </div>
  );
}

function SalesDetailList({ kode, location }: { kode: string; location: string | null }) {
  const { data, isLoading } = useSalesDetailByKode(kode);
  const detail = location ? data.filter((t) => t.location === location) : data;

  if (isLoading) {
    return <p className="text-sm text-skin-text4 py-2">Memuat transaksi...</p>;
  }
  if (detail.length === 0) {
    return <p className="text-sm text-skin-text4 py-2">Belum ada transaksi.</p>;
  }
  return (
    <div className="space-y-2 py-2">
      {detail.map((t) => (
        <div key={t.id} className="flex justify-between items-baseline gap-2">
          <div className="min-w-0">
            <p className="text-sm text-skin-text2 truncate">{t.buyer_name || "Tanpa nama"}</p>
            <p className="text-[11px] text-skin-text4">
              {fmtTanggal(t.created_at)}
              {!location && ` · ${LOC_LABEL[t.location] ?? t.location}`}
            </p>
          </div>
          <span className="text-sm font-semibold text-skin-text flex-shrink-0">{t.qty}</span>
        </div>
      ))}
    </div>
  );
}

function StokPenjualanRow({
  label,
  stokVal,
  terjualVal,
  stokTitle,
  kode,
  location,
  isOpen,
  onToggle,
  emphasis = false,
  testId,
}: {
  label: string;
  stokVal: string | number;
  terjualVal: string | number;
  stokTitle?: string;
  kode: string;
  location: string | null;
  isOpen: boolean;
  onToggle: () => void;
  emphasis?: boolean;
  testId?: string;
}) {
  return (
    <div>
      <button
        type="button"
        data-testid={testId}
        onClick={onToggle}
        className={`w-full grid grid-cols-[1fr_52px_52px_14px] gap-1.5 items-center py-2 text-left transition hover:text-skin-text ${
          emphasis ? "border-t border-skin-bdr-lt mt-1 pt-3" : ""
        }`}
      >
        <span
          className={
            emphasis
              ? "text-sm font-bold text-skin-text uppercase tracking-wide truncate"
              : "text-sm text-skin-text2 truncate"
          }
        >
          {label}
        </span>
        <span
          title={stokTitle}
          className={`text-right ${emphasis ? "text-sm font-bold text-skin-text" : "text-sm text-skin-text2"}`}
        >
          {stokVal}
        </span>
        <span
          className={`text-right ${emphasis ? "text-sm font-bold text-skin-accent-text" : "text-sm font-semibold text-skin-text"}`}
        >
          {terjualVal}
        </span>
        <span
          aria-hidden="true"
          className={`text-[9px] text-skin-text3 text-right transition-transform ${isOpen ? "rotate-90" : ""}`}
        >
          ▸
        </span>
      </button>
      {isOpen && (
        <div className="pl-4 ml-1 border-l-2 border-skin-bdr-lt">
          <SalesDetailList kode={kode} location={location} />
        </div>
      )}
    </div>
  );
}

interface DetailStok extends StokByLocation {
  sizes?: Record<string, Partial<StokByLocation>>;
}

interface LocationSalesSummary {
  gudang: number;
  cideng: number;
  tegalgubug: number;
  total: number;
}

function StokPenjualanSection({
  stok,
  sales,
  salesLoading,
  kode,
  isHabis,
  isBelumDiisi,
  total,
}: {
  stok: DetailStok;
  sales: LocationSalesSummary;
  salesLoading: boolean;
  kode: string;
  isHabis: boolean;
  isBelumDiisi: boolean;
  total: number;
}) {
  const [openLoc, setOpenLoc] = useState<string | null>(null);
  function toggleLoc(key: string) {
    setOpenLoc((prev) => (prev === key ? null : key));
  }

  const hasSizeBreakdown = stok.sizes && Object.keys(stok.sizes).length > 1;

  return (
    <AccordionSection title="Stok & Penjualan">
      {hasSizeBreakdown && (
        <div className="space-y-2 mb-4">
          {Object.entries(stok.sizes!).map(([size, vals]) => {
            const sizeTotal =
              (vals.gudang ?? 0) +
              (vals.cideng ?? 0) +
              (vals.tegalgubug ?? 0) +
              (vals.ngorder ?? 0);
            return (
              <div key={size} className="border border-skin-bdr-lt p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-skin-text uppercase tracking-wide">
                    {size}
                  </span>
                  <span
                    className={`text-base font-bold ${sizeTotal === 0 ? "text-skin-text4" : "text-skin-text"}`}
                  >
                    {sizeTotal === 0 ? "HABIS" : sizeTotal}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {LOCS.map((l) => (
                    <div key={l.key} className="text-center">
                      <p className="text-[10px] text-skin-text3 uppercase tracking-wide mb-0.5">
                        {l.label}
                      </p>
                      <p
                        className={`text-sm font-semibold ${(vals as Record<string, number | undefined>)[l.key] === 0 ? "text-skin-text4" : "text-skin-text2"}`}
                      >
                        {(vals as Record<string, number | undefined>)[l.key] ?? 0}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {salesLoading ? (
        <p className="text-sm text-skin-text4">Memuat...</p>
      ) : (
        <div>
          <div className="grid grid-cols-[1fr_52px_52px_14px] gap-1.5 pb-1.5 mb-1 border-b border-skin-bdr-lt">
            <div />
            <div className="text-[10px] text-skin-text3 uppercase tracking-wide text-right">
              Stok
            </div>
            <div className="text-[10px] text-skin-text3 uppercase tracking-wide text-right">
              Terjual
            </div>
            <div />
          </div>
          {LOCS.map(({ key, label }) => (
            <StokPenjualanRow
              key={key}
              label={label}
              stokVal={(stok as unknown as Record<string, number | undefined>)[key] ?? 0}
              terjualVal={(sales as unknown as Record<string, number | undefined>)[key] ?? 0}
              kode={kode}
              location={key}
              isOpen={openLoc === key}
              onToggle={() => toggleLoc(key)}
            />
          ))}
          <StokPenjualanRow
            label="Total"
            testId="row-total-lokasi"
            stokVal={isHabis ? "HABIS" : isBelumDiisi ? "–" : total}
            stokTitle={isBelumDiisi ? "Stok belum diisi (belum stok opname)" : undefined}
            terjualVal={sales.total ?? 0}
            kode={kode}
            location={null}
            isOpen={openLoc === "total"}
            onToggle={() => toggleLoc("total")}
            emphasis
          />
        </div>
      )}
    </AccordionSection>
  );
}

export interface SizeStat {
  size: string;
  stok: number;
  terjual: number;
  dikirim: number;
  produksi: number;
}

// 1 kode bisa punya >1 ukuran (mis. Midi + Gamis) dgn stok/produksi yang
// independen -- admin: "itu juga jangan digabung ya, terpisah stoknya".
// Gabungkan daftar ukuran dari variants produk + apa pun yang muncul di
// data stok/terjual/dikirim/produksi (jaga-jaga ada histori ukuran lama
// yang sudah dihapus dari variants), lalu hitung tiap stat PER UKURAN,
// bukan dijumlah jadi 1 angka.
export function buildSizeStats(
  p: Pick<Product, "variants">,
  stok: DetailStok,
  sales: SalesByKodeMap,
  dikirim: SalesByKodeMap,
  producedBySize: ProducedByKodeMap,
): SizeStat[] {
  const sizeList = [...new Set((p.variants ?? []).map((v) => v.size).filter(Boolean))];
  return sizeList.map((size) => {
    const s: Partial<StokByLocation> = stok.sizes?.[size] ?? {};
    return {
      size,
      stok: (s.gudang ?? 0) + (s.cideng ?? 0) + (s.tegalgubug ?? 0) + (s.ngorder ?? 0),
      terjual: sales[size]?.total ?? 0,
      dikirim: dikirim[size]?.total ?? 0,
      produksi: producedBySize[size] ?? 0,
    };
  });
}

// StokPenjualanSection menampilkan Terjual per LOKASI (digabung semua
// ukuran -- sumbu beda dari buildSizeStats di atas, sengaja TETAP
// digabung di sini karena memang soal lokasi fisik, bukan ukuran).
function sumSalesByLocation(salesBySize: SalesByKodeMap): LocationSalesSummary {
  const out = { gudang: 0, cideng: 0, tegalgubug: 0, total: 0 };
  for (const s of Object.values(salesBySize ?? {})) {
    out.gudang += s.gudang ?? 0;
    out.cideng += s.cideng ?? 0;
    out.tegalgubug += s.tegalgubug ?? 0;
    out.total += s.total ?? 0;
  }
  return out;
}

export interface WarnaStokRow {
  warna: string;
  gudang: number;
  cideng: number;
  tegalgubug: number;
  ngorder: number;
  total: number;
  pending?: boolean;
}

export function buildWarnaStok(
  stokWarnaMap: StokWarnaByKodeMap = {},
  warnaList: string[] = [],
): WarnaStokRow[] {
  if (!warnaList?.length) return [];
  const acc: Record<
    string,
    { gudang: number; cideng: number; tegalgubug: number; ngorder: number }
  > = {};
  for (const bySize of Object.values(stokWarnaMap)) {
    for (const [warna, v] of Object.entries(bySize ?? {})) {
      const a = (acc[warna] ??= { gudang: 0, cideng: 0, tegalgubug: 0, ngorder: 0 });
      a.gudang += v?.gudang ?? 0;
      a.cideng += v?.cideng ?? 0;
      a.tegalgubug += v?.tegalgubug ?? 0;
      a.ngorder += v?.ngorder ?? 0;
    }
  }
  const names = [
    ...(warnaList ?? []),
    ...Object.keys(acc).filter((w) => w !== "_" && !(warnaList ?? []).includes(w)),
  ];
  const rows: WarnaStokRow[] = names
    .filter((w) => acc[w] || (warnaList ?? []).includes(w))
    .map((warna) => {
      const a = acc[warna] ?? { gudang: 0, cideng: 0, tegalgubug: 0, ngorder: 0 };
      return { warna, ...a, total: a.gudang + a.cideng + a.tegalgubug + a.ngorder };
    });
  if (acc._) {
    const a = acc._;
    const total = a.gudang + a.cideng + a.tegalgubug + a.ngorder;
    if (total > 0 && rows.length > 0) rows.push({ warna: "_", pending: true, ...a, total });
  }
  return rows;
}

type DetailProduct = Pick<
  Product,
  "kode" | "nama" | "bahan" | "hpp" | "image" | "detail" | "variants" | "warna"
>;

export interface ProductDetailModalProps {
  product: DetailProduct;
  stok?: DetailStok;
  hasStok?: boolean;
  badge?: string | null;
  keepQty?: number;
  onClose: () => void;
  onEdit: () => void;
}

const EMPTY_STOK: DetailStok = { gudang: 0, cideng: 0, tegalgubug: 0 };

export default function ProductDetailModal({
  product: p,
  stok = EMPTY_STOK,
  hasStok = true,
  badge = null,
  keepQty = 0,
  onClose,
  onEdit,
}: ProductDetailModalProps) {
  const [showSimpanGambar, setShowSimpanGambar] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [fotoIdx, setFotoIdx] = useState(0);
  const photos = [p.image, ...(Array.isArray(p.detail) ? p.detail : [])].filter(
    (u): u is string => !!u,
  );
  const { stokWarnaMap } = useStokWarnaByKode(p.kode);
  const warnaRows = buildWarnaStok(stokWarnaMap, p.warna);
  const total =
    (stok.gudang ?? 0) + (stok.cideng ?? 0) + (stok.tegalgubug ?? 0) + (stok.ngorder ?? 0);
  const isHabis = total === 0 && (hasStok || !p.image);
  const isBelumDiisi = total === 0 && !isHabis;
  const variants = (p.variants ?? []).filter((v) => v.harga > 0);
  const { data: salesRaw, isLoading: salesLoading } = useSalesByKode(p.kode);
  const sales: SalesByKodeMap = salesRaw ?? {};
  const { data: dikirimRaw } = useDikirimByKode(p.kode);
  const dikirim: SalesByKodeMap = dikirimRaw ?? {};
  const { producedBySize, isLoading: producedLoading } = useProducedByKode(p.kode);
  const producedSizes = Object.entries(producedBySize);
  const producedTotal = producedSizes.reduce((s, [, qty]) => s + qty, 0);
  const sizeStats = buildSizeStats(p, stok, sales, dikirim, producedBySize);

  const bm = badge ? BADGE_META[badge] : null;
  const tierClass = bm ? bm.frame.split(" ")[1] : "";
  const badgeReason = useProductBadgeReason(p.kode, !!badge);
  const achievements = useProductAchievements(p.kode).filter((a) => BADGE_META[a.badge]);
  const badgeHistory = describeBadgeHistory(useProductBadgeHistory(p.kode), badge);

  const infoLine = [p.bahan, p.hpp && p.hpp > 0 ? `HPP Rp ${formatHarga(p.hpp)}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        data-badge={badge ?? undefined}
        className={`relative w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col shadow-xl ${bm ? `${bm.frame} overflow-hidden max-md:!rounded-none` : "bg-skin-card border-t-2 md:border-2 border-skin-bdr"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-skin-bdr flex-shrink-0">
          <h3 className="text-2xl text-skin-accent-text leading-none font-headline">{p.kode}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-skin-text3 hover:text-skin-text text-2xl"
          >
            ✕
          </button>
        </div>

        {bm && (
          <div
            data-testid="rarity-banner"
            className={`rar-fill ${tierClass} flex items-center gap-3 px-5 py-3 text-white flex-shrink-0`}
          >
            <span className="w-10 h-10 rounded-full bg-black/25 ring-2 ring-white/70 flex items-center justify-center flex-shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={bm.icon} />
              </svg>
            </span>
            <div className="min-w-0 [text-shadow:0_1px_3px_rgba(0,0,0,.55)]">
              <p className="text-[10px] tracking-[0.25em] uppercase font-bold opacity-90">
                {bm.tier}
              </p>
              <p className="font-headline text-xl leading-tight">{bm.label}</p>
              <p className="text-xs opacity-95" data-testid="badge-reason">
                {badgeReason ?? `${bm.hint} · 30 hari terakhir`}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-5 space-y-5 bg-skin-card">
          {photos.length > 0 && (
            <div className="space-y-2">
              <img
                src={cldUrl(photos[fotoIdx] ?? photos[0]!, { width: 720 })}
                alt={p.kode}
                className="w-full h-auto max-h-80 object-contain bg-skin-raised"
              />
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {photos.map((u, i) => (
                    <button
                      key={u + i}
                      type="button"
                      onClick={() => setFotoIdx(i)}
                      aria-label={`Foto ${i + 1}`}
                      className={`flex-shrink-0 w-14 h-14 border-2 ${i === fotoIdx ? "border-skin-accent" : "border-skin-bdr-lt"}`}
                    >
                      <img
                        src={cldUrl(u, { width: 120 })}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {badgeHistory.length > 0 && (
            <div className="border border-skin-bdr-lt p-3 space-y-1.5" data-testid="badge-history">
              <p className="text-[10px] font-editorial tracking-[0.15em] uppercase text-skin-text3">
                Riwayat Pencapaian
              </p>
              {badgeHistory.map((h) => (
                <p key={h.badge} className="text-sm text-skin-text2">
                  <span
                    className={`font-semibold ${h.current ? "text-skin-accent-text" : "text-skin-text"}`}
                  >
                    {h.tier} · {h.label}
                  </span>
                  <span className="block text-xs text-skin-text3">{h.text}</span>
                  {h.reason && (
                    <span className="block text-xs text-skin-text2 mt-0.5">{h.reason}</span>
                  )}
                </p>
              ))}
            </div>
          )}

          {achievements.length > 0 && (
            <div className="border border-skin-bdr-lt p-3 space-y-2" data-testid="achievements">
              <p className="text-[10px] font-editorial tracking-[0.15em] uppercase text-skin-text3">
                Pencapaian Bulanan
              </p>
              {achievements.map((a) => (
                <div key={a.month + a.badge} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white ${BADGE_META[a.badge]!.bg}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={BADGE_META[a.badge]!.icon} />
                    </svg>
                  </span>
                  <p className="text-sm text-skin-text leading-snug">
                    <span className="font-semibold">
                      {BADGE_META[a.badge]!.tier} · {BADGE_META[a.badge]!.label} — {a.label}
                    </span>
                    {a.detail && <span className="block text-xs text-skin-text3">{a.detail}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-lg text-skin-text font-semibold leading-snug">{p.nama}</p>
            {infoLine && <p className="text-sm text-skin-text3">{infoLine}</p>}
            {variants.length > 0 && (
              <div data-testid="variant-chips" className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                {variants.map((v, i) => (
                  <span key={i} className="text-sm">
                    <span className="font-semibold text-skin-text uppercase">{v.size}</span>{" "}
                    <span className="text-skin-accent-text font-semibold">
                      Rp {formatHarga(v.harga)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Admin: "1 kode ada beberapa yang punya lebih dari 1 ukuran, nah
              itu juga jangan digabung ya, terpisah stoknya" — tiap ukuran
              (mis. Midi vs Gamis) py stok/produksi independen, jadi 1 blok
              kartu PER UKURAN (label ukuran cuma tampil kalau >1 ukuran). */}
          {sizeStats.length > 0 ? (
            sizeStats.map((st) => {
              const isHabisSize = st.stok === 0 && (hasStok || !p.image);
              const isBelumDiisiSize = st.stok === 0 && !isHabisSize;
              const overSize = st.stok + st.dikirim + st.terjual;
              return (
                <div key={st.size} data-testid={`sizestat-${st.size}`} className="space-y-1.5">
                  {sizeStats.length > 1 && (
                    <p className="text-xs font-bold text-skin-text uppercase tracking-wide">
                      {st.size}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[80px]">
                      <StatCard
                        label="Stok"
                        value={isHabisSize ? "HABIS" : isBelumDiisiSize ? "–" : st.stok}
                        title={
                          isBelumDiisiSize ? "Stok belum diisi (belum stok opname)" : undefined
                        }
                        sub={
                          sizeStats.length === 1 && keepQty > 0 ? `${keepQty} di-Keep` : undefined
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-[80px]">
                      <StatCard label="Terjual" value={st.terjual} accent />
                    </div>
                    <div className="flex-1 min-w-[80px]">
                      <StatCard label="Dikirim" value={st.dikirim} />
                    </div>
                    <div className="flex-1 min-w-[80px]">
                      <StatCard label="Produksi" value={st.produksi} />
                    </div>
                  </div>
                  {/* Produksi (buku potongan) adalah batas pasti — stok+dikirim+
                      terjual TIDAK PERNAH bisa lebih dari itu di dunia nyata
                      UNTUK UKURAN ITU SENDIRI. Kalau muncul, berarti ada
                      kesalahan di data stok/penjualan yang perlu dicek. Dikirim
                      = keep yang sudah dikirim (stok sudah keluar) tapi belum
                      dibayar — dihitung terpisah dari Terjual. */}
                  {!producedLoading && st.produksi > 0 && overSize > st.produksi && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 leading-relaxed">
                      ⚠ {sizeStats.length > 1 ? `${st.size}: ` : ""}Stok + Dikirim + Terjual (
                      {overSize}) melebihi Produksi tercatat ({st.produksi}) — ini seharusnya tidak
                      mungkin terjadi. Kemungkinan ada kesalahan di data Stok Opname atau penjualan
                      yang perlu dicek per warna.
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[80px]">
                <StatCard
                  label="Stok"
                  value={isHabis ? "HABIS" : isBelumDiisi ? "–" : total}
                  title={isBelumDiisi ? "Stok belum diisi (belum stok opname)" : undefined}
                  sub={keepQty > 0 ? `${keepQty} di-Keep` : undefined}
                />
              </div>
              <div className="flex-1 min-w-[80px]">
                <StatCard label="Terjual" value={0} accent />
              </div>
              <div className="flex-1 min-w-[80px]">
                <StatCard label="Dikirim" value={0} />
              </div>
              <div className="flex-1 min-w-[80px]">
                <StatCard label="Produksi" value={0} />
              </div>
            </div>
          )}

          <StokPenjualanSection
            stok={stok}
            sales={sumSalesByLocation(sales)}
            salesLoading={salesLoading}
            kode={p.kode}
            isHabis={isHabis}
            isBelumDiisi={isBelumDiisi}
            total={total}
          />

          <AccordionSection title="Stok Sesuai Produksi">
            {producedLoading ? (
              <p className="text-sm text-skin-text4">Memuat...</p>
            ) : producedSizes.length === 0 ? (
              <p className="text-sm text-skin-text4">Belum ada data produksi.</p>
            ) : (
              <div data-testid="produksi-sesuai-list" className="space-y-2">
                {producedSizes.map(([size, qty]) => (
                  <div key={size} className="flex justify-between">
                    <span className="text-sm text-skin-text2 uppercase tracking-wide">{size}</span>
                    <span className="text-sm font-semibold text-skin-text">{qty}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-skin-bdr-lt pt-2">
                  <span className="text-sm font-bold text-skin-text uppercase tracking-wide">
                    Total
                  </span>
                  <span className="text-sm font-bold text-skin-accent-text">{producedTotal}</span>
                </div>
              </div>
            )}
          </AccordionSection>

          {warnaRows.length > 0 && (
            <AccordionSection
              title={`Stok per Warna (${warnaRows.filter((r) => !r.pending).length})`}
            >
              <div className="grid grid-cols-[1fr_32px_32px_32px_32px_44px] gap-1.5 pb-1.5 mb-1 border-b border-skin-bdr-lt">
                <div />
                {["GD", "CD", "TG", "NG", "Total"].map((h) => (
                  <div
                    key={h}
                    className="text-[10px] text-skin-text3 uppercase tracking-wide text-right"
                  >
                    {h}
                  </div>
                ))}
              </div>
              {warnaRows.map((r) => (
                <div
                  key={r.warna}
                  className="grid grid-cols-[1fr_32px_32px_32px_32px_44px] gap-1.5 items-center py-1.5"
                >
                  <span
                    className={`text-sm truncate ${r.pending ? "text-skin-text3 italic" : "text-skin-text2"}`}
                  >
                    {r.pending ? "Belum dibagi warna" : r.warna}
                  </span>
                  {[r.gudang, r.cideng, r.tegalgubug, r.ngorder].map((v, i) => (
                    <span
                      key={i}
                      className={`text-sm text-right ${v === 0 ? "text-skin-text4" : "text-skin-text2"}`}
                    >
                      {v}
                    </span>
                  ))}
                  <span
                    className={`text-sm font-bold text-right ${r.total === 0 ? "text-skin-text4" : "text-skin-text"}`}
                  >
                    {r.total}
                  </span>
                </div>
              ))}
            </AccordionSection>
          )}

          <AccordionSection title="Riwayat Harga">
            <ProductChangeHistory kode={p.kode} />
          </AccordionSection>
        </div>

        <div className="flex-shrink-0 border-t-2 border-skin-bdr flex">
          {p.image && (
            <button
              onClick={() => setShowSimpanGambar(true)}
              className="flex-1 py-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text2 hover:text-skin-accent-text hover:bg-skin-gold transition border-r border-skin-bdr"
            >
              🖼 Simpan Gambar
            </button>
          )}
          <button
            onClick={() => setShowLabel(true)}
            className="flex-1 py-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text2 hover:text-skin-accent-text hover:bg-skin-gold transition border-r border-skin-bdr"
          >
            ▦ Cetak Label
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="flex-1 py-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text2 hover:text-skin-accent-text hover:bg-skin-gold transition"
          >
            ✎ Edit Produk
          </button>
        </div>
      </div>

      {showLabel && <CetakLabelModal kode={p.kode} onClose={() => setShowLabel(false)} />}
      {showSimpanGambar && (
        <ProductCodeImageModal product={p} onClose={() => setShowSimpanGambar(false)} />
      )}
    </div>
  );
}
