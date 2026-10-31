import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScanKartuModal from "./ScanKartuModal";

describe("ScanKartuModal", () => {
  let onDetect, onClose;

  beforeEach(() => {
    onDetect = vi.fn();
    onClose = vi.fn();
  });

  it("menampilkan video kamera saat getUserMedia berhasil", async () => {
    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
      configurable: true,
    });

    render(<ScanKartuModal onDetect={onDetect} onClose={onClose} />);
    expect(await screen.findByLabelText("Kamera scan barcode")).toBeInTheDocument();
  });

  it("menampilkan pesan error kalau akses kamera ditolak", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error("Permission denied")) },
      configurable: true,
    });

    render(<ScanKartuModal onDetect={onDetect} onClose={onClose} />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Tidak bisa akses kamera: Permission denied",
      ),
    );
  });

  it("tombol × memanggil onClose", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
      configurable: true,
    });
    const user = userEvent.setup();
    render(<ScanKartuModal onDetect={onDetect} onClose={onClose} />);
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });
});
