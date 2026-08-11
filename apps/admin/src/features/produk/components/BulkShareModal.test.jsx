import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@deera/shared/lib/cloudinary", () => ({ cldUrl: (url) => url }));

const shareProductsViaWAMock = vi.fn();
vi.mock("../utils", () => ({
  shareProductsViaWA: (...a) => shareProductsViaWAMock(...a),
}));

import BulkShareModal from "./BulkShareModal";

const PRODUCTS = [
  { kode: "D-01-OSK", nama: "Gamis A", image: "a.jpg" },
  { kode: "D-02-SFN", nama: "Mukena B", image: null },
  { kode: "D-03-KTN", nama: "Gamis C", image: "c.jpg" },
];

beforeEach(() => {
  shareProductsViaWAMock.mockReset().mockResolvedValue({ method: "share-file" });
});

function renderModal(props = {}) {
  return render(
    <BulkShareModal products={PRODUCTS} onClose={vi.fn()} onShared={vi.fn()} {...props} />,
  );
}

describe("BulkShareModal", () => {
  it("menampilkan semua produk sebagai daftar pilihan", () => {
    renderModal();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("D-02-SFN")).toBeInTheDocument();
    expect(screen.getByText("D-03-KTN")).toBeInTheDocument();
  });

  it("menampilkan '0 produk dipilih' di awal", () => {
    renderModal();
    expect(screen.getByText("0 produk dipilih")).toBeInTheDocument();
  });

  it("tombol kirim disabled saat belum ada produk dipilih", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /Kirim ke WhatsApp \(0\)/ })).toBeDisabled();
  });

  it("klik satu produk menambah pilihan & mengaktifkan tombol kirim", () => {
    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    expect(screen.getByText("1 produk dipilih")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kirim ke WhatsApp \(1\)/ })).not.toBeDisabled();
  });

  it("klik produk yang sudah dipilih membatalkan pilihan (toggle)", () => {
    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    expect(screen.getByText("1 produk dipilih")).toBeInTheDocument();
    fireEvent.click(screen.getByText("D-01-OSK"));
    expect(screen.getByText("0 produk dipilih")).toBeInTheDocument();
  });

  it("search box memfilter daftar produk berdasarkan kode atau nama (case-insensitive)", () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Cari kode atau nama/), { target: { value: "mukena" } });
    expect(screen.getByText("D-02-SFN")).toBeInTheDocument();
    expect(screen.queryByText("D-01-OSK")).toBeNull();
    expect(screen.queryByText("D-03-KTN")).toBeNull();
  });

  it("search tidak match: menampilkan 'Tidak ada produk cocok'", () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Cari kode atau nama/), { target: { value: "zzz" } });
    expect(screen.getByText("Tidak ada produk cocok")).toBeInTheDocument();
  });

  it("'Pilih Semua' memilih semua produk yang SEDANG TAMPIL (hasil filter search)", () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(/Cari kode atau nama/), { target: { value: "gamis" } });
    fireEvent.click(screen.getByText("Pilih Semua"));
    // Gamis A + Gamis C = 2 (Mukena B tidak tersaring, tidak ikut terpilih)
    expect(screen.getByText("2 produk dipilih")).toBeInTheDocument();
  });

  it("tombol 'Pilih Semua' berubah jadi 'Batal Pilih Semua' saat semua yang tampil sudah terpilih", () => {
    renderModal();
    fireEvent.click(screen.getByText("Pilih Semua"));
    expect(screen.getByText("Batal Pilih Semua")).toBeInTheDocument();
  });

  it("'Hapus Pilihan' mengosongkan seluruh pilihan", () => {
    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByText("D-02-SFN"));
    expect(screen.getByText("2 produk dipilih")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Hapus Pilihan"));
    expect(screen.getByText("0 produk dipilih")).toBeInTheDocument();
  });

  it("'Hapus Pilihan' TIDAK muncul saat belum ada yang dipilih", () => {
    renderModal();
    expect(screen.queryByText("Hapus Pilihan")).toBeNull();
  });

  it("klik Batal memanggil onClose tanpa mengirim", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onClose).toHaveBeenCalled();
    expect(shareProductsViaWAMock).not.toHaveBeenCalled();
  });

  it("kirim: memanggil shareProductsViaWA HANYA dengan produk yang dipilih (bukan semua produk)", async () => {
    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByText("D-03-KTN"));
    fireEvent.click(screen.getByRole("button", { name: /Kirim ke WhatsApp \(2\)/ }));

    await waitFor(() => expect(shareProductsViaWAMock).toHaveBeenCalled());
    const sentProducts = shareProductsViaWAMock.mock.calls[0][0];
    expect(sentProducts.map((p) => p.kode)).toEqual(["D-01-OSK", "D-03-KTN"]);
  });

  it("kirim sukses (method share-file): memanggil onShared dengan jumlah produk & onClose", async () => {
    const onShared = vi.fn();
    const onClose = vi.fn();
    shareProductsViaWAMock.mockResolvedValue({ method: "share-file", fileCount: 2 });
    renderModal({ onShared, onClose });
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByText("D-02-SFN"));
    fireEvent.click(screen.getByRole("button", { name: /Kirim ke WhatsApp \(2\)/ }));

    await waitFor(() => expect(onShared).toHaveBeenCalledWith(2));
    expect(onClose).toHaveBeenCalled();
  });

  it("kirim sukses (method wa-link, fallback text-only): tetap dianggap berhasil, modal ditutup", async () => {
    const onShared = vi.fn();
    const onClose = vi.fn();
    shareProductsViaWAMock.mockResolvedValue({ method: "wa-link" });
    renderModal({ onShared, onClose });
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByRole("button", { name: /Kirim ke WhatsApp \(1\)/ }));

    await waitFor(() => expect(onShared).toHaveBeenCalledWith(1));
    expect(onClose).toHaveBeenCalled();
  });

  it("method 'aborted' (user batal di share sheet): modal TETAP terbuka, pilihan tidak hilang, TIDAK toast", async () => {
    const onShared = vi.fn();
    const onClose = vi.fn();
    shareProductsViaWAMock.mockResolvedValue({ method: "aborted" });
    renderModal({ onShared, onClose });
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByRole("button", { name: /Kirim ke WhatsApp \(1\)/ }));

    await waitFor(() => expect(shareProductsViaWAMock).toHaveBeenCalled());
    expect(onShared).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("1 produk dipilih")).toBeInTheDocument();
  });

  it("method 'busy': menampilkan pesan error inline, modal tetap terbuka", async () => {
    shareProductsViaWAMock.mockResolvedValue({ method: "busy" });
    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByRole("button", { name: /Kirim ke WhatsApp \(1\)/ }));

    await waitFor(() =>
      expect(screen.getByText(/Masih ada proses share yang berjalan/)).toBeInTheDocument(),
    );
  });

  it("tombol kirim menampilkan 'Mengirim...' selagi proses berjalan", async () => {
    let resolveShare;
    shareProductsViaWAMock.mockImplementation(
      () => new Promise((resolve) => { resolveShare = resolve; }),
    );
    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByRole("button", { name: /Kirim ke WhatsApp \(1\)/ }));

    await waitFor(() => expect(screen.getByText("Mengirim...")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Mengirim..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();

    resolveShare({ method: "share-file" });
    await waitFor(() => expect(screen.queryByText("Mengirim...")).toBeNull());
  });

  it("klik tombol kirim tidak melakukan apa-apa saat sending sudah berjalan (guard ganda-klik)", async () => {
    let resolveShare;
    shareProductsViaWAMock.mockImplementation(
      () => new Promise((resolve) => { resolveShare = resolve; }),
    );
    renderModal();
    fireEvent.click(screen.getByText("D-01-OSK"));
    const sendBtn = screen.getByRole("button", { name: /Kirim ke WhatsApp \(1\)/ });
    fireEvent.click(sendBtn);
    await waitFor(() => expect(shareProductsViaWAMock).toHaveBeenCalledTimes(1));
    // Tombol sekarang disabled (sending), klik lagi tidak memicu panggilan kedua
    fireEvent.click(screen.getByRole("button", { name: "Mengirim..." }));
    expect(shareProductsViaWAMock).toHaveBeenCalledTimes(1);

    resolveShare({ method: "share-file" });
  });

  it("thumbnail fallback '—' untuk produk tanpa image", () => {
    renderModal();
    // Mukena B (D-02-SFN) tidak punya image
    const row = screen.getByText("D-02-SFN").closest("button");
    expect(row).toHaveTextContent("—");
  });

  it("products kosong: menampilkan 'Tidak ada produk cocok', tombol kirim disabled", () => {
    renderModal({ products: [] });
    expect(screen.getByText("Tidak ada produk cocok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kirim ke WhatsApp \(0\)/ })).toBeDisabled();
  });
});
