import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url, opts) => `cld:${url}:w${opts?.width ?? ""}`,
}));

vi.mock("@deera/shared/lib/bepUtils", () => ({
  localDateStr: () => "2026-08-25",
}));

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));

// JSZip di-mock total — tujuan test ini adalah memverifikasi BulkSaveImageModal
// memanggil zip.file() per produk lalu zip.generateAsync() SATU kali di akhir
// (bukan trigger unduhan berulang per produk), bukan menguji JSZip itu sendiri.
// zipFileMock/zipGenerateAsyncMock dideklarasikan via vi.hoisted supaya bisa
// diakses baik dari dalam factory vi.mock() maupun dari body test di bawah.
const { zipFileMock, zipGenerateAsyncMock } = vi.hoisted(() => ({
  zipFileMock: vi.fn(),
  zipGenerateAsyncMock: vi.fn(),
}));

vi.mock("jszip", () => ({
  default: class FakeJSZip {
    file(...args) {
      zipFileMock(...args);
    }
    generateAsync(...args) {
      return zipGenerateAsyncMock(...args);
    }
  },
}));

import { toPng } from "html-to-image";
import BulkSaveImageModal from "./BulkSaveImageModal";

const PRODUCTS = [
  {
    kode: "D-01-OSK",
    nama: "Gamis A",
    image: "a.jpg",
    variants: [{ size: "Midi", harga: 280000 }],
  },
  {
    kode: "D-02-SFN",
    nama: "Mukena B",
    image: null,
    variants: [],
  },
  {
    kode: "D-03-KTN",
    nama: "Gamis C",
    image: "c.jpg",
    variants: [
      { size: "Gamis", harga: 0 },
      { size: "Gamis Jumbo", harga: 320000 },
    ],
  },
];

// jsdom TIDAK PERNAH benar-benar memuat <img> (tidak ada network stack),
// jadi event "load"/"error" tidak pernah terpicu secara alami — kalau
// dibiarkan, waitForCardImages() di BulkSaveImageModal.jsx akan menunggu
// selamanya utk setiap produk yang punya foto. Paksa `complete` selalu
// true di sini supaya proses ekspor lanjut tanpa perlu event nyata.
let originalImgCompleteDescriptor;

beforeEach(() => {
  toPng.mockReset().mockResolvedValue("data:image/png;base64,TESTDATA");
  zipFileMock.mockReset();
  zipGenerateAsyncMock.mockReset().mockResolvedValue(new Blob(["zip-content"]));

  // jsdom tidak implement URL.createObjectURL/revokeObjectURL sama sekali.
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();

  originalImgCompleteDescriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "complete",
  );
  Object.defineProperty(HTMLImageElement.prototype, "complete", {
    configurable: true,
    get() {
      return true;
    },
  });
});

afterEach(() => {
  if (originalImgCompleteDescriptor) {
    Object.defineProperty(HTMLImageElement.prototype, "complete", originalImgCompleteDescriptor);
  }
  // Beberapa test mem-vi.spyOn(document, "createElement") — WAJIB
  // restoreAllMocks supaya spy tidak saling membungkus antar test (pola
  // sama seperti ProductCodeImageModal.test.jsx / SuratJalanPengiriman.test.jsx).
  vi.restoreAllMocks();
});

function renderModal(props = {}) {
  return render(
    <BulkSaveImageModal products={PRODUCTS} onClose={vi.fn()} onSaved={vi.fn()} {...props} />,
  );
}

describe("BulkSaveImageModal", () => {
  it("menampilkan semua produk sebagai daftar pilihan", () => {
    renderModal();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("D-02-SFN")).toBeInTheDocument();
    expect(screen.getByText("D-03-KTN")).toBeInTheDocument();
  });

  it("menampilkan '0 produk dipilih' di awal, tombol unduh disabled", () => {
    renderModal();
    expect(screen.getByText("0 produk dipilih")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unduh Gambar \(0\)/ })).toBeDisabled();
  });

  it("klik satu produk menambah pilihan & mengaktifkan tombol unduh", () => {
    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    expect(screen.getByText("1 produk dipilih")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unduh Gambar \(1\)/ })).not.toBeDisabled();
  });

  it("klik produk yang sudah dipilih membatalkan pilihan (toggle)", () => {
    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByText("D-01-OSK"));
    expect(screen.getByText("0 produk dipilih")).toBeInTheDocument();
  });

  it("search box memfilter daftar produk berdasarkan kode atau nama", () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Cari kode atau nama/), {
      target: { value: "mukena" },
    });
    expect(screen.getByText("D-02-SFN")).toBeInTheDocument();
    expect(screen.queryByText("D-01-OSK")).toBeNull();
  });

  it("'Pilih Semua' memilih semua produk yang sedang tampil", () => {
    renderModal();
    fireEvent.click(screen.getByText("Pilih Semua"));
    expect(screen.getByText("3 produk dipilih")).toBeInTheDocument();
  });

  it("'Hapus Pilihan' mengosongkan seluruh pilihan", () => {
    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByText("Hapus Pilihan"));
    expect(screen.getByText("0 produk dipilih")).toBeInTheDocument();
  });

  it("klik Batal memanggil onClose tanpa proses unduh", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onClose).toHaveBeenCalled();
    expect(toPng).not.toHaveBeenCalled();
    expect(zipGenerateAsyncMock).not.toHaveBeenCalled();
  });

  it("unduh: memasukkan tiap produk terpilih ke zip dgn nama file kode+ukuran, lalu unduh SATU file .zip", async () => {
    const capturedAnchors = [];
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") capturedAnchors.push(el);
      return el;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByText("D-03-KTN"));
    fireEvent.click(screen.getByRole("button", { name: /Unduh Gambar \(2\)/ }));

    await waitFor(() => expect(zipGenerateAsyncMock).toHaveBeenCalledTimes(1));

    // Nama file per produk di dalam zip (harga 0 pada "Gamis" difilter,
    // pakai varian berikutnya yg berharga).
    expect(zipFileMock.mock.calls.map((c) => c[0])).toEqual([
      "D-01-OSK-Midi.png",
      "D-03-KTN-GamisJumbo.png",
    ]);
    expect(zipFileMock.mock.calls[0][2]).toEqual({ base64: true });

    // Hanya SATU anchor <a> yg di-klik utk trigger unduhan (file .zip),
    // bukan satu anchor per produk seperti implementasi awal.
    expect(capturedAnchors).toHaveLength(1);
    expect(capturedAnchors[0].download).toBe("simpan-gambar-2026-08-25.zip");
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("produk tanpa varian berharga: nama file di zip tanpa suffix ukuran", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderModal();
    fireEvent.click(screen.getByText("D-02-SFN"));
    fireEvent.click(screen.getByRole("button", { name: /Unduh Gambar \(1\)/ }));

    await waitFor(() => expect(zipGenerateAsyncMock).toHaveBeenCalledTimes(1));
    expect(zipFileMock).toHaveBeenCalledWith("D-02-SFN.png", expect.any(String), {
      base64: true,
    });
  });

  it("proses selesai: memanggil onSaved dengan jumlah produk & onClose", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderModal({ onSaved, onClose });
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByRole("button", { name: /Unduh Gambar \(1\)/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(1));
    expect(onClose).toHaveBeenCalled();
  });

  it("selagi proses berjalan: menampilkan progres 'Memproses X/Y', tombol Batal & pilih produk disabled", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    let resolveToPng;
    toPng.mockImplementation(() => new Promise((resolve) => { resolveToPng = resolve; }));

    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByRole("button", { name: /Unduh Gambar \(1\)/ }));

    await waitFor(() => expect(screen.getByText(/Memproses 1\/1/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();
    expect(screen.getByText("D-01-OSK").closest("button")).toBeDisabled();

    // toPng() dipanggil setelah waitForCardImages() (yg melibatkan giliran
    // microtask/rAF) — tunggu sampai benar-benar terpanggil sebelum resolve,
    // supaya resolveToPng pasti sudah ter-assign.
    await waitFor(() => expect(toPng).toHaveBeenCalled());
    resolveToPng("data:image/png;base64,TESTDATA");
  });

  it("thumbnail fallback '—' untuk produk tanpa image", () => {
    renderModal();
    const row = screen.getByText("D-02-SFN").closest("button");
    expect(row).toHaveTextContent("—");
  });

  it("products kosong: menampilkan 'Tidak ada produk cocok', tombol unduh disabled", () => {
    renderModal({ products: [] });
    expect(screen.getByText("Tidak ada produk cocok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unduh Gambar \(0\)/ })).toBeDisabled();
  });
});
