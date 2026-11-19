import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/components/ui/ImageUploadField", () => ({
  ImageUploadField: ({ label, onChange }) => (
    <div>
      <span>{label}</span>
      <button type="button" onClick={() => onChange("http://cdn.test/acc.jpg")}>
        simulate-upload
      </button>
    </div>
  ),
}));
const mockConfirmDialog = vi.fn().mockResolvedValue(true);
vi.mock("../../../shared/components/ui/ConfirmDialog", () => ({
  confirmDialog: (...args) => mockConfirmDialog(...args),
}));

const mockUseAccessoryPresets = vi.fn();
const mockCreate = vi.fn().mockResolvedValue({ id: "acc1" });
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useAccessoryPresets: () => mockUseAccessoryPresets(),
  useCreateAccessoryPreset: () => mockCreate,
  useUpdateAccessoryPreset: () => mockUpdate,
  useDeleteAccessoryPreset: () => mockDelete,
}));

import { AccessoryPresetsSection } from "./AccessoryPresetsSection";

const preset = {
  id: "acc1",
  category: "tas",
  name: "Clutch Emas",
  prompt_fragment: "clutch beludru",
  reference_image_url: null,
  is_active: true,
  created_at: "2026-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAccessoryPresets.mockReturnValue({ presets: [preset], loading: false });
  mockCreate.mockResolvedValue({ id: "acc1" });
  mockUpdate.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  mockConfirmDialog.mockResolvedValue(true);
});

describe("AccessoryPresetsSection", () => {
  it("shows empty state", () => {
    mockUseAccessoryPresets.mockReturnValue({ presets: [], loading: false });
    render(<AccessoryPresetsSection />);
    expect(screen.getByText("Belum ada preset aksesoris.")).toBeInTheDocument();
  });

  it("renders preset card with category badge and name", () => {
    render(<AccessoryPresetsSection />);
    expect(screen.getByText("Clutch Emas")).toBeInTheDocument();
    expect(screen.getAllByText("Tas").length).toBeGreaterThan(0);
  });

  it("creates a preset with selected category on submit", async () => {
    render(<AccessoryPresetsSection />);
    fireEvent.change(screen.getByLabelText("Kategori"), { target: { value: "kalung" } });
    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Kalung Mutiara" } });
    fireEvent.change(screen.getByLabelText("Deskripsi (dipakai sebagai prompt)"), {
      target: { value: "kalung mutiara klasik" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Tambah Preset/ }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        category: "kalung",
        name: "Kalung Mutiara",
        prompt_fragment: "kalung mutiara klasik",
        reference_image_url: null,
      }),
    );
  });

  it("toggles active status", async () => {
    render(<AccessoryPresetsSection />);
    fireEvent.click(screen.getByText("Nonaktifkan"));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({ id: "acc1", patch: { is_active: false } }),
    );
  });

  it("deletes after confirm", async () => {
    render(<AccessoryPresetsSection />);
    const deleteButton = screen
      .getAllByRole("button")
      .find((b) => b.querySelector("svg.lucide-trash2"));
    fireEvent.click(deleteButton);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("acc1"));
    expect(mockToast.success).toHaveBeenCalledWith("Preset dihapus");
  });

  it("enters edit mode and saves", async () => {
    render(<AccessoryPresetsSection />);
    const pencilButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg.lucide-pencil"));
    fireEvent.click(pencilButtons[0]);
    fireEvent.change(document.getElementById("edit-acc-name-acc1"), {
      target: { value: "Clutch Baru" },
    });
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        id: "acc1",
        patch: {
          category: "tas",
          name: "Clutch Baru",
          prompt_fragment: "clutch beludru",
          reference_image_url: null,
        },
      }),
    );
  });
});
