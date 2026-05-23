import { Link } from "react-router-dom";
import { useHistory } from "../hooks/useHistory";
import { useTheme } from "@deera/shared/hooks/useTheme";

function actionLabel(action) {
  if (action === "tambah") return { label: "Tambah", cls: "bg-green-100 text-green-700 border-green-200" };
  if (action === "hapus")  return { label: "Hapus",  cls: "bg-red-100 text-red-700 border-red-200" };
  return                          { label: "Edit",   cls: "bg-skin-gold text-[#CAB170] border-skin-bdr-gold" };
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

export default function History() {
  const { history, loading, error } = useHistory();
  const { isDark, toggleTheme } = useTheme();

  return (
    <main className="min-h-screen bg-skin-page text-skin-text">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-4 bg-skin-card border-b-2 border-skin-bdr shadow-sm md:px-8">
        <div>
          <h1 className="font-headline text-[#CAB170] text-2xl leading-none">DEERA</h1>
          <p className="mt-1 font-editorial text-xs tracking-[0.2em] text-skin-text3 uppercase">Riwayat Perubahan</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme}
            title={isDark ? "Mode terang" : "Mode gelap"}
            className="w-10 h-10 flex items-center justify-center border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition text-base">
            {isDark ? "☀" : "☾"}
          </button>
          <Link to="/admin"
            className="px-5 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 border-2 border-skin-bdr hover:border-[#CAB170] hover:text-[#CAB170] transition">
            ← Kembali
          </Link>
        </div>
      </header>

      <div className="px-4 py-6 md:px-8">
        {loading && <p className="font-editorial text-base text-skin-text3 text-center py-16">Memuat riwayat...</p>}
        {error && <p className="font-editorial text-base text-red-600">{error.message}</p>}
        {!loading && !error && history.length === 0 && (
          <p className="font-editorial text-base text-skin-text3 text-center py-16">Belum ada riwayat</p>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="flex flex-col divide-y divide-skin-bdr-lt">
            {history.map(item => {
              const { label, cls } = actionLabel(item.action);
              const snap = item.snapshot ?? {};
              return (
                <div key={item.id} className="py-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
                  <div className="min-w-[170px]">
                    <p className="font-editorial text-sm text-skin-text3">{formatDate(item.changed_at)}</p>
                    {item.user_name && (
                      <p className="mt-1 font-editorial text-sm text-skin-text2 font-medium">{item.user_name}</p>
                    )}
                  </div>
                  <span className={`self-start px-3 py-1 font-editorial text-xs tracking-[0.15em] uppercase border rounded-sm ${cls}`}>
                    {label}
                  </span>
                  <div className="flex-1">
                    <p className="font-headline text-[#CAB170] text-xl leading-none">{item.kode}</p>
                    <p className="mt-1 font-editorial text-base text-skin-text2">{item.nama || snap.nama || "-"}</p>
                    {snap && Object.keys(snap).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                        {snap.bahan && <span className="font-editorial text-sm text-skin-text3">Bahan: {snap.bahan}</span>}
                        {snap.hpp != null && <span className="font-editorial text-sm text-skin-text3">HPP: Rp {snap.hpp?.toLocaleString("id-ID")}</span>}
                        {Array.isArray(snap.variants) && snap.variants.length > 0 && (
                          <span className="font-editorial text-sm text-skin-text3">Ukuran: {snap.variants.map(v => v.size).join(" · ")}</span>
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
