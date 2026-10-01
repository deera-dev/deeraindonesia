/**
 * BlastEntryModal.jsx — SATU-SATUNYA titik masuk fitur Blast (permintaan
 * Denny 2026-10: "gausah ada tab baru buat blast, bikin aja button baru
 * disamping bagikan dan unduh gambar"). Dibuka dari tombol "Blast" di
 * AdminPage.jsx toolbar — BUKAN route/halaman/menu nav terpisah.
 *
 * Satu modal (satu overlay) dengan toggle "Buat Baru" / "Riwayat" di
 * header — drill-down ke detail satu campaign tetap boleh stacking modal
 * baru di atasnya (BlastCampaignDetail), itu wajar untuk lihat detail,
 * bukan navigasi tab baru.
 */
import { useState } from "react";
import BlastCreateForm from "./BlastCreateForm";
import BlastHistoryList from "./BlastHistoryList";

export default function BlastEntryModal({ onClose }) {
  const [mode, setMode] = useState("create"); // "create" | "history"
  const [justCreatedId, setJustCreatedId] = useState(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`px-3 py-1.5 text-xs font-editorial tracking-[0.1em] uppercase border-b-2 transition ${
                mode === "create"
                  ? "border-[#CAB170] text-[#CAB170]"
                  : "border-transparent text-skin-text3 hover:text-skin-text"
              }`}
            >
              Buat Baru
            </button>
            <button
              type="button"
              onClick={() => setMode("history")}
              className={`px-3 py-1.5 text-xs font-editorial tracking-[0.1em] uppercase border-b-2 transition ${
                mode === "history"
                  ? "border-[#CAB170] text-[#CAB170]"
                  : "border-transparent text-skin-text3 hover:text-skin-text"
              }`}
            >
              Riwayat
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center flex-shrink-0"
          >
            ×
          </button>
        </div>

        {mode === "create" ? (
          <BlastCreateForm
            onClose={onClose}
            onCreated={(campaign) => {
              setJustCreatedId(campaign.id);
              setMode("history");
            }}
          />
        ) : (
          <BlastHistoryList autoOpenId={justCreatedId} />
        )}
      </div>
    </div>
  );
}
