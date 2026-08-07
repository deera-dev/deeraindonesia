import { useState, useMemo } from "react";
import { useTheme } from "@deera/shared/features/theme/hooks";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import BackToTop from "@deera/shared/components/BackToTop";
import { usePelangganList } from "../hooks";
import { matchesSearch } from "../utils";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import PelangganDetailModal from "./PelangganDetailModal";

export default function PelangganPage() {
  const { pelanggan, loading, error } = usePelangganList();
  const { isDark, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(
    () => pelanggan.filter((p) => matchesSearch(p, search)),
    [pelanggan, search],
  );

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-2xl leading-none">DEERA</h1>
            <p className="mt-1 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase truncate">
              Pelanggan &middot; {pelanggan.length}
            </p>
          </div>
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>

        {pelanggan.length > 0 && (
          <div className="px-4 pb-4 md:px-8 md:max-w-xl">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau no HP..."
              className="w-full bg-skin-card border-2 border-skin-bdr px-4 py-4 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition font-editorial placeholder:text-skin-text4"
            />
          </div>
        )}
      </header>

      <div className="px-3 py-4 md:px-8 md:py-6">
        {loading && (
          <p className="font-editorial text-base text-skin-text3 tracking-[0.2em] text-center py-20">
            Memuat pelanggan...
          </p>
        )}
        {error && <p className="font-editorial text-base text-red-600 py-10">{error.message}</p>}

        {!loading && !error && (
          <>
            {pelanggan.length === 0 && (
              <p className="text-center text-base text-skin-text3 tracking-[0.15em] py-20 font-editorial">
                Belum ada pelanggan terdaftar. Tambahkan lewat halaman Pelanggan di POS.
              </p>
            )}

            {pelanggan.length > 0 && filtered.length === 0 && (
              <p className="text-center text-base text-skin-text4 py-16 font-editorial">
                Pelanggan tidak ditemukan
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="text-left bg-skin-card border-2 border-skin-bdr hover:border-[#CAB170] transition px-4 py-4"
                >
                  <p className="text-base font-medium text-skin-text truncate">{p.nama}</p>
                  {p.no_hp && <p className="text-sm text-skin-text3 mt-0.5">{p.no_hp}</p>}
                  {p.alamat && (
                    <p className="text-sm text-skin-text4 mt-0.5 truncate">{p.alamat}</p>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {selected && (
        <PelangganDetailModal pelanggan={selected} onClose={() => setSelected(null)} />
      )}

      <BackToTop />
      <AdminSidebar />
      <AdminBottomNav />
    </main>
  );
}
