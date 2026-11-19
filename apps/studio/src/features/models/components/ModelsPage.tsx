import { UserRound } from "lucide-react";
import { AppShell } from "../../../shared/components/AppShell";
import { Card } from "../../../shared/components/ui/Card";
import { useModels } from "../hooks";
import { ModelCard } from "./ModelCard";
import { ModelForm } from "./ModelForm";

export default function ModelsPage() {
  const { models, loading } = useModels();

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-gold-soft">Referensi Model</p>
        <h1 className="font-display text-2xl text-text">Models</h1>
        <p className="mt-1 text-sm text-text-muted">
          Model AI dipakai bareng pose sebagai referensi wajah & tubuh yang konsisten untuk hasil
          Virtual Try-On. Tidak perlu training — cukup nama + thumbnail.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <ModelForm />

        <div>
          {loading ? (
            <p className="text-sm text-text-faint">Memuat...</p>
          ) : models.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <UserRound className="h-8 w-8 text-text-faint" />
              <p className="text-sm text-text-muted">
                Belum ada model. Tambah model baru untuk mulai upload foto pose.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {models.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
