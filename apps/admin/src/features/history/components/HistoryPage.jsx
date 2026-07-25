/**
 * HistoryPage.jsx — Halaman riwayat & audit log.
 *
 * Komponen diff & modal → ./
 * Data layer → ../hooks.js (Dependency Inversion — komponen tidak panggil
 * supabase langsung).
 */
import { useState, useMemo } from "react";
import { useHistory, useDeleteHistory } from "../hooks";
import { useTheme } from "@deera/shared/features/theme/hooks";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import BackToTop from "@deera/shared/components/BackToTop";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import { toast } from "@deera/shared/features/toast/hooks";
import { getMeta, presetToDates, formatTime, groupByDate } from "../utils";
import HistoryDetailModal from "./HistoryDetailModal";

export default function HistoryPage() {
  const [datePreset, setDatePreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState("all");
  const [modalItem, setModalItem] = useState(null);
  const [deleting, setDeleting] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { dateFrom, dateTo } =
    datePreset === "custom"
      ? { dateFrom: customFrom || null, dateTo: customTo || null }
      : presetToDates(datePreset);

  const { history, loading, error, reload } = useHistory({ dateFrom, dateTo, category });
  const deleteHistory = useDeleteHistory();
  const { isDark, toggleTheme } = useTheme();
  const groups = useMemo(() => groupByDate(history), [history]);

  // Ganti window.confirm dengan modal kustom (CLAUDE.md §13: jangan pakai
  // window.confirm — buat modal konfirmasi sendiri, konteks PWA).
  function requestDelete(id, e) {
    e.stopPropagation();
    setConfirmDeleteId(id);
  }

  async function handleConfirmDelete() {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    setDeleting((prev) => ({ ...prev, [id]: true }));
    try {
      await deleteHistory(id);
      if (modalItem?.id === id) setModalItem(null);
      reload();
    } catch (err) {
      toast.error("Gagal hapus: " + err.message);
    } finally {
      setDeleting((prev) => ({ ...prev, [id]: false }));
    }
  }

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      <HistoryDetailModal item={modalItem} onClose={() => setModalItem(null)} />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <h1 className="font-headline text-[#CAB170] text-2xl leading-none">DEERA</h1>
            <p className="mt-1 font-editorial text-xs tracking-[0.2em] text-skin-text3 uppercase">
              Riwayat & Audit
            </p>
          </div>
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>

        {/* Filter bar */}
        <div className="border-t border-skin-bdr-lt px-4 py-2.5 flex items-center gap-2 flex-wrap">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold tracking-wide border border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-[#CAB170] transition cursor-pointer"
          >
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">30 Hari Terakhir</option>
            <option value="custom">Rentang Custom</option>
            <option value="all">Semua Waktu</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold tracking-wide border border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-[#CAB170] transition cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            <option value="produk">Produk</option>
            <option value="produksi">Produksi</option>
            <option value="transfer">Transfer</option>
            <option value="stok">Stok</option>
            <option value="pelanggan">Pelanggan</option>
          </select>

          {!loading && (
            <span className="ml-auto text-xs text-skin-text4">{history.length} entri</span>
          )}
        </div>

        {/* Custom date inputs */}
        {datePreset === "custom" && (
          <div className="border-t border-skin-bdr-lt px-4 py-2 flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-[#CAB170]"
            />
            <span className="text-skin-text4 text-xs">—</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-[#CAB170]"
            />
          </div>
        )}
      </header>

      {/* ── List ── */}
      <div className="px-4 py-6 md:px-8 md:max-w-3xl md:mx-auto">
        {loading && (
          <p className="font-editorial text-sm text-skin-text3 text-center py-20">
            Memuat riwayat...
          </p>
        )}
        {error && (
          <p className="font-editorial text-sm text-red-500 py-8 text-center">{error.message}</p>
        )}
        {!loading && !error && history.length === 0 && (
          <p className="font-editorial text-sm text-skin-text3 text-center py-20">
            Belum ada riwayat untuk periode ini
          </p>
        )}

        {!loading &&
          !error &&
          groups.map((group) => (
            <div key={group.key} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-editorial text-[11px] tracking-[0.15em] uppercase text-skin-text3 flex-shrink-0">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-skin-bdr-lt" />
              </div>

              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const meta = getMeta(item.action);
                  const hasDiff = !!(item.before_snapshot || item.snapshot);
                  const isDeleting = !!deleting[item.id];

                  return (
                    <div
                      key={item.id}
                      onClick={hasDiff ? () => setModalItem(item) : undefined}
                      className={`flex items-stretch bg-skin-card border border-skin-bdr overflow-hidden transition ${hasDiff ? "cursor-pointer active:bg-skin-page" : ""}`}
                    >
                      {/* Left color stripe */}
                      <div className="w-1 flex-shrink-0" style={{ backgroundColor: meta.color }} />

                      {/* Main content */}
                      <div className="flex-1 min-w-0 flex items-center gap-3 px-3 py-3">
                        <span
                          className={`flex-shrink-0 self-start mt-0.5 px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase border font-editorial leading-relaxed ${meta.badgeCls}`}
                        >
                          {meta.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          {item.action?.startsWith("pelanggan-") ? (
                            <>
                              <p className="font-headline text-[#CAB170] text-base leading-tight truncate">
                                {item.nama || item.snapshot?.nama || "—"}
                              </p>
                              <p className="font-editorial text-xs text-skin-text3 truncate mt-0.5">
                                {[item.snapshot?.no_hp, item.snapshot?.alamat]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-headline text-[#CAB170] text-base leading-tight truncate">
                                {item.kode}
                              </p>
                              <p className="font-editorial text-xs text-skin-text3 truncate mt-0.5">
                                {item.nama || item.snapshot?.nama || "—"}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right hidden sm:block">
                          <p className="font-editorial text-xs text-skin-text2 tabular-nums">
                            {formatTime(item.changed_at)}
                          </p>
                          {item.user_name && (
                            <p className="font-editorial text-[10px] text-skin-text3 mt-0.5 truncate max-w-[90px]">
                              {item.user_name}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => requestDelete(item.id, e)}
                            disabled={isDeleting}
                            className="w-8 h-8 flex items-center justify-center text-skin-text4 hover:text-red-500 active:text-red-500 transition disabled:opacity-40 text-base"
                            title="Hapus"
                          >
                            {isDeleting ? "·" : "×"}
                          </button>
                        </div>
                      </div>

                      {hasDiff && (
                        <div className="flex-shrink-0 flex items-center px-2.5 border-l border-skin-bdr-lt text-skin-text4 text-xs">
                          →
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* ── Modal konfirmasi hapus (pengganti window.confirm) ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-skin-card border-2 border-red-500/40 p-6 w-full max-w-sm space-y-4">
            <p className="font-editorial text-sm tracking-[0.15em] uppercase text-red-400">
              Hapus Entri Riwayat
            </p>
            <p className="text-sm text-skin-text2">
              Entri riwayat ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-red-600 hover:bg-red-700 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      <AdminSidebar />
      <AdminBottomNav />
      <BackToTop />
    </main>
  );
}
