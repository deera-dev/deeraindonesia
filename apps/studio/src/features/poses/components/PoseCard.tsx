import { toast } from "@deera/shared/features/toast/hooks";
import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardBody } from "../../../shared/components/ui/Card";
import { confirmDialog } from "../../../shared/components/ui/ConfirmDialog";
import { Input, Label, Select, Textarea } from "../../../shared/components/ui/Field";
import { ImageUploadField } from "../../../shared/components/ui/ImageUploadField";
import { useDeletePose, useSetBackView, useUpdatePose } from "../hooks";
import { type AiPose, type PoseSource, SOURCE_OPTIONS } from "../schema";

export function PoseCard({ pose }: { pose: AiPose }) {
  const updatePose = useUpdatePose();
  const deletePose = useDeletePose();
  const setBackView = useSetBackView();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(pose.name);
  const [editDescription, setEditDescription] = useState(pose.description ?? "");
  const [editSource, setEditSource] = useState<PoseSource>(pose.source);
  const [editReferenceUrl, setEditReferenceUrl] = useState<string | null>(pose.reference_image_url);
  const [saving, setSaving] = useState(false);

  async function toggleActive() {
    try {
      await updatePose({ id: pose.id, patch: { is_active: !pose.is_active } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    }
  }

  async function toggleBackView() {
    const nextValue = !pose.is_back_view;
    try {
      await setBackView({ id: pose.id, model_id: pose.model_id, value: nextValue });
      toast.success(
        nextValue
          ? `"${pose.name}" ditandai sbg Pose Belakang`
          : `Tanda Pose Belakang dilepas dari "${pose.name}"`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menandai pose");
    }
  }

  async function handleDelete() {
    const ok = await confirmDialog({
      title: `Hapus pose "${pose.name}"?`,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePose(pose.id);
      toast.success("Pose dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pose");
    }
  }

  function startEdit() {
    setEditName(pose.name);
    setEditDescription(pose.description ?? "");
    setEditSource(pose.source);
    setEditReferenceUrl(pose.reference_image_url);
    setEditing(true);
  }

  async function saveEdit() {
    if (!editName.trim() || !editReferenceUrl) return;
    setSaving(true);
    try {
      await updatePose({
        id: pose.id,
        patch: {
          name: editName.trim(),
          description: editDescription.trim() || null,
          source: editSource,
          reference_image_url: editReferenceUrl,
        },
      });
      toast.success("Pose diperbarui");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui pose");
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
              label="Foto Referensi"
              folder="poses"
              value={editReferenceUrl}
              onChange={setEditReferenceUrl}
              required
            />
          </div>
          <div>
            <Label htmlFor={`edit-pose-name-${pose.id}`}>Nama Pose</Label>
            <Input
              id={`edit-pose-name-${pose.id}`}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`edit-pose-source-${pose.id}`}>Sumber Foto</Label>
            <Select
              id={`edit-pose-source-${pose.id}`}
              value={editSource}
              onChange={(e) => setEditSource(e.target.value as PoseSource)}
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`edit-pose-desc-${pose.id}`}>Catatan (opsional)</Label>
            <Textarea
              id={`edit-pose-desc-${pose.id}`}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={saving}
              disabled={!editName.trim() || !editReferenceUrl}
              onClick={saveEdit}
            >
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
      <div className="aspect-[3/4] w-full bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pose.reference_image_url}
          alt={pose.name}
          className="h-full w-full object-cover"
        />
      </div>
      <CardBody>
        <div className="mb-1 font-medium text-text">{pose.name}</div>
        <div className="mb-2 text-xs text-text-faint">
          {SOURCE_OPTIONS.find((o) => o.value === pose.source)?.label}
        </div>
        {pose.description && <p className="mb-3 text-xs text-text-muted">{pose.description}</p>}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Badge tone={pose.is_active ? "success" : "muted"}>
            {pose.is_active ? "Aktif" : "Nonaktif"}
          </Badge>
          {pose.is_back_view && <Badge tone="gold">Pose Belakang</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={toggleActive}>
            {pose.is_active ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleBackView}
            title="Foto referensi ASLI belakang model — dipakai otomatis utk foto Angle di generate-set"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {pose.is_back_view ? "Batal Tandai" : "Tandai Belakang"}
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
