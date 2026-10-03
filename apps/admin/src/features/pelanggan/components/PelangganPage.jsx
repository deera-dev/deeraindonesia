/**
 * PelangganPage.jsx — Pelanggan (sudah pernah transaksi) + tab "Calon"
 * (prospek, belum pernah transaksi) DIGABUNG jadi SATU halaman (permintaan
 * Denny 2026-10: "pelanggan dan calon digabungin aja jadi 1 halaman, bisa
 * dipisah dengan tab"). Tab "Calon" delegasi ke CalonCustomerList (lihat
 * features/calon-customer) — TIDAK ada CRUD duplikat, satu sumber UI.
 *
 * Deep-link `?tab=calon` (dipakai link lama "+ Kelola Calon Customer" dari
 * features/blast, kalau ada) langsung buka tab Calon.
 */
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import BackToTop from "@deera/shared/components/BackToTop";
import { usePelangganList } from "../hooks";
import { matchesSearch } from "../utils";
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
              {tab === "pelanggan" ? `Pelanggan · ${pelanggan.length}` : "Calon Customer"}
            </p>
          </div>
        </div>

        {/* Tab switcher (pola sama dgn Ngorder Daftar/Peta, lihat TokoPage.jsx) */}
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
                  ? "border-[#CAB170] text-[#CAB170]"
                  : "border-transparent text-skin-text3 hover:text-skin-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "pelanggan" && pelanggan.length > 0 && (
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

      {tab === "calon" && (
        <div className="px-3 py-4 md:px-8 md:py-6">
          <CalonCustomerList />
        </div>
      )}

      {tab === "pelanggan" && (
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
