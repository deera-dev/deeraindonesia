import { ImageIcon, Palette } from "lucide-react";
import { useState } from "react";
import { AppShell } from "../../../shared/components/AppShell";
import { cn } from "../../../shared/lib/utils";
import { AccessoryPresetsSection } from "./AccessoryPresetsSection";
import { BackgroundPresetsSection } from "./BackgroundPresetsSection";

const TABS = [
  { key: "background", label: "Background", icon: Palette },
  { key: "accessory", label: "Aksesoris", icon: ImageIcon },
] as const;

export default function PresetsPage() {
  const [tab, setTab] = useState<"background" | "accessory">("background");

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-gold-soft">Perpustakaan Gaya</p>
        <h1 className="font-display text-2xl text-text">Presets</h1>
        <p className="mt-1 text-sm text-text-muted">
          Kelola preset background & aksesoris yang dipakai halaman Generate. Preset aktif dirotasi
          otomatis supaya tidak berulang dalam 24 jam terakhir.
        </p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-sm transition-colors",
              tab === t.key ? "text-gold" : "text-text-muted hover:text-text",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "background" ? <BackgroundPresetsSection /> : <AccessoryPresetsSection />}
    </AppShell>
  );
}
