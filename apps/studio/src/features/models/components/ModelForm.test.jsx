import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/components/ui/ImageUploadField", () => ({
  ImageUploadField: ({ label }) => <div>{label}</div>,
}));

const mockCreateModel = vi.fn().mockResolvedValue({ id: "m1" });
vi.mock("../hooks", () => ({ useCreateModel: () => mockCreateModel }));

import { ModelForm } from "./ModelForm";

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateModel.mockResolvedValue({ id: "m1" });
});

describe("ModelForm", () => {
  it("renders Tambah Model title", () => {
    render(<ModelForm />);
    expect(screen.getByRole("heading", { name: "Tambah Model" })).toBeInTheDocument();
  });

  it("submit button disabled when name is empty", () => {
    render(<ModelForm />);
    expect(screen.getByRole("button", { name: /Tambah Model/ })).toBeDisabled();
  });

  it("calls createModel with trimmed name on submit", async () => {
    render(<ModelForm />);
    fireEvent.change(screen.getByLabelText("Nama Model"), { target: { value: "  Model A  " } });
    fireEvent.click(screen.getByRole("button", { name: /Tambah Model/ }));
    await waitFor(() =>
      expect(mockCreateModel).toHaveBeenCalledWith({ name: "Model A", thumbnail_url: null }),
    );
    expect(mockToast.success).toHaveBeenCalledWith('Model "Model A" ditambahkan');
  });

  it("shows error toast when createModel throws", async () => {
    mockCreateModel.mockRejectedValueOnce(new Error("gagal"));
    render(<ModelForm />);
    fireEvent.change(screen.getByLabelText("Nama Model"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: /Tambah Model/ }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("gagal"));
  });
});
