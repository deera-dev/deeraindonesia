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

const mockUpdatePose = vi.fn().mockResolvedValue(undefined);
const mockDeletePose = vi.fn().mockResolvedValue(undefined);
const mockSetBackView = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useUpdatePose: () => mockUpdatePose,
  useDeletePose: () => mockDeletePose,
  useSetBackView: () => mockSetBackView,
}));

import { PoseCard } from "./PoseCard";

const pose = {
  id: "p1",
  model_id: "m1",
  name: "Berdiri Depan",
  reference_image_url: "http://cdn.test/p.jpg",
  description: "cocok gamis longgar",
  source: "vendor_archive",
  is_active: true,
  is_back_view: false,
  created_at: "2026-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdatePose.mockResolvedValue(undefined);
  mockDeletePose.mockResolvedValue(undefined);
  mockSetBackView.mockResolvedValue(undefined);
  mockConfirmDialog.mockResolvedValue(true);
});

describe("PoseCard", () => {
  it("renders name, source label, description, and active badge", () => {
    render(<PoseCard pose={pose} />);
    expect(screen.getByText("Berdiri Depan")).toBeInTheDocument();
    expect(screen.getByText("Arsip vendor lama")).toBeInTheDocument();
    expect(screen.getByText("cocok gamis longgar")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });

  it("does not show Pose Belakang badge when is_back_view is false", () => {
    render(<PoseCard pose={pose} />);
    expect(screen.queryByText("Pose Belakang")).not.toBeInTheDocument();
  });

  it("shows Pose Belakang badge when is_back_view is true", () => {
    render(<PoseCard pose={{ ...pose, is_back_view: true }} />);
    expect(screen.getByText("Pose Belakang")).toBeInTheDocument();
  });

  it("toggles active status", async () => {
    render(<PoseCard pose={pose} />);
    fireEvent.click(screen.getByText("Nonaktifkan"));
    await waitFor(() =>
      expect(mockUpdatePose).toHaveBeenCalledWith({ id: "p1", patch: { is_active: false } }),
    );
  });

  it("marks as back view via setBackView with model_id", async () => {
    render(<PoseCard pose={pose} />);
    fireEvent.click(screen.getByText("Tandai Belakang"));
    await waitFor(() =>
      expect(mockSetBackView).toHaveBeenCalledWith({ id: "p1", model_id: "m1", value: true }),
    );
    expect(mockToast.success).toHaveBeenCalledWith('"Berdiri Depan" ditandai sbg Pose Belakang');
  });

  it("unmarks back view", async () => {
    render(<PoseCard pose={{ ...pose, is_back_view: true }} />);
    fireEvent.click(screen.getByText("Batal Tandai"));
    await waitFor(() =>
      expect(mockSetBackView).toHaveBeenCalledWith({ id: "p1", model_id: "m1", value: false }),
    );
  });

  it("deletes after confirm", async () => {
    render(<PoseCard pose={pose} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(mockDeletePose).toHaveBeenCalledWith("p1"));
    expect(mockToast.success).toHaveBeenCalledWith("Pose dihapus");
  });

  it("enters edit mode and saves", async () => {
    render(<PoseCard pose={pose} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 2]); // pencil button
    fireEvent.change(screen.getByLabelText("Nama Pose"), { target: { value: "Berdiri Baru" } });
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() =>
      expect(mockUpdatePose).toHaveBeenCalledWith({
        id: "p1",
        patch: {
          name: "Berdiri Baru",
          description: "cocok gamis longgar",
          source: "vendor_archive",
          reference_image_url: "http://cdn.test/p.jpg",
        },
      }),
    );
  });
});
