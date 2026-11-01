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

vi.mock("./Timeline", () => ({
  default: ({ sampel }) => <div data-testid="timeline">Timeline:{sampel.nama}</div>,
}));

import RiwayatModal from "./RiwayatModal";
import { toast } from "@deera/shared/features/toast/hooks";

const sampel = { id: "s1", nama: "Gamis Arkana", nomor: "SPL-001", pinned: false };

beforeEach(() => {
  vi.clearAllMocks();
  mockTogglePinned.mockResolvedValue(undefined);
});

describe("RiwayatModal", () => {
  it("menampilkan nama dan nomor sampel di header", () => {
    render(<RiwayatModal sampel={sampel} onClose={vi.fn()} />);
    expect(screen.getByText("Gamis Arkana")).toBeInTheDocument();
    expect(screen.getByText("SPL-001")).toBeInTheDocument();
  });

  it("menampilkan Timeline langsung tanpa tab", () => {
    render(<RiwayatModal sampel={sampel} onClose={vi.fn()} />);
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
  });

  it("klik × memanggil onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RiwayatModal sampel={sampel} onClose={onClose} />);
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("klik backdrop memanggil onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<RiwayatModal sampel={sampel} onClose={onClose} />);
    await user.click(container.querySelector(".fixed.inset-0 > .absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("klik 📌 memanggil togglePinned dengan id & !pinned, lalu toast sukses", async () => {
    const user = userEvent.setup();
    render(<RiwayatModal sampel={sampel} onClose={vi.fn()} />);
    await user.click(screen.getByTitle("Tandai penting"));
    await waitFor(() => expect(mockTogglePinned).toHaveBeenCalledWith("s1", true));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("kalau sampel sudah pinned, tombol jadi 'Lepas pin' dan toggle ke false", async () => {
    const user = userEvent.setup();
    render(<RiwayatModal sampel={{ ...sampel, pinned: true }} onClose={vi.fn()} />);
    await user.click(screen.getByTitle("Lepas pin"));
    await waitFor(() => expect(mockTogglePinned).toHaveBeenCalledWith("s1", false));
  });

  it("toast.error kalau togglePinned gagal", async () => {
    const user = userEvent.setup();
    mockTogglePinned.mockRejectedValueOnce(new Error("network fail"));
    render(<RiwayatModal sampel={sampel} onClose={vi.fn()} />);
    await user.click(screen.getByTitle("Tandai penting"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("network fail")),
    );
  });
});
