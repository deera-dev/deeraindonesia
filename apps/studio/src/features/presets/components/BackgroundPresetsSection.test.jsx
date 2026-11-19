import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/components/ui/ImageUploadField", () => ({
  ImageUploadField: ({ label, onChange }) => (
    <div>
      <span>{label}</span>
      <button type="button" onClick={() => onChange("http://cdn.test/bg.jpg")}>
        simulate-upload
      </button>
    </div>
  ),
}));
const mockConfirmDialog = vi.fn().mockResolvedValue(true);
vi.mock("../../../shared/components/ui/ConfirmDialog", () => ({
  confirmDialog: (...args) => mockConfirmDialog(...args),
}));

const mockUseBackgroundPresets = vi.fn();
const mockCreate = vi.fn().mockResolvedValue({ id: "bg1" });
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useBackgroundPresets: () => mockUseBackgroundPresets(),
  useCreateBackgroundPreset: () => mockCreate,
  useUpdateBackgroundPreset: () => mockUpdate,
  useDeleteBackgroundPreset: () => mockDelete,
}));

import { BackgroundPresetsSection } from "./BackgroundPresetsSection";

const preset = {
  id: "bg1",
  name: "Lounge Marmer",
  prompt_fragment: "lounge butik mewah",
  reference_image_url: null,
  mood_tags: ["hangat"],
  warna_affinity: ["HITAM"],
  cocok_untuk_kategori: ["gamis"],
  last_used_at: null,
  use_count: 3,
  is_active: true,
  created_at: "2026-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseBackgroundPresets.mockReturnValue({ presets: [preset], loading: false });
  mockCreate.mockResolvedValue({ id: "bg1" });
  mockUpdate.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  mockConfirmDialog.mockResolvedValue(true);
});

describe("BackgroundPresetsSection", () => {
  it("shows empty state", () => {
    mockUseBackgroundPresets.mockReturnValue({ presets: [], loading: false });
    render(<BackgroundPresetsSection />);
    expect(screen.getByText("Belum ada preset background.")).toBeInTheDocument();
  });

  it("renders preset card with name, warna, and use count", () => {
    render(<BackgroundPresetsSection />);
    expect(screen.getByText("Lounge Marmer")).toBeInTheDocument();
    expect(screen.getByText("Warna: HITAM")).toBeInTheDocument();
    expect(screen.getByText("dipakai 3x")).toBeInTheDocument();
  });

  it("shows active-count badge", () => {
    render(<BackgroundPresetsSection />);
    expect(screen.getByText(/1 aktif dari 1/)).toBeInTheDocument();
  });

  it("creates a preset with parsed tag lists on submit", async () => {
    render(<BackgroundPresetsSection />);
    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Taman Senja" } });
    fireEvent.change(screen.getByLabelText("Deskripsi (dipakai sebagai prompt)"), {
      target: { value: "taman senja romantis" },
    });
    fireEvent.change(screen.getByLabelText("Mood tags"), { target: { value: "hangat, romantis" } });
    fireEvent.click(screen.getByRole("button", { name: /Tambah Preset/ }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Taman Senja", mood_tags: ["hangat", "romantis"] }),
      ),
    );
  });

  it("toggles active status", async () => {
    render(<BackgroundPresetsSection />);
    fireEvent.click(screen.getByText("Nonaktifkan"));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({ id: "bg1", patch: { is_active: false } }),
    );
  });

  it("deletes after confirm", async () => {
    render(<BackgroundPresetsSection />);
    const deleteButton = screen
      .getAllByRole("button")
      .find((b) => b.querySelector("svg.lucide-trash2"));
    fireEvent.click(deleteButton);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("bg1"));
    expect(mockToast.success).toHaveBeenCalledWith("Preset dihapus");
  });

  it("enters edit mode, changes name, and saves with re-parsed tags", async () => {
    render(<BackgroundPresetsSection />);
    const pencilButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg.lucide-pencil"));
    fireEvent.click(pencilButtons[0]);
    fireEvent.change(document.getElementById("edit-bg-name-bg1"), {
      target: { value: "Lounge Baru" },
    });
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "bg1",
          patch: expect.objectContaining({ name: "Lounge Baru" }),
        }),
      ),
    );
  });
});
