import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SuratJalanPengiriman from "./SuratJalanPengiriman";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));

import { toPng } from "html-to-image";

const basePengiriman = {
  id: "pg1",
  pengiriman_no: "KRM-20260824-123",
  tanggal: "2026-08-24",
  nama_penerima: "Budi Santoso",
  no_telp_penerima: "081234567",
  alamat: "Jl. Mawar No. 1, Jakarta",
  jumlah_karung: 5,
  isi_karung: "Gamis dan mukena campur",
  nama_ekspedisi: "JNE",
  nama_pengirim: "Siti",
  created_by_name: "ADMIN SATU",
  created_at: "2026-08-24T10:00:00.000Z",
};

function setup(overrides = {}) {
  const onClose = vi.fn();
  const pengiriman = { ...basePengiriman, ...overrides };
  const utils = render(<SuratJalanPengiriman pengiriman={pengiriman} onClose={onClose} />);
  return { onClose, pengiriman, ...utils };
}

describe("SuratJalanPengiriman", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toPng.mockResolvedValue("data:image/png;base64,TESTDATA");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = undefined;
    try {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
    } catch (_) {
      // ignore
    }
  });

  it("returns null saat pengiriman null", () => {
    const { container } = render(<SuratJalanPengiriman pengiriman={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("menampilkan nomor pengiriman di header modal", () => {
    setup();
    expect(screen.getAllByText("KRM-20260824-123").length).toBeGreaterThan(0);
  });

  it("menampilkan field-field pengiriman di dalam dokumen", () => {
    setup();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("081234567")).toBeInTheDocument();
    expect(screen.getByText("Jl. Mawar No. 1, Jakarta")).toBeInTheDocument();
    expect(screen.getByText("JNE")).toBeInTheDocument();
    // Jumlah karung ditampilkan UPPERCASE ("5 KARUNG", permintaan Denny —
    // konsisten dgn perubahan uppercase di PengirimanCard.jsx).
    expect(screen.getByText("5 KARUNG")).toBeInTheDocument();
    expect(screen.getByText("Gamis dan mukena campur")).toBeInTheDocument();
    expect(screen.getByText("Siti")).toBeInTheDocument();
  });

  it("menampilkan '-' pada baris Alamat saat pengiriman.alamat kosong", () => {
    setup({ alamat: null });
    expect(screen.getByText("Alamat")).toBeInTheDocument();
    // Row fallback "-" dipakai baris Alamat sekaligus No. Telp/Isi Karung
    // kalau turut kosong — pastikan minimal satu "-" muncul dgn alamat null.
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  describe("logo mengikuti pengirim (DEERA/MARYAM/Manual, permintaan Denny 2026-08)", () => {
    it("nama_pengirim 'DEERA' → tampilkan logo.png + logo-deera.png", () => {
      setup({ nama_pengirim: "DEERA" });
      expect(screen.getByAltText("DEERA")).toHaveAttribute("src", "/logo-deera.png");
      // Icon polos (logo.png) pakai alt="" — cari lewat img src langsung.
      const iconImg = document.querySelector('img[src="/logo.png"]');
      expect(iconImg).not.toBeNull();
      expect(document.querySelector('img[src="/logo-maryam.svg"]')).toBeNull();
    });

    it("nama_pengirim 'MARYAM CIDENG' → tampilkan logo-maryam.svg, TANPA logo.png/logo-deera.png", () => {
      setup({ nama_pengirim: "MARYAM CIDENG" });
      expect(screen.getByAltText("MARYAM")).toHaveAttribute("src", "/logo-maryam.svg");
      expect(document.querySelector('img[src="/logo.png"]')).toBeNull();
      expect(document.querySelector('img[src="/logo-deera.png"]')).toBeNull();
    });

    it("nama_pengirim manual (bukan DEERA/MARYAM) → TANPA logo sama sekali", () => {
      setup({ nama_pengirim: "Siti" });
      expect(document.querySelector('img[src="/logo.png"]')).toBeNull();
      expect(document.querySelector('img[src="/logo-deera.png"]')).toBeNull();
      expect(document.querySelector('img[src="/logo-maryam.svg"]')).toBeNull();
      // Judul dokumen tetap tampil walau tanpa logo.
      expect(screen.getByText("Surat Jalan Pengiriman")).toBeInTheDocument();
    });
  });

  it("default toggle lebar kertas 78mm aktif", () => {
    setup();
    const btn78 = screen.getByText("78mm");
    expect(btn78.className).toMatch(/text-\[#CAB170\]/);
  });

  it("bisa ganti ke 100mm", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("100mm"));
    expect(screen.getByText("100mm").className).toMatch(/text-\[#CAB170\]/);
  });

  it("memanggil onClose saat ✕/Tutup/backdrop diklik", async () => {
    const user = userEvent.setup();
    const { onClose, container } = setup();
    await user.click(screen.getByText("✕"));
    await user.click(screen.getByText("Tutup"));
    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("Unduh memanggil toPng dan trigger anchor .click() dgn filename benar", async () => {
    let capturedAnchor = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") capturedAnchor = el;
      return el;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Unduh"));

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(capturedAnchor?.download).toBe("surat-jalan-KRM-20260824-123.png"));
  });

  it("Bagikan memanggil navigator.share saat tersedia", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(["data"], { type: "image/png" })),
    });
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: shareMock });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });

    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Bagikan"));

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
  });

  it("Bagikan fallback ke download saat navigator.share tidak tersedia", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(["data"], { type: "image/png" })),
    });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Bagikan"));

    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
  });
});
