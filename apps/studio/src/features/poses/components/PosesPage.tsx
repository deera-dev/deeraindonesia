import { Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "../../../shared/components/AppShell";
import { Card } from "../../../shared/components/ui/Card";
import { Label, Select } from "../../../shared/components/ui/Field";
import { useModels } from "../../models/hooks";
import { usePoses } from "../hooks";
import { PoseCard } from "./PoseCard";
import { PoseForm } from "./PoseForm";

export default function PosesPage() {
  const { models } = useModels(true);
  const [selectedModelId, setSelectedModelId] = useState("");
  const { poses, loading } = usePoses(selectedModelId);

  useEffect(() => {
    if (!selectedModelId && models[0]) setSelectedModelId(models[0].id);
  }, [models, selectedModelId]);

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-gold-soft">Referensi Pose</p>
        <h1 className="font-display text-2xl text-text">Poses</h1>
        <p className="mt-1 text-sm text-text-muted">
          Setiap pose terikat ke satu model. Foto pose dipakai sebagai input Virtual Try-On — boleh
          diisi dari arsip foto vendor lama karena Deera punya hak pakai penuh.
        </p>
      </div>

      <div className="mb-6 max-w-xs">
        <Label htmlFor="pose-model">Model</Label>
        {models.length === 0 ? (
          <p className="text-sm text-text-faint">
            Belum ada model — tambah dulu di halaman Models.
          </p>
        ) : (
          <Select
            id="pose-model"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {selectedModelId && (
        <div className="flex flex-col gap-6">
          <PoseForm modelId={selectedModelId} />

          <div>
            {loading ? (
              <p className="text-sm text-text-faint">Memuat...</p>
            ) : poses.length === 0 ? (
              <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Camera className="h-8 w-8 text-text-faint" />
                <p className="text-sm text-text-muted">Belum ada pose untuk model ini.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {poses.map((pose) => (
                  <PoseCard key={pose.id} pose={pose} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
