import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagihanShareModal from "./TagihanShareModal";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));

import { toPng } from "html-to-image";

const groups = [
  {
    bulan: "2024-03",
    total: 50000,
    items: [{
      id: 1,
      nama_bahan: "Wolfis", motif: null,
      tanggal: "2024-02-01", jumlah: 5, satuan: "yard",
      jatuh_tempo: "2024-03-15", total_harga: 50000, harga_satuan: 10000,
    }],
  },
  {
    bulan: "2024-04",
    total: 30000,
    items: [{
      id: 2,
      nama_bahan: "Sifon", motif: "Bunga",
      tanggal: "2024-02-15", jumlah: 3, satuan: "yard",
      jatuh_tempo: "2024-04-01", total_harga: 30000, harga_satuan: 10000,
    }],
  },
];

// Stable spy reference -- avoids "not a spy" error that occurs when
// navigator.clipboard.writeText is inspected via the native AsyncFunction
// rather than our vi.fn() wrapper.
const mockWriteText = vi.fn().mockResolvedValue(undefined);
const FAKE_BLOB = new Blob(["png-bytes"], { type: "image/png" });

beforeEach(() => {
  vi.clearAllMocks();
  mockWriteText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    writable: true,
    value: { writeText: mockWriteText },
  });
  vi.spyOn(window, "open").mockImplementation(() => {});
  toPng.mockReset().mockResolvedValue("data:image/png;base64,TESTDATA");
  global.fetch = vi.fn().mockResolvedValue({ blob: () => Promise.resolve(FAKE_BLOB) });
});

afterEach(() => {
  // Beberapa test mem-vi.spyOn(document, "createElement") — WAJIB
  // restoreAllMocks supaya spy tidak saling membungkus antar test.
  vi.restoreAllMocks();
  delete global.navigator.share;
  delete global.navigator.canShare;
});

describe("TagihanShareModal", () => {
  it("renders preview teks WhatsApp heading", () => {
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    expect(screen.getByText(/Preview Teks WhatsApp/i)).toBeInTheDocument();
  });

  it("renders preview gambar heading + kartu TagihanShareCard", () => {
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    expect(screen.getByText(/Preview Gambar/i)).toBeInTheDocument();
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
  });

  it("shows waText content in pre (mengandung teks unik dari generateTagihanWA)", () => {
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    expect(screen.getByText(/TAGIHAN BAHAN BAKU/)).toBeInTheDocument();
  });

  it("calls onClose when x is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TagihanShareModal groups={groups} onClose={onClose} />);
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<TagihanShareModal groups={groups} onClose={onClose} />);
    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("copies text when Salin Teks is clicked", () => {
    // Use fireEvent (synchronous) so the clipboard call and assertion happen
    // in the same microtask tick -- avoids async timing issues with userEvent.
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    fireEvent.click(screen.getByText("Salin Teks"));
    expect(mockWriteText).toHaveBeenCalledTimes(1);
  });

  it("shows checkmark Disalin after copy", async () => {
    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Salin Teks"));
    await waitFor(() => expect(screen.getByText("✓ Disalin!")).toBeInTheDocument());
  });

  it("opens WA link when Bagikan Teks is clicked", async () => {
    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Bagikan Teks"));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining("wa.me"), "_blank");
  });

  it("'Unduh Gambar' memanggil toPng & trigger anchor.click() dgn filename tagihan-bahan.png", async () => {
    let capturedAnchor = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") capturedAnchor = el;
      return el;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Unduh Gambar"));

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(capturedAnchor?.download).toBe("tagihan-bahan.png"));
  });

  it("'Bagikan Gambar' pakai navigator.share kalau tersedia & bisa file", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    global.navigator.canShare = vi.fn().mockReturnValue(true);
    global.navigator.share = shareMock;

    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Bagikan Gambar"));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(shareMock.mock.calls[0][0].files[0].name).toBe("tagihan-bahan.png");
  });

  it("'Bagikan Gambar' fallback ke unduh langsung kalau navigator.share tidak tersedia", async () => {
    let capturedAnchor = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") capturedAnchor = el;
      return el;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    delete global.navigator.share;
    delete global.navigator.canShare;

    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Bagikan Gambar"));

    await waitFor(() => expect(capturedAnchor?.download).toBe("tagihan-bahan.png"));
  });

  it("AbortError dari navigator.share (user batal) tidak melempar error", async () => {
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";
    global.navigator.canShare = vi.fn().mockReturnValue(true);
    global.navigator.share = vi.fn().mockRejectedValue(abortErr);

    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Bagikan Gambar"));

    await waitFor(() => expect(screen.getByText("Bagikan Gambar")).not.toBeDisabled());
  });

  // ── Pilih Bulan (dropdown: single / beberapa / semua) ────────────────────

  it("default: dropdown tertutup, label 'Semua Bulan', kedua bulan tampil di preview", () => {
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    expect(screen.getByText("Semua Bulan")).toBeInTheDocument();
    // Panel checklist belum terbuka
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
    // "Sifon" punya motif ("Sifon / Bunga") -> teks terpecah 2 text node
    // di kartu gambar, DAN substring yg sama juga muncul di preview teks
    // WA -> pakai getAllByText (substring match, banyak elemen) drpd
    // getByText exact-match tunggal.
    expect(screen.getAllByText(/Sifon/).length).toBeGreaterThan(0);
  });

  it("klik tombol dropdown membuka panel checklist per bulan", async () => {
    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Semua Bulan"));

    expect(screen.getByText("Batal Pilih Semua")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("uncheck satu bulan di dropdown -> preview & teks hanya sisa bulan lain (single month)", async () => {
    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Semua Bulan"));
    const [checkboxMaret] = screen.getAllByRole("checkbox"); // urutan sesuai `groups`: Maret, lalu April
    await user.click(checkboxMaret);

    expect(screen.queryByText("Wolfis")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Sifon/).length).toBeGreaterThan(0);
  });

  it("'Batal Pilih Semua' mengosongkan pilihan -> tombol aksi disabled & pesan 'Pilih minimal satu bulan'", async () => {
    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Semua Bulan"));
    await user.click(screen.getByText("Batal Pilih Semua"));

    expect(screen.getByText("Pilih minimal satu bulan.")).toBeInTheDocument();
    expect(screen.getByText("Salin Teks")).toBeDisabled();
    expect(screen.getByText("Bagikan Teks")).toBeDisabled();
    expect(screen.getByText("Unduh Gambar")).toBeDisabled();
    expect(screen.getByText("Bagikan Gambar")).toBeDisabled();
  });

  it("bagikan teks HANYA menyertakan bulan yang dipilih", async () => {
    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Semua Bulan"));
    const [, checkboxApril] = screen.getAllByRole("checkbox");
    await user.click(checkboxApril); // uncheck April, sisakan Maret saja

    await user.click(screen.getByText("Bagikan Teks"));
    const waUrl = window.open.mock.calls[0][0];
    expect(decodeURIComponent(waUrl)).toContain("Wolfis");
    expect(decodeURIComponent(waUrl)).not.toContain("Sifon");
  });

  it("uncheck lalu check lagi -> kembali ke kondisi semula (toggle)", async () => {
    const user = userEvent.setup();
    render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Semua Bulan"));
    const [checkboxMaret] = screen.getAllByRole("checkbox");
    await user.click(checkboxMaret); // uncheck
    expect(screen.queryByText("Wolfis")).not.toBeInTheDocument();
    await user.click(checkboxMaret); // check lagi
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
  });

  it("klik di luar panel menutup dropdown", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagihanShareModal groups={groups} onClose={() => {}} />);
    await user.click(screen.getByText("Semua Bulan"));
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);

    await user.click(container.querySelector(".absolute.inset-0"));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
