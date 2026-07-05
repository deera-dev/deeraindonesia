import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShareTagihanModal from "./ShareTagihanModal";

const groups = [{
  bulan: "2024-03",
  total: 50000,
  items: [{
    nama_bahan: "Wolfis", motif: null,
    tanggal: "2024-02-01", jumlah: 5, satuan: "yard",
    jatuh_tempo: "2024-03-15", total_harga: 50000,
  }],
}];

// Stable spy reference -- avoids "not a spy" error that occurs when
// navigator.clipboard.writeText is inspected via the native AsyncFunction
// rather than our vi.fn() wrapper.
const mockWriteText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  mockWriteText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    writable: true,
    value: { writeText: mockWriteText },
  });
  vi.spyOn(window, "open").mockImplementation(() => {});
});

describe("ShareTagihanModal", () => {
  it("renders preview teks WhatsApp heading", () => {
    render(<ShareTagihanModal groups={groups} onClose={() => {}} />);
    expect(screen.getByText(/Preview teks WhatsApp/i)).toBeInTheDocument();
  });

  it("shows waText content in pre", () => {
    render(<ShareTagihanModal groups={groups} onClose={() => {}} />);
    expect(screen.getByText(/DEERA/)).toBeInTheDocument();
  });

  it("calls onClose when x is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ShareTagihanModal groups={groups} onClose={onClose} />);
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<ShareTagihanModal groups={groups} onClose={onClose} />);
    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("copies text when Salin Teks is clicked", () => {
    // Use fireEvent (synchronous) so the clipboard call and assertion happen
    // in the same microtask tick -- avoids async timing issues with userEvent.
    render(<ShareTagihanModal groups={groups} onClose={() => {}} />);
    fireEvent.click(screen.getByText("Salin Teks"));
    expect(mockWriteText).toHaveBeenCalledTimes(1);
  });

  it("shows checkmark Disalin after copy", async () => {
    const user = userEvent.setup();
    render(<ShareTagihanModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Salin Teks"));
    await waitFor(() => expect(screen.getByText("✓ Disalin!")).toBeInTheDocument());
  });

  it("opens WA link when Buka di WA is clicked", async () => {
    const user = userEvent.setup();
    render(<ShareTagihanModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Buka di WA"));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining("wa.me"), "_blank");
  });
});
