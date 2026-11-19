import { toast } from "@deera/shared/features/toast/hooks";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../../../shared/components/ui/Card";
import { Input, Label } from "../../../shared/components/ui/Field";
import { ImageUploadField } from "../../../shared/components/ui/ImageUploadField";
import { useCreateModel } from "../hooks";

export function ModelForm() {
  const createModel = useCreateModel();
  const [name, setName] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createModel({ name: name.trim(), thumbnail_url: thumbnailUrl });
      toast.success(`Model "${name.trim()}" ditambahkan`);
      setName("");
      setThumbnailUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah model");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Tambah Model</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div className="w-full sm:w-40 sm:shrink-0">
              <ImageUploadField
                label="Thumbnail"
                folder="models"
                value={thumbnailUrl}
                onChange={setThumbnailUrl}
                aspect="aspect-square"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="model-name">Nama Model</Label>
              <Input
                id="model-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Model A"
              />
            </div>
          </div>
          <Button type="submit" loading={saving} disabled={!name.trim()}>
            <Plus className="h-4 w-4" />
            Tambah Model
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
