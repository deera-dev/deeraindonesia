import { toast } from "@deera/shared/features/toast/hooks";
import { Check, Pencil, Trash2, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardBody } from "../../../shared/components/ui/Card";
import { confirmDialog } from "../../../shared/components/ui/ConfirmDialog";
import { Input, Label } from "../../../shared/components/ui/Field";
import { ImageUploadField } from "../../../shared/components/ui/ImageUploadField";
import { useDeleteModel, useUpdateModel } from "../hooks";
import type { AiModel } from "../schema";

export function ModelCard({ model }: { model: AiModel }) {
  const updateModel = useUpdateModel();
  const deleteModel = useDeleteModel();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(model.name);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState(model.thumbnail_url);
  const [saving, setSaving] = useState(false);

  async function toggleActive() {
    try {
      await updateModel({ id: model.id, patch: { is_active: !model.is_active } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    }
  }

  async function handleDelete() {
    const ok = await confirmDialog({
      title: `Hapus model "${model.name}"?`,
      description:
        "Pose yang terikat ke model ini ikut terhapus. Tindakan ini tidak bisa dibatalkan.",
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteModel(model.id);
      toast.success("Model dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus model");
    }
  }

  function startEdit() {
    setEditName(model.name);
    setEditThumbnailUrl(model.thumbnail_url);
    setEditing(true);
  }

  async function saveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateModel({
        id: model.id,
        patch: { name: editName.trim(), thumbnail_url: editThumbnailUrl },
      });
      toast.success("Model diperbarui");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui model");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Card className="overflow-hidden">
        <CardBody className="flex flex-col gap-3">
          <div className="w-32">
            <ImageUploadField
              label="Thumbnail"
              folder="models"
              value={editThumbnailUrl}
              onChange={setEditThumbnailUrl}
              aspect="aspect-square"
            />
          </div>
          <div>
            <Label htmlFor={`edit-model-name-${model.id}`}>Nama Model</Label>
            <Input
              id={`edit-model-name-${model.id}`}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={saving} disabled={!editName.trim()} onClick={saveEdit}>
              <Check className="h-3.5 w-3.5" />
              Simpan
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5" />
              Batal
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="aspect-square w-full bg-surface-2">
        {model.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={model.thumbnail_url} alt={model.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UserRound className="h-8 w-8 text-text-faint" />
          </div>
        )}
      </div>
      <CardBody>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="font-medium text-text">{model.name}</span>
          <Badge tone={model.is_active ? "success" : "muted"}>
            {model.is_active ? "Aktif" : "Nonaktif"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleActive}>
            {model.is_active ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
