import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/components/ui/ImageUploadField", () => ({
  ImageUploadField: ({ label, value, onChange }) => (
    <div>
      <span>{label}</span>
      <button type="button" onClick={() => onChange("http://cdn.test/pose.jpg")}>
        simulate-upload
      </button>
      {value && <span data-testid="uploaded-url">{value}</span>}
    </div>
  ),
}));

const mockCreatePose = vi.fn().mockResolvedValue({ id: "p1" });
vi.mock("../hooks", () => ({ useCreatePose: () => mockCreatePose }));

import { PoseForm } from "./PoseForm";

beforeEach(() => {
  vi.clearAllMocks();
  mockCreatePose.mockResolvedValue({ id: "p1" });
});

describe("PoseForm", () => {
  it("renders Tambah Pose title", () => {
    render(<PoseForm modelId="m1" />);
    expect(screen.getByRole("heading", { name: "Tambah Pose" })).toBeInTheDocument();
  });

  it("submit disabled without name and reference url", () => {
    render(<PoseForm modelId="m1" />);
    expect(screen.getByRole("button", { name: /Tambah Pose/ })).toBeDisabled();
  });

  it("submit stays disabled with only a name, no uploaded reference", () => {
    render(<PoseForm modelId="m1" />);
    fireEvent.change(screen.getByLabelText("Nama Pose"), { target: { value: "Berdiri" } });
    expect(screen.getByRole("button", { name: /Tambah Pose/ })).toBeDisabled();
  });

  it("calls createPose with model_id and trimmed fields on submit", async () => {
    render(<PoseForm modelId="m1" />);
    fireEvent.change(screen.getByLabelText("Nama Pose"), { target: { value: "  Berdiri  " } });
    fireEvent.click(screen.getByText("simulate-upload"));
    fireEvent.click(screen.getByRole("button", { name: /Tambah Pose/ }));
    await waitFor(() => expect(mockCreatePose).toHaveBeenCalled());
    expect(mockCreatePose).toHaveBeenCalledWith({
      model_id: "m1",
      name: "Berdiri",
      description: null,
      source: "vendor_archive",
      reference_image_url: "http://cdn.test/pose.jpg",
    });
    expect(mockToast.success).toHaveBeenCalledWith('Pose "Berdiri" ditambahkan');
  });

  it("shows error toast when createPose throws", async () => {
    mockCreatePose.mockRejectedValueOnce(new Error("gagal"));
    render(<PoseForm modelId="m1" />);
    fireEvent.change(screen.getByLabelText("Nama Pose"), { target: { value: "A" } });
    fireEvent.click(screen.getByText("simulate-upload"));
    fireEvent.click(screen.getByRole("button", { name: /Tambah Pose/ }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("gagal"));
  });

  it("changing source dropdown is reflected before submit", async () => {
    render(<PoseForm modelId="m1" />);
    fireEvent.change(screen.getByLabelText("Nama Pose"), { target: { value: "A" } });
    fireEvent.click(screen.getByText("simulate-upload"));
    fireEvent.change(screen.getByLabelText("Sumber Foto"), { target: { value: "ai_generated" } });
    fireEvent.click(screen.getByRole("button", { name: /Tambah Pose/ }));
    await waitFor(() =>
      expect(mockCreatePose).toHaveBeenCalledWith(
        expect.objectContaining({ source: "ai_generated" }),
      ),
    );
  });
});
