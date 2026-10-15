/**
 * BlastPanel.jsx — fitur Blast, ditampilkan INLINE sebagai tab "Blast" di
 * halaman Ngorder (permintaan Denny 2026-10: "fitur blast dipindahin aja ke
 * ngorder"). Sebelumnya modal dari tombol di halaman Produk
 * (BlastEntryModal). Toggle "Buat Baru" / "Riwayat"; drill-down detail satu
 * campaign tetap modal di atasnya (BlastCampaignDetail).
 *
 * Target utama = toko Ngorder: begitu pesan ditandai terkirim ke sebuah
 * toko, status toko otomatis jadi "sudah di-approach" (lihat markTargetStatus
 * di api.js).
 */
import { useState } from "react";
import BlastCreateForm from "./BlastCreateForm";
import BlastHistoryList from "./BlastHistoryList";

export default function BlastPanel() {
  const [mode, setMode] = useState("create"); // "create" | "history"
  const [justCreatedId, setJustCreatedId] = useState(null);

  return (
    <div className="mx-4 mt-4 bg-skin-card border border-skin-bdr flex flex-col h-[calc(100dvh-16rem)] min-h-[420px]">
      <div className="flex gap-2 px-4 py-3 border-b border-skin-bdr-lt flex-shrink-0">
        {[
          { key: "create", label: "Buat Baru" },
          { key: "history", label: "Riwayat" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMode(t.key)}
            className={`px-3 py-1.5 text-xs font-editorial tracking-[0.1em] uppercase border-b-2 transition ${
              mode === t.key
                ? "border-skin-accent text-skin-accent-text"
                : "border-transparent text-skin-text3 hover:text-skin-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "create" ? (
        <BlastCreateForm
          onCreated={(campaign) => {
            setJustCreatedId(campaign.id);
            setMode("history");
          }}
        />
      ) : (
        <BlastHistoryList autoOpenId={justCreatedId} />
      )}
    </div>
  );
}
