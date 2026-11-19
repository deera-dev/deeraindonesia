import { toast } from "@deera/shared/features/toast/hooks";
import { Check, Palette, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "../../../shared/components/ui/Card";
import { confirmDialog } from "../../../shared/components/ui/ConfirmDialog";
import { FieldHint, Input, Label, Textarea } from "../../../shared/components/ui/Field";
import { ImageUploadField } from "../../../shared/components/ui/ImageUploadField";
import {
  useBackgroundPresets,
  useCreateBackgroundPreset,
  useDeleteBackgroundPreset,
  useUpdateBackgroundPreset,
} from "../hooks";
import { type BackgroundPreset, parseTags } from "../schema";

function BackgroundPresetCard({ preset }: { preset: BackgroundPreset }) {
  const updatePreset = useUpdateBackgroundPreset();
  const deletePreset = useDeleteBackgroundPreset();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(preset.name);
  const [editPromptFragment, setEditPromptFragment] = useState(preset.prompt_fragment);
  const [editMoodTags, setEditMoodTags] = useState(preset.mood_tags.join(", "));
  const [editWarnaAffinity, setEditWarnaAffinity] = useState(preset.warna_affinity.join(", "));
  const [editKategori, setEditKategori] = useState(preset.cocok_untuk_kategori.join(", "));
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
    setEditName(preset.name);
    setEditPromptFragment(preset.prompt_fragment);
    setEditMoodTags(preset.mood_tags.join(", "));
    setEditWarnaAffinity(preset.warna_affinity.join(", "));
    setEditKategori(preset.cocok_untuk_kategori.join(", "));
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
          name: editName.trim(),
          prompt_fragment: editPromptFragment.trim(),
          reference_image_url: editReferenceUrl,
          mood_tags: parseTags(editMoodTags),
          warna_affinity: parseTags(editWarnaAffinity),
          cocok_untuk_kategori: parseTags(editKategori),
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
          <div className="w-full">
            <ImageUploadField
              label="Foto referensi"
              folder="background-presets"
              value={editReferenceUrl}
              onChange={setEditReferenceUrl}
              aspect="aspect-video"
            />
          </div>
          <div>
            <Label htmlFor={`edit-bg-name-${preset.id}`}>Nama</Label>
            <Input
              id={`edit-bg-name-${preset.id}`}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`edit-bg-prompt-${preset.id}`}>Deskripsi</Label>
            <Textarea
              id={`edit-bg-prompt-${preset.id}`}
              value={editPromptFragment}
              onChange={(e) => setEditPromptFragment(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor={`edit-bg-mood-${preset.id}`}>Mood tags</Label>
            <Input
              id={`edit-bg-mood-${preset.id}`}
              value={editMoodTags}
              onChange={(e) => setEditMoodTags(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`edit-bg-warna-${preset.id}`}>Cocok warna produk</Label>
            <Input
              id={`edit-bg-warna-${preset.id}`}
              value={editWarnaAffinity}
              onChange={(e) => setEditWarnaAffinity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`edit-bg-kategori-${preset.id}`}>Kategori</Label>
            <Input
              id={`edit-bg-kategori-${preset.id}`}
              value={editKategori}
              onChange={(e) => setEditKategori(e.target.value)}
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
          className="h-28 w-full object-cover"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-surface-2">
          <Palette className="h-6 w-6 text-text-faint" />
        </div>
      )}
      <CardBody>
        <div className="mb-1 font-medium text-text">{preset.name}</div>
        <p className="mb-2 line-clamp-2 text-xs text-text-muted">{preset.prompt_fragment}</p>
        {preset.warna_affinity.length > 0 && (
          <p className="mb-3 text-xs text-text-faint">Warna: {preset.warna_affinity.join(", ")}</p>
        )}
        <div className="mb-3 flex items-center gap-2">
          <Badge tone={preset.is_active ? "success" : "muted"}>
            {preset.is_active ? "Aktif" : "Nonaktif"}
          </Badge>
          <span className="text-xs text-text-faint">dipakai {preset.use_count}x</span>
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

export function BackgroundPresetsSection() {
  const { presets, loading } = useBackgroundPresets();
  const createPreset = useCreateBackgroundPreset();

  const [name, setName] = useState("");
  const [promptFragment, setPromptFragment] = useState("");
  const [moodTags, setMoodTags] = useState("");
  const [warnaAffinity, setWarnaAffinity] = useState("");
  const [kategori, setKategori] = useState("");
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !promptFragment.trim()) return;
    setSaving(true);
    try {
      await createPreset({
        name: name.trim(),
        prompt_fragment: promptFragment.trim(),
        reference_image_url: referenceUrl,
        mood_tags: parseTags(moodTags),
        warna_affinity: parseTags(warnaAffinity),
        cocok_untuk_kategori: parseTags(kategori),
      });
      toast.success(`Preset "${name.trim()}" ditambahkan`);
      setName("");
      setPromptFragment("");
      setMoodTags("");
      setWarnaAffinity("");
      setKategori("");
      setReferenceUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah preset");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = presets.filter((p) => p.is_active).length;

  return (
    <div className="flex flex-col gap-6">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Tambah Preset Background</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div className="w-full sm:w-56 sm:shrink-0">
                <ImageUploadField
                  label="Foto referensi"
                  folder="background-presets"
                  value={referenceUrl}
                  onChange={setReferenceUrl}
                  aspect="aspect-video"
                />
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div>
                  <Label htmlFor="bg-name">Nama</Label>
                  <Input
                    id="bg-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="mis. Lounge Butik Marmer Emas"
                  />
                </div>
                <div>
                  <Label htmlFor="bg-prompt">Deskripsi (dipakai sebagai prompt)</Label>
                  <Textarea
                    id="bg-prompt"
                    value={promptFragment}
                    onChange={(e) => setPromptFragment(e.target.value)}
                    placeholder="mis. lounge butik mewah dengan lantai marmer putih urat emas"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="bg-mood">Mood tags</Label>
                  <Input
                    id="bg-mood"
                    value={moodTags}
                    onChange={(e) => setMoodTags(e.target.value)}
                    placeholder="hangat, mewah"
                  />
                  <FieldHint>Pisahkan dengan koma</FieldHint>
                </div>
                <div>
                  <Label htmlFor="bg-warna">Cocok warna produk</Label>
                  <Input
                    id="bg-warna"
                    value={warnaAffinity}
                    onChange={(e) => setWarnaAffinity(e.target.value)}
                    placeholder="HITAM, MAROON, NAVY"
                  />
                </div>
                <div>
                  <Label htmlFor="bg-kategori">Kategori</Label>
                  <Input
                    id="bg-kategori"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    placeholder="gamis, syari"
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-text">Daftar Preset</h2>
          <Badge tone={activeCount >= 15 ? "success" : "gold"}>
            {activeCount} aktif dari {presets.length} · target 15-20
          </Badge>
        </div>
        {loading ? (
          <p className="text-sm text-text-faint">Memuat...</p>
        ) : presets.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Palette className="h-8 w-8 text-text-faint" />
            <p className="text-sm text-text-muted">Belum ada preset background.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {presets.map((preset) => (
              <BackgroundPresetCard key={preset.id} preset={preset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
