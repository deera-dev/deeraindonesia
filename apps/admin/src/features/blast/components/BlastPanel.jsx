import { useState } from "react";
import BlastCreateForm from "./BlastCreateForm";
import BlastHistoryList from "./BlastHistoryList";

export default function BlastPanel() {
  const [mode, setMode] = useState("create");
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
