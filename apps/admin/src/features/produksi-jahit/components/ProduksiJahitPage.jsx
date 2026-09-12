/**
 * ProduksiJahitPage.jsx — Kanban Kartu Jahit.
 *
 * Kartu otomatis terbuat per kombinasi size×warna saat batch produksi
 * dibuat/diedit (lihat features/produksi-record/api.js → createJahitCardsForBatch).
 * Halaman ini murni papan kanban 3 kolom: Belum Assign → On Progress →
 * Ready Finishing. Berpindah kolom lewat tombol (BUKAN drag-and-drop —
 * keputusan Denny 2026-09: lebih stabil dipakai di HP).
 */
import { useMemo, useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import ProduksiLayout from "../../../shared/components/ProduksiLayout";
import { useAssignKaryawan, useJahitCards, useKaryawanJahit, useMarkCardDone, useMoveBackToProgress, useMoveToReadyFinishing, useUnassignCard } from "../hooks";
import { STATUS_COLUMNS, filterCards, groupByStatus } from "../utils";
import JahitColumn from "./JahitColumn";
import AssignModal from "./AssignModal";
import JahitDoneSection from "./JahitDoneSection";

export default function ProduksiJahitPage() {
  const { cards, loading } = useJahitCards();
  const { karyawanList } = useKaryawanJahit();
  const { assign, assigning } = useAssignKaryawan();
  const moveToReadyFinishing = useMoveToReadyFinishing();
  const unassignCard = useUnassignCard();
  const moveBackToProgress = useMoveBackToProgress();
  const markCardDone = useMarkCardDone();

  const [search, setSearch] = useState("");
  const [assignTarget, setAssignTarget] = useState(null);
  // Tab switcher mobile (permintaan Denny 2026-09) — status yang lagi
  // ditampilkan di layar kecil, default kolom pertama ("Belum Assign").
  // Tidak berpengaruh di md+ (semua kolom selalu tampil berdampingan).
  const [activeStatus, setActiveStatus] = useState(STATUS_COLUMNS[0].key);

  const groups = useMemo(() => groupByStatus(filterCards(cards, search)), [cards, search]);

  async function handleAssign({ cardId, karyawanId, karyawanNama }) {
    try {
      await assign({
        cardId,
        karyawanId,
        karyawanNama,
        kode: assignTarget?.kode_produk,
        nama: assignTarget?.nama_produk,
      });
      toast.success(`Kartu di-assign ke ${karyawanNama}.`);
      setAssignTarget(null);
    } catch (err) {
      toast.error("Gagal assign: " + err.message);
    }
  }

  async function handleMoveToFinishing(card) {
    try {
      await moveToReadyFinishing({ cardId: card.id, kode: card.kode_produk, nama: card.nama_produk });
    } catch (err) {
      toast.error("Gagal pindah kartu: " + err.message);
    }
  }

  async function handleUnassign(card) {
    try {
      await unassignCard({ cardId: card.id, kode: card.kode_produk, nama: card.nama_produk });
    } catch (err) {
      toast.error("Gagal batalkan assign: " + err.message);
    }
  }

  async function handleMoveBackToProgress(card) {
    try {
      await moveBackToProgress({ cardId: card.id, kode: card.kode_produk, nama: card.nama_produk });
    } catch (err) {
      toast.error("Gagal pindah kartu: " + err.message);
    }
  }

  async function handleMarkDone(card) {
    try {
      await markCardDone({ cardId: card.id, kode: card.kode_produk, nama: card.nama_produk });
      toast.success(`${card.kode_produk} ditandai selesai.`);
    } catch (err) {
      toast.error("Gagal tandai selesai: " + err.message);
    }
  }

  const cardHandlers = {
    onAssign: setAssignTarget,
    onMoveToFinishing: handleMoveToFinishing,
    onUnassign: handleUnassign,
    onMoveBackToProgress: handleMoveBackToProgress,
    onMarkDone: handleMarkDone,
  };

  return (
    <ProduksiLayout title="Kanban Jahit">
      <div className="lg:max-w-6xl lg:mx-auto">
        {!loading && cards.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, warna, penjahit..."
            className="w-full mb-4 bg-skin-card border-2 border-skin-bdr px-4 py-4 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition font-editorial placeholder:text-skin-text4"
          />
        )}

        {loading ? (
          <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
        ) : cards.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-8">
            Belum ada kartu Jahit. Kartu terbuat otomatis saat batch produksi baru dibuat.
          </p>
        ) : (
          <>
            {/* Tab switcher — HANYA mobile (md:hidden). Ganti status yang
                ditampilkan tanpa perlu scroll lewatin kartu status lain. */}
            <div className="flex md:hidden border-b border-skin-bdr-lt mb-3">
              {STATUS_COLUMNS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveStatus(key)}
                  className={`flex-1 min-w-0 py-2.5 text-center font-editorial text-[10px] tracking-[0.1em] uppercase transition border-b-2 truncate ${
                    activeStatus === key
                      ? "border-[#CAB170] text-[#CAB170]"
                      : "border-transparent text-skin-text3 hover:text-skin-text"
                  }`}
                >
                  {label} <span className="text-skin-text4">({groups[key]?.length ?? 0})</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-start">
              {STATUS_COLUMNS.map(({ key, label }) => (
                <JahitColumn key={key} label={label} cards={groups[key]} active={activeStatus === key} {...cardHandlers} />
              ))}
            </div>
          </>
        )}

        <JahitDoneSection />
      </div>

      {assignTarget && (
        <AssignModal
          card={assignTarget}
          karyawanList={karyawanList}
          assigning={assigning}
          onAssign={handleAssign}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </ProduksiLayout>
  );
}
