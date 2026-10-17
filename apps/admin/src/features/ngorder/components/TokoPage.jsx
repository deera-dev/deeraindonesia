import { useEffect, useMemo, useState } from "react";
import {
  useTokoListQuery,
  useDeleteTokoMutation,
  summarizeByDaerah,
  distinctDaerahList,
  STATUS_APPROACH_LABEL,
  KESAN_LABEL,
} from "../hooks";
import TokoFormModal from "./TokoFormModal";
import TokoDetailModal from "./TokoDetailModal";
import PetaTab from "./PetaTab";
import { JadwalTab } from "../../ngorder-jadwal";
import { BlastPanel } from "../../blast";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";

const KESAN_BADGE = {
  tertarik: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
  belum_tertarik: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
};

export default function TokoPage() {
  const { data: list = [], isLoading } = useTokoListQuery();
  const deleteMutation = useDeleteTokoMutation();
  const [search, setSearch] = useState("");
  const [filterDaerah, setFilterDaerah] = useState("");
  const [filterApproach, setFilterApproach] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openToko, setOpenToko] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [tab, setTab] = useState("daftar");
  const [petaMounted, setPetaMounted] = useState(tab === "peta");
  useEffect(() => {
    if (tab === "peta") setPetaMounted(true);
  }, [tab]);

  const daerahOptions = useMemo(() => distinctDaerahList(list), [list]);
  const daerahSummary = useMemo(() => summarizeByDaerah(list), [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((t) => {
      if (q && !t.nama.toLowerCase().includes(q) && !(t.alamat ?? "").toLowerCase().includes(q)) {
        return false;
      }
      if (filterDaerah && (t.daerah ?? "") !== filterDaerah) return false;
      if (filterApproach && t.status_approach !== filterApproach) return false;
      return true;
    });
  }, [list, search, filterDaerah, filterApproach]);

  return (
    <div className="min-h-screen bg-skin-page pb-24 md:pb-6 md:pl-64">
      <div className="px-4 pt-6 pb-4 md:px-8 xl:px-10 2xl:px-12">
        <h1 className="font-headline text-2xl text-skin-text">Ngorder</h1>
        <p className="text-sm text-skin-text3 mt-1">
          Toko potensial per daerah — mana yang sudah di-approach, kesan mereka, dan riwayat sampel
          yang sudah/belum dikirim.
        </p>
      </div>

      <div className="px-4 pb-4 md:px-8 xl:px-10 2xl:px-12 flex gap-2 border-b border-skin-bdr-lt">
        {[
          { key: "daftar", label: "Daftar" },
          { key: "peta", label: "Peta" },
          { key: "jadwal", label: "Jadwal" },
          { key: "blast", label: "Blast" },
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

      {petaMounted && (
        <div className={tab === "peta" ? "" : "hidden"}>
          <PetaTab tokoList={list} onExit={() => setTab("daftar")} />
        </div>
      )}

      {tab === "blast" && <BlastPanel />}

      {tab === "jadwal" && <JadwalTab tokoList={list} daerahOptions={daerahOptions} />}

      {tab === "daftar" && (
        <>
      {daerahSummary.length > 0 && (
        <div className="px-4 pb-4">
          <div className="border border-skin-bdr-lt bg-skin-card divide-y divide-skin-bdr-lt">
            {daerahSummary.map((g) => (
              <button
                key={g.daerah}
                type="button"
                onClick={() => setFilterDaerah((prev) => (prev === g.daerah ? "" : g.daerah))}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left transition ${
                  filterDaerah === g.daerah ? "bg-skin-accent/10" : "hover:bg-skin-page"
                }`}
              >
                <span className="text-sm font-semibold text-skin-text">{g.daerah}</span>
                <span className="text-xs text-skin-text3 font-editorial">
                  {g.total} toko · {g.sudahApproach} di-approach
                  {g.tertarik > 0 ? ` · ${g.tertarik} tertarik` : ""}
                  {g.belumApproach > 0 ? ` · ${g.belumApproach} belum di-approach` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 md:px-8 xl:px-10 2xl:px-12 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama toko atau alamat..."
            className="flex-1 min-w-0 h-11 bg-skin-card border-2 border-skin-bdr px-4 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition"
          />
          <select
            value={filterDaerah}
            onChange={(e) => setFilterDaerah(e.target.value)}
            aria-label="Filter daerah"
            className="h-11 w-36 md:w-44 flex-shrink-0 bg-skin-card border-2 border-skin-bdr px-3 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition"
          >
            <option value="">Semua Daerah</option>
            {daerahOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={filterApproach}
            onChange={(e) => setFilterApproach(e.target.value)}
            aria-label="Filter status"
            className="h-11 w-36 md:w-44 flex-shrink-0 bg-skin-card border-2 border-skin-bdr px-3 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition"
          >
            <option value="">Semua Status</option>
            <option value="belum">Belum Di-Approach</option>
            <option value="sudah">Sudah Di-Approach</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="h-11 px-4 font-editorial text-sm tracking-[0.1em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition whitespace-nowrap flex-shrink-0"
          >
            + Tambah
          </button>
        </div>

        {isLoading && <p className="text-sm text-skin-text4 py-8 text-center">Memuat...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-skin-text4 py-8 text-center">
            Tidak ada toko yang cocok. Tambahkan lewat tombol "+ Tambah".
          </p>
        )}

        <div className="divide-y divide-skin-bdr-lt border border-skin-bdr-lt bg-skin-card xl:divide-y-0 xl:border-0 xl:bg-transparent xl:grid xl:grid-cols-2 2xl:grid-cols-3 xl:gap-3">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 xl:bg-skin-card xl:border xl:border-skin-bdr">
              <button
                type="button"
                onClick={() => setOpenToko(t)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-semibold text-skin-text truncate">{t.nama}</p>
                <p className="text-xs text-skin-text3 truncate">
                  {t.daerah ? `${t.daerah} · ` : ""}
                  {t.alamat || "- alamat belum diisi -"}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] font-editorial tracking-[0.05em] uppercase px-1.5 py-0.5 border border-skin-bdr-lt text-skin-text3">
                    {STATUS_APPROACH_LABEL[t.status_approach] ?? t.status_approach}
                  </span>
                  {t.kesan && (
                    <span
                      className={`text-[10px] font-editorial tracking-[0.05em] uppercase px-1.5 py-0.5 rounded ${KESAN_BADGE[t.kesan] ?? ""}`}
                    >
                      {KESAN_LABEL[t.kesan] ?? t.kesan}
                    </span>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(t);
                  setFormOpen(true);
                }}
                className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-accent-text hover:text-skin-accent-text underline flex-shrink-0"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(t)}
                className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 hover:text-red-500 underline flex-shrink-0"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>
        </>
      )}

      {formOpen && (
        <TokoFormModal
          initial={editing}
          daerahOptions={daerahOptions}
          onClose={() => setFormOpen(false)}
          onSaved={() => setFormOpen(false)}
        />
      )}

      {openToko && <TokoDetailModal toko={openToko} onClose={() => setOpenToko(null)} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-skin-card border-2 border-skin-bdr max-w-sm w-full p-5">
            <p className="text-sm text-skin-text">
              Hapus toko <strong>{confirmDelete.nama}</strong> beserta seluruh riwayat sampelnya?
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteMutation.mutateAsync(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="flex-1 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase text-white bg-red-500 hover:bg-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminSidebar />
      <AdminBottomNav />
    </div>
  );
}
