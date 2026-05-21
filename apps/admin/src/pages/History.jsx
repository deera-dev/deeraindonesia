import { Link } from "react-router-dom";
import { useHistory } from "../hooks/useHistory";

function actionLabel(action) {
  if (action === "tambah") return { label: "Tambah", color: "text-green-400 border-green-400/30" };
  if (action === "hapus")  return { label: "Hapus",  color: "text-red-400 border-red-400/30" };
  return                          { label: "Edit",   color: "text-[#cab170] border-[#cab170]/30" };
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

export default function History() {
  const { history, loading, error } = useHistory();

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-5 border-b bg-black/95 backdrop-blur border-white/10 md:px-12">
        <div>
          <h1 className="font-headline text-2xl text-[#cab170] leading-none">DEERA</h1>
          <p className="mt-1 font-editorial text-[10px] tracking-[0.3em] text-white/40 uppercase">
            Riwayat Perubahan
          </p>
        </div>
        <Link
          to="/admin"
          className="px-4 py-2 font-editorial text-[10px] tracking-[0.25em] uppercase text-white/50 border border-white/10 hover:border-white/40 hover:text-white transition"
        >
          Kembali
        </Link>
      </header>

      <div className="px-6 py-10 md:px-12">
        {loading && (
          <p className="font-editorial text-xs tracking-[0.3em] text-white/40">Loading...</p>
        )}
        {error && (
          <p className="font-editorial text-sm text-red-400">{error.message}</p>
        )}
        {!loading && !error && history.length === 0 && (
          <p className="font-editorial text-xs tracking-[0.3em] text-white/40">Belum ada riwayat</p>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="flex flex-col divide-y divide-white/5">
            {history.map((item) => {
              const { label, color } = actionLabel(item.action);
              const snap = item.snapshot ?? {};
              return (
                <div key={item.id} className="py-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">

                  {/* Timestamp + User */}
                  <div className="min-w-[160px]">
                    <p className="font-editorial text-[10px] tracking-[0.2em] text-white/30 whitespace-nowrap">
                      {formatDate(item.changed_at)}
                    </p>
                    {item.user_name && (
                      <p className="mt-1 font-editorial text-[10px] text-white/45 truncate max-w-[160px]">
                        {item.user_name}
                      </p>
                    )}
                  </div>

                  {/* Badge */}
                  <span className={`self-start px-2 py-0.5 font-editorial text-[9px] tracking-[0.2em] uppercase border ${color}`}>
                    {label}
                  </span>

                  {/* Detail */}
                  <div className="flex-1">
                    <p className="font-headline text-[#cab170] text-base leading-none">
                      {item.kode}
                    </p>
                    <p className="mt-1 font-editorial text-xs text-white/55 tracking-[0.1em]">
                      {item.nama || snap.nama || "-"}
                    </p>

                    {snap && Object.keys(snap).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                        {snap.bahan && (
                          <span className="font-editorial text-[10px] text-white/35 tracking-[0.1em]">
                            Bahan: {snap.bahan}
                          </span>
                        )}
                        {snap.hpp != null && (
                          <span className="font-editorial text-[10px] text-white/35 tracking-[0.1em]">
                            HPP: Rp {snap.hpp?.toLocaleString("id-ID")}
                          </span>
                        )}
                        {(snap.stok_gudang != null || snap.stok_cideng != null || snap.stok_tegalgubug != null) && (
                          <span className="font-editorial text-[10px] text-white/35 tracking-[0.1em]">
                            Stok: Gudang {snap.stok_gudang ?? 0} &middot; Cideng {snap.stok_cideng ?? 0} &middot; Tegalgubug {snap.stok_tegalgubug ?? 0}
                          </span>
                        )}
                        {Array.isArray(snap.variants) && snap.variants.length > 0 && (
                          <span className="font-editorial text-[10px] text-white/35 tracking-[0.1em]">
                            Ukuran: {snap.variants.map((v) => v.size).join(" · ")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
