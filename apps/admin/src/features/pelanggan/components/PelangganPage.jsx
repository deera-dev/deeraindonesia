import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import BackToTop from "@deera/shared/components/BackToTop";
import { usePelangganList } from "../hooks";
import { matchesSearch, applyPelangganFilter, PELANGGAN_FILTERS } from "../utils";
import { CalonCustomerList } from "../../calon-customer";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import PelangganDetailModal from "./PelangganDetailModal";

export default function PelangganPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") === "calon" ? "calon" : "pelanggan");
  const { pelanggan, loading, error } = usePelangganList();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const [filterMode, setFilterMode] = useState("semua");
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(
    () => applyPelangganFilter(pelanggan, filterMode).filter((p) => matchesSearch(p, search)),
    [pelanggan, search, filterMode],
  );

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-skin-accent-text text-2xl leading-none">DEERA</h1>
            <p className="mt-1 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase truncate">
              {tab === "pelanggan" ? `Pelanggan · ${pelanggan.length}` : "Calon Customer"}
            </p>
          </div>
        </div>

        <div className="px-4 pb-4 md:px-8 flex gap-2 border-b border-skin-bdr-lt">
          {[
            { key: "pelanggan", label: "Pelanggan" },
            { key: "calon", label: "Calon" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs font-editorial tracking-[0.1em] uppercase border-b-2 transition ${
                tab === t.key
                  ? "border-skin-accent text-skin-accent-text"
                  : "border-transparent text-skin-text3 hover:text-skin-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

      </header>

      {tab === "calon" && (
        <div className="px-3 py-4 md:px-8 md:py-6">
          <CalonCustomerList />
        </div>
      )}

      {tab === "pelanggan" && (
        <div className="px-3 py-4 md:px-8 xl:px-10 2xl:px-12 md:py-6">
          {pelanggan.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterOpen((v) => !v)}
                  aria-label="Filter"
                  title="Filter"
                  aria-expanded={filterOpen}
                  className={`relative w-11 h-11 flex items-center justify-center border-2 transition ${
                    filterMode !== "semua"
                      ? "bg-skin-accent border-skin-accent text-skin-on-accent"
                      : "bg-skin-card border-skin-bdr text-skin-text3 hover:border-skin-accent hover:text-skin-accent-text"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
                  </svg>
                </button>
                {filterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                    <div className="absolute left-0 top-12 z-50 w-52 bg-skin-card border border-skin-bdr shadow-lg py-1">
                      {PELANGGAN_FILTERS.map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => {
                            setFilterMode(f.key);
                            setFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition ${
                            filterMode === f.key
                              ? "bg-skin-gold text-skin-accent-text font-semibold"
                              : "text-skin-text2 hover:bg-skin-raised"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau no HP..."
                className="flex-1 min-w-0 h-11 bg-skin-card border-2 border-skin-bdr px-4 text-base text-skin-text focus:outline-none focus:border-skin-accent transition font-editorial placeholder:text-skin-text4"
              />
            </div>
          )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="text-left bg-skin-card border-2 border-skin-bdr hover:border-skin-accent transition px-4 py-4"
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
      )}

      {selected && (
        <PelangganDetailModal pelanggan={selected} onClose={() => setSelected(null)} />
      )}

      <BackToTop />
      <AdminSidebar />
      <AdminBottomNav />
    </main>
  );
}
