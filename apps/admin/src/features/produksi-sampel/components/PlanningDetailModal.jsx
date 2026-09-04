/**
 * PlanningDetailModal.jsx — Modal detail satu Planning: tab "Diskusi"
 * (CommentThread) + tab "Riwayat" (Timeline) + tombol pin/prioritaskan
 * (permintaan Denny 2026-09, hasil diskusi fitur planning kolaboratif).
 * Dibuka dari tombol "💬 Diskusi" di SampelCard.jsx / PlanningQueueList.jsx.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { useMarkSampelRead, useTogglePinned } from "../hooks";
import { formatDisplayName } from "../utils";
import CommentThread from "./CommentThread";
import Timeline from "./Timeline";

const TABS = [
  { key: "diskusi", label: "Diskusi" },
  { key: "riwayat", label: "Riwayat" },
];

export default function PlanningDetailModal({ sampel, onClose }) {
  const [tab, setTab] = useState("diskusi");
  const togglePinned = useTogglePinned();
  const [pinning, setPinning] = useState(false);
  const { user } = useAuth();
  const markSampelRead = useMarkSampelRead();

  // Tandai sudah dibaca (permintaan Denny 2026-09: badge unread + "siapa
  // sudah baca") — saat tab Diskusi aktif, baik pertama kali modal dibuka
  // (default tab = "diskusi") maupun saat user pindah balik dari tab
  // Riwayat. Best-effort, gagal simpan tidak perlu toast (bukan aksi utama).
  useEffect(() => {
    if (tab !== "diskusi" || !sampel?.id || !user?.email) return;
    markSampelRead({
      sampelId: sampel.id,
      userEmail: user.email,
      userName: formatDisplayName(user.user_metadata?.full_name || user.email),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sampel?.id, user?.email]);

  async function handleTogglePin() {
    setPinning(true);
    try {
      await togglePinned(sampel.id, !sampel.pinned);
      toast.success(sampel.pinned ? "Pin dilepas" : "Ditandai penting ✓");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setPinning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[92dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-2 px-4 py-4 border-b border-skin-bdr-lt">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-skin-text truncate">{sampel.nama}</p>
            <p className="text-[10px] text-skin-text3">{sampel.nomor}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleTogglePin}
              disabled={pinning}
              title={sampel.pinned ? "Lepas pin" : "Tandai penting"}
              className={`px-2.5 py-1.5 text-xs border transition disabled:opacity-40 ${
                sampel.pinned
                  ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                  : "border-skin-bdr text-skin-text3 hover:text-[#CAB170] hover:border-[#CAB170]/50"
              }`}
            >
              📌
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-skin-text3 hover:text-skin-text text-xl leading-none px-1 transition"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-skin-bdr-lt">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-editorial tracking-[0.12em] uppercase border-b-2 transition ${
                tab === t.key
                  ? "border-[#CAB170] text-[#CAB170]"
                  : "border-transparent text-skin-text3 hover:text-skin-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {tab === "diskusi" ? <CommentThread sampel={sampel} /> : <Timeline sampel={sampel} />}
        </div>
      </div>
    </div>
  );
}
