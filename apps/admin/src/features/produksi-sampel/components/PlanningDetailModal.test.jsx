import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockTogglePinned = vi.fn();
vi.mock("../hooks", () => ({
  useTogglePinned: () => mockTogglePinned,
}));

vi.mock("./CommentThread", () => ({
  default: ({ sampel }) => <div data-testid="comment-thread">CommentThread:{sampel.nama}</div>,
}));

vi.mock("./Timeline", () => ({
  default: ({ sampel }) => <div data-testid="timeline">Timeline:{sampel.nama}</div>,
}));

import PlanningDetailModal from "./PlanningDetailModal";
import { toast } from "@deera/shared/features/toast/hooks";

const sampel = { id: "s1", nama: "Gamis Arkana", nomor: "SPL-001", pinned: false };

beforeEach(() => {
  vi.clearAllMocks();
  mockTogglePinned.mockResolvedValue(undefined);
});

describe("PlanningDetailModal", () => {
  it("menampilkan nama dan nomor sampel di header", () => {
    render(<PlanningDetailModal sampel={sampel} onClose={vi.fn()} />);
    expect(screen.getByText("Gamis Arkana")).toBeInTheDocument();
    expect(screen.getByText("SPL-001")).toBeInTheDocument();
  });

  it("tab Diskusi aktif secara default (CommentThread tampil)", () => {
    render(<PlanningDetailModal sampel={sampel} onClose={vi.fn()} />);
    expect(screen.getByTestId("comment-thread")).toBeInTheDocument();
    expect(screen.queryByTestId("timeline")).not.toBeInTheDocument();
  });

  it("klik tab Riwayat menampilkan Timeline, menyembunyikan CommentThread", async () => {
    const user = userEvent.setup();
    render(<PlanningDetailModal sampel={sampel} onClose={vi.fn()} />);
    await user.click(screen.getByText("Riwayat"));
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
    expect(screen.queryByTestId("comment-thread")).not.toBeInTheDocument();
  });

  it("klik × memanggil onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PlanningDetailModal sampel={sampel} onClose={onClose} />);
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("klik backdrop memanggil onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<PlanningDetailModal sampel={sampel} onClose={onClose} />);
    await user.click(container.querySelector(".fixed.inset-0 > .absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("klik 📌 memanggil togglePinned dengan id & !pinned, lalu toast sukses", async () => {
    const user = userEvent.setup();
    render(<PlanningDetailModal sampel={sampel} onClose={vi.fn()} />);
    await user.click(screen.getByTitle("Tandai penting"));
    await waitFor(() => expect(mockTogglePinned).toHaveBeenCalledWith("s1", true));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("kalau sampel sudah pinned, tombol jadi 'Lepas pin' dan toggle ke false", async () => {
    const user = userEvent.setup();
    render(<PlanningDetailModal sampel={{ ...sampel, pinned: true }} onClose={vi.fn()} />);
    await user.click(screen.getByTitle("Lepas pin"));
    await waitFor(() => expect(mockTogglePinned).toHaveBeenCalledWith("s1", false));
  });

  it("toast.error kalau togglePinned gagal", async () => {
    const user = userEvent.setup();
    mockTogglePinned.mockRejectedValueOnce(new Error("network fail"));
    render(<PlanningDetailModal sampel={sampel} onClose={vi.fn()} />);
    await user.click(screen.getByTitle("Tandai penting"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("network fail")),
    );
  });
});
