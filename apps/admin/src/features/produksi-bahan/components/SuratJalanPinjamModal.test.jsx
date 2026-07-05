import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));

import SuratJalanPinjamModal from "./SuratJalanPinjamModal";
import { toPng } from "html-to-image";

const baseItems = [
  {
    id: "abc123",
    tanggal: "2024-01-15",
    nama_pemberi: "Toko Kain ABC",
    nama_peminjam: "Deera",
    nama_bahan: "Wolfis",
    kode_bahan: "WLF-01",
    satuan: "yard",
    jumlah: 5,
    harga_satuan: 15000,
    total_harga: 75000,
    catatan: null,
    jatuh_tempo: "2024-05-15",
  },
  {
    id: "def456",
    tanggal: "2024-01-15",
    nama_pemberi: "Toko Kain ABC",
    nama_peminjam: "Deera",
    nama_bahan: "Sifon",
    kode_bahan: null,
    satuan: "meter",
    jumlah: 3,
    harga_satuan: 10000,
    total_harga: 30000,
    catatan: null,
    jatuh_tempo: "2024-05-15",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  toPng.mockResolvedValue("data:image/png;base64,TESTDATA");
});

afterEach(() => {
  // Restore any navigator property overrides
  try { Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined }); } catch {}
  try { Object.defineProperty(navigator, "share",    { configurable: true, value: undefined }); } catch {}
});

describe("SuratJalanPinjamModal", () => {
  it("renders modal title", () => {
    render(<SuratJalanPinjamModal items={baseItems} onClose={() => {}} />);
    expect(screen.getByText("Surat Jalan Pinjam Bahan")).toBeInTheDocument();
  });

  it("shows DEERA brand in document content", () => {
    render(<SuratJalanPinjamModal items={baseItems} onClose={() => {}} />);
    expect(screen.getAllByText("DEERA").length).toBeGreaterThan(0);
  });

  it("shows pemberi name (uppercased) in document", () => {
    render(<SuratJalanPinjamModal items={baseItems} onClose={() => {}} />);
    // nama_pemberi is rendered as .toUpperCase() in multiple places (header + signature)
    expect(screen.getAllByText("TOKO KAIN ABC").length).toBeGreaterThan(0);
  });

  it("shows bahan items in table (uppercased)", () => {
    render(<SuratJalanPinjamModal items={baseItems} onClose={() => {}} />);
    // Component renders nama_bahan?.toUpperCase()
    expect(screen.getByText("WOLFIS")).toBeInTheDocument();
    expect(screen.getByText("SIFON")).toBeInTheDocument();
  });

  it("shows total keseluruhan (sum of all total_harga)", () => {
    render(<SuratJalanPinjamModal items={baseItems} onClose={() => {}} />);
    // 75000 + 30000 = 105000 → fmtRp → "Rp 105.000"
    expect(screen.getByText(/105\.000/)).toBeInTheDocument();
  });

  it("shows nomorSurat based on first item", () => {
    render(<SuratJalanPinjamModal items={baseItems} onClose={() => {}} />);
    // "abc123".slice(-4).toUpperCase() = "C123"; full: SJ-20240115-C123
    expect(screen.getAllByText(/SJ-20240115/).length).toBeGreaterThan(0);
  });

  it("calls onClose when × clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SuratJalanPinjamModal items={baseItems} onClose={onClose} />);
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<SuratJalanPinjamModal items={baseItems} onClose={onClose} />);
    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Unduh button calls toPng and triggers anchor.click()", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<SuratJalanPinjamModal items={baseItems} onClose={() => {}} />);
    // Button text is "↓ Unduh"
    await user.click(screen.getByText(/Unduh/));
    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    clickSpy.mockRestore();
  });

  it("Bagikan button calls navigator.share when available", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", { configurable: true, value: shareMock });
    vi.spyOn(global, "fetch").mockResolvedValue({ blob: () => Promise.resolve(new Blob(["x"])) });
    const user = userEvent.setup();
    render(<SuratJalanPinjamModal items={baseItems} onClose={() => {}} />);
    await user.click(screen.getByText(/Bagikan/));
    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
  });

  it("Bagikan falls back to download when canShare returns false", async () => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(global, "fetch").mockResolvedValue({ blob: () => Promise.resolve(new Blob(["x"])) });
    const user = userEvent.setup();
    render(<SuratJalanPinjamModal items={baseItems} onClose={() => {}} />);
    await user.click(screen.getByText(/Bagikan/));
    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    clickSpy.mockRestore();
  });

  it("shows Tanggal field with formatted date", () => {
    render(<SuratJalanPinjamModal items={baseItems} onClose={() => {}} />);
    // Component renders fmtDate(rep.tanggal) with label "Tanggal:"
    expect(screen.getByText(/Tanggal:/)).toBeInTheDocument();
  });

  it("single item without catatan does not show Catatan section", () => {
    render(<SuratJalanPinjamModal items={[{ ...baseItems[0], catatan: null }]} onClose={() => {}} />);
    expect(screen.queryByText("Keterangan:")).not.toBeInTheDocument();
  });
});
