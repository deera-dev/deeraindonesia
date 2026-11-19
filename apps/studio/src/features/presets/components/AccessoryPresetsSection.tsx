import { toast } from "@deera/shared/features/toast/hooks";
import { Check, ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../../../shared/components/ui/Card";
import { confirmDialog } from "../../../shared/components/ui/ConfirmDialog";
import { Input, Label, Select, Textarea } from "../../../shared/components/ui/Field";
import { ImageUploadField } from "../../../shared/components/ui/ImageUploadField";
import {
  useAccessoryPresets,
  useCreateAccessoryPreset,
  useDeleteAccessoryPreset,
  useUpdateAccessoryPreset,
} from "../hooks";
import { ACCESSORY_CATEGORIES, type AccessoryCategory, type AccessoryPreset } from "../schema";

function AccessoryPresetCard({ preset }: { preset: AccessoryPreset }) {
  const updatePreset = useUpdateAccessoryPreset();
  const deletePreset = useDeleteAccessoryPreset();
  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<AccessoryCategory>(preset.category);
  const [editName, setEditName] = useState(preset.name);
  const [editPromptFragment, setEditPromptFragment] = useState(preset.prompt_fragment);
  const [editReferenceUrl, setEditReferenceUrl] = useState<string | null>(
    preset.reference_image_url,
  );
  const [saving, setSaving] = useState(false);

  async function toggleActive() {
    try {
      await updatePreset({ id: preset.id, patch: { is_active: !preset.is_active } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    }
  }

  async function handleDelete() {
    const ok = await confirmDialog({
      title: `Hapus preset "${preset.name}"?`,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePreset(preset.id);
      toast.success("Preset dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus preset");
    }
  }

  function startEdit() {
    setEditCategory(preset.category);
    setEditName(preset.name);
    setEditPromptFragment(preset.prompt_fragment);
    setEditReferenceUrl(preset.reference_image_url);
    setEditing(true);
  }

  async function saveEdit() {
    if (!editName.trim() || !editPromptFragment.trim()) return;
    setSaving(true);
    try {
      await updatePreset({
        id: preset.id,
        patch: {
          category: editCategory,
          name: editName.trim(),
          prompt_fragment: editPromptFragment.trim(),
          reference_image_url: editReferenceUrl,
        },
      });
      toast.success("Preset diperbarui");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui preset");
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
              label="Foto referensi"
              folder="accessory-presets"
              value={editReferenceUrl}
              onChange={setEditReferenceUrl}
              aspect="aspect-square"
            />
          </div>
          <div>
            <Label htmlFor={`edit-acc-category-${preset.id}`}>Kategori</Label>
            <Select
              id={`edit-acc-category-${preset.id}`}
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as AccessoryCategory)}
            >
              {ACCESSORY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`edit-acc-name-${preset.id}`}>Nama</Label>
            <Input
              id={`edit-acc-name-${preset.id}`}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`edit-acc-prompt-${preset.id}`}>Deskripsi</Label>
            <Textarea
              id={`edit-acc-prompt-${preset.id}`}
              value={editPromptFragment}
              onChange={(e) => setEditPromptFragment(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={saving}
              disabled={!editName.trim() || !editPromptFragment.trim()}
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
      {preset.reference_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preset.reference_image_url}
          alt={preset.name}
          className="h-24 w-full object-cover"
        />
      ) : (
        <div className="flex h-24 w-full items-center justify-center bg-surface-2">
          <ImageIcon className="h-6 w-6 text-text-faint" />
        </div>
      )}
      <CardBody>
        <Badge tone="gold" className="mb-2">
          {ACCESSORY_CATEGORIES.find((c) => c.value === preset.category)?.label}
        </Badge>
        <div className="mb-1 font-medium text-text">{preset.name}</div>
        <p className="mb-3 line-clamp-2 text-xs text-text-muted">{preset.prompt_fragment}</p>
        <div className="mb-3">
          <Badge tone={preset.is_active ? "success" : "muted"}>
            {preset.is_active ? "Aktif" : "Nonaktif"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={toggleActive}>
            {preset.is_active ? "Nonaktifkan" : "Aktifkan"}
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

export function AccessoryPresetsSection() {
  const { presets, loading } = useAccessoryPresets();
  const createPreset = useCreateAccessoryPreset();

  const [category, setCategory] = useState<AccessoryCategory>("tas");
  const [name, setName] = useState("");
  const [promptFragment, setPromptFragment] = useState("");
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !promptFragment.trim()) return;
    setSaving(true);
    try {
      await createPreset({
        category,
        name: name.trim(),
        prompt_fragment: promptFragment.trim(),
        reference_image_url: referenceUrl,
      });
      toast.success(`Preset "${name.trim()}" ditambahkan`);
      setName("");
      setPromptFragment("");
      setReferenceUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah preset");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Tambah Preset Aksesoris</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div className="w-full sm:w-40 sm:shrink-0">
                <ImageUploadField
                  label="Foto referensi"
                  folder="accessory-presets"
                  value={referenceUrl}
                  onChange={setReferenceUrl}
                  aspect="aspect-square"
                />
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div>
                  <Label htmlFor="acc-category">Kategori</Label>
                  <Select
                    id="acc-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AccessoryCategory)}
                  >
                    {ACCESSORY_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="acc-name">Nama</Label>
                  <Input
                    id="acc-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="mis. Clutch Beludru Emas"
                  />
                </div>
                <div>
                  <Label htmlFor="acc-prompt">Deskripsi (dipakai sebagai prompt)</Label>
                  <Textarea
                    id="acc-prompt"
                    value={promptFragment}
                    onChange={(e) => setPromptFragment(e.target.value)}
                    placeholder="mis. clutch kecil beludru hitam dengan aksen rantai emas"
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <Button
              type="submit"
              loading={saving}
              disabled={!name.trim() || !promptFragment.trim()}
            >
              <Plus className="h-4 w-4" />
              Tambah Preset
            </Button>
          </form>
        </CardBody>
      </Card>

      <div>
        {loading ? (
          <p className="text-sm text-text-faint">Memuat...</p>
        ) : presets.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ImageIcon className="h-8 w-8 text-text-faint" />
            <p className="text-sm text-text-muted">Belum ada preset aksesoris.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {presets.map((preset) => (
              <AccessoryPresetCard key={preset.id} preset={preset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
