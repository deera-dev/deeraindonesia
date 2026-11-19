import { toast } from "@deera/shared/features/toast/hooks";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../../../shared/components/ui/Card";
import { Input, Label, Select, Textarea } from "../../../shared/components/ui/Field";
import { ImageUploadField } from "../../../shared/components/ui/ImageUploadField";
import { useCreatePose } from "../hooks";
import { type PoseSource, SOURCE_OPTIONS } from "../schema";

export function PoseForm({ modelId }: { modelId: string }) {
  const createPose = useCreatePose();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<PoseSource>("vendor_archive");
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !referenceUrl) return;
    setSaving(true);
    try {
      await createPose({
        model_id: modelId,
        name: name.trim(),
        description: description.trim() || null,
        source,
        reference_image_url: referenceUrl,
      });
      toast.success(`Pose "${name.trim()}" ditambahkan`);
      setName("");
      setDescription("");
      setSource("vendor_archive");
      setReferenceUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah pose");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Tambah Pose</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div className="w-full sm:w-40 sm:shrink-0">
              <ImageUploadField
                label="Foto Referensi Pose"
                folder="poses"
                value={referenceUrl}
                onChange={setReferenceUrl}
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <div>
                <Label htmlFor="pose-name">Nama Pose</Label>
                <Input
                  id="pose-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="mis. Berdiri depan, tangan di pinggang"
                />
              </div>
              <div>
                <Label htmlFor="pose-source">Sumber Foto</Label>
                <Select
                  id="pose-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as PoseSource)}
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="pose-desc">Catatan (opsional)</Label>
                <Textarea
                  id="pose-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="mis. cocok untuk produk gamis longgar"
                  rows={2}
                />
              </div>
            </div>
          </div>
          <Button type="submit" loading={saving} disabled={!name.trim() || !referenceUrl}>
            <Plus className="h-4 w-4" />
            Tambah Pose
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
