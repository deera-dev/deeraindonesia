/**
 * shared/LoadingState.jsx — skeleton loader (Phase 5, Dashboard Polish).
 *
 * SEBELUM Phase 5, setiap tab menampilkan teks polos "Memuat X..." saat
 * `loading` true — fungsional, tapi menyebabkan layout shift besar (teks
 * kecil di tengah layar kosong, lalu tiba-tiba diganti konten penuh) dan
 * tidak memberi petunjuk visual bentuk konten yang akan muncul. Komponen
 * ini menampilkan blok abu-abu berdenyut (pulse) meniru bentuk kasar
 * konten asli (card/list), supaya transisi loading→loaded terasa lebih
 * halus dan layout-nya lebih mirip hasil akhir.
 *
 * TIDAK ADA logic di sini — murni presentasi, dikontrol penuh oleh prop
 * `rows`/`variant`. Dipakai oleh SELURUH tab (Overview/Products/Markets/
 * MarketDetailPanel/Trends/Customers) supaya skeleton konsisten di semua
 * tempat — bukan implementasi ad-hoc per tab.
 *
 * Props:
 *   variant  "kpi" | "list" | "chart"  — bentuk blok skeleton yang
 *            ditampilkan, disesuaikan dengan bentuk konten asli tab
 *            tsb (grid KPI 2 kolom, daftar list, atau area chart).
 *   rows     number — untuk variant "list", berapa baris placeholder.
 */
const pulseBase = "animate-pulse bg-skin-bdr-lt rounded-sm";

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-skin-card border border-skin-bdr p-3 sm:p-4 flex flex-col gap-2">
          <div className={`${pulseBase} h-2.5 w-2/3`} />
          <div className={`${pulseBase} h-6 w-1/2`} />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 4 }) {
  return (
    <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`${pulseBase} w-5 h-5 rounded-full flex-shrink-0`} />
            <div className={`${pulseBase} h-3.5 w-1/3`} />
          </div>
          <div className={`${pulseBase} h-3.5 w-16 flex-shrink-0`} />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <div className={`${pulseBase} w-full h-[220px] sm:h-[260px]`} />;
}

export default function LoadingState({ variant = "list", rows = 4 }) {
  if (variant === "kpi") return <KpiSkeleton />;
  if (variant === "chart") return <ChartSkeleton />;
  return <ListSkeleton rows={rows} />;
}
