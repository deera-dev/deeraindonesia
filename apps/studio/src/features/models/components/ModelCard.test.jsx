import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/components/ui/ImageUploadField", () => ({
  ImageUploadField: ({ label }) => <div>{label}</div>,
}));
const mockConfirmDialog = vi.fn().mockResolvedValue(true);
vi.mock("../../../shared/components/ui/ConfirmDialog", () => ({
  confirmDialog: (...args) => mockConfirmDialog(...args),
}));

const mockUpdateModel = vi.fn().mockResolvedValue(undefined);
const mockDeleteModel = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useUpdateModel: () => mockUpdateModel,
  useDeleteModel: () => mockDeleteModel,
}));

import { ModelCard } from "./ModelCard";

const model = {
  id: "m1",
  name: "Model A",
  thumbnail_url: null,
  is_active: true,
  created_at: "2026-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateModel.mockResolvedValue(undefined);
  mockDeleteModel.mockResolvedValue(undefined);
  mockConfirmDialog.mockResolvedValue(true);
});

describe("ModelCard", () => {
  it("renders model name and active badge", () => {
    render(<ModelCard model={model} />);
    expect(screen.getByText("Model A")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });

  it("toggles active status", async () => {
    render(<ModelCard model={model} />);
    fireEvent.click(screen.getByText("Nonaktifkan"));
    await waitFor(() =>
      expect(mockUpdateModel).toHaveBeenCalledWith({ id: "m1", patch: { is_active: false } }),
    );
  });

  it("enters edit mode and saves", async () => {
    render(<ModelCard model={model} />);
    const buttons = screen.getAllByRole("button");
    const editButton = buttons[1]; // outline pencil button
    fireEvent.click(editButton);
    const nameInput = screen.getByLabelText("Nama Model");
    fireEvent.change(nameInput, { target: { value: "Model B" } });
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() =>
      expect(mockUpdateModel).toHaveBeenCalledWith({
        id: "m1",
        patch: { name: "Model B", thumbnail_url: null },
      }),
    );
    expect(mockToast.success).toHaveBeenCalledWith("Model diperbarui");
  });

  it("cancels edit mode without saving", () => {
    render(<ModelCard model={model} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    fireEvent.click(screen.getByText("Batal"));
    expect(screen.getByText("Model A")).toBeInTheDocument();
    expect(mockUpdateModel).not.toHaveBeenCalled();
  });

  it("shows Nonaktif badge when model is inactive", () => {
    render(<ModelCard model={{ ...model, is_active: false }} />);
    expect(screen.getByText("Nonaktif")).toBeInTheDocument();
    expect(screen.getByText("Aktifkan")).toBeInTheDocument();
  });
});

describe("ModelCard — delete flow", () => {
  it("calls deleteModel when confirmed", async () => {
    render(<ModelCard model={model} />);
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons[buttons.length - 1];
    fireEvent.click(deleteButton);
    await waitFor(() => expect(mockDeleteModel).toHaveBeenCalledWith("m1"));
    expect(mockToast.success).toHaveBeenCalledWith("Model dihapus");
  });

  it("does not delete when not confirmed", async () => {
    mockConfirmDialog.mockResolvedValueOnce(false);
    render(<ModelCard model={model} />);
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons[buttons.length - 1];
    fireEvent.click(deleteButton);
    await waitFor(() => expect(mockConfirmDialog).toHaveBeenCalled());
    expect(mockDeleteModel).not.toHaveBeenCalled();
  });
});
