import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const useHistoryByKodeMock = vi.fn();
const useSalesDetailByKodeMock = vi.fn();
vi.mock("../../history/hooks", () => ({ useHistoryByKode: (...a) => useHistoryByKodeMock(...a) }));
vi.mock("../../produk/hooks", () => ({ useSalesDetailByKode: (...a) => useSalesDetailByKodeMock(...a) }));

const { default: RiwayatSelisihModal } = await import("./RiwayatSelisihModal");

describe("RiwayatSelisihModal", () => {
  it("menampilkan loading selagi salah satu sumber masih memuat", () => {
    useHistoryByKodeMock.mockReturnValue({ history: [], loading: true });
    useSalesDetailByKodeMock.mockReturnValue({ data: [], isLoading: false });
    render(<RiwayatSelisihModal kode="D-01" nama="Gamis A" selisih={-2} onClose={vi.fn()} />);
    expect(screen.getByText(/Memuat riwayat/)).toBeInTheDocument();
  });

  it("menampilkan pesan kosong kalau tidak ada riwayat sama sekali", () => {
    useHistoryByKodeMock.mockReturnValue({ history: [], loading: false });
    useSalesDetailByKodeMock.mockReturnValue({ data: [], isLoading: false });
    render(<RiwayatSelisihModal kode="D-01" nama="Gamis A" selisih={-2} onClose={vi.fn()} />);
    expect(screen.getByText(/Belum ada riwayat/)).toBeInTheDocument();
  });

  it("menggabungkan riwayat admin & penjualan jadi satu linimasa terurut terbaru dulu", () => {
    useHistoryByKodeMock.mockReturnValue({
      history: [
        { changed_at: "2026-01-01T00:00:00Z", action: "transfer-approve", user_name: "Admin A" },
      ],
      loading: false,
    });
    useSalesDetailByKodeMock.mockReturnValue({
      data: [{ created_at: "2026-01-02T00:00:00Z", qty: 3, location: "gudang", buyer_name: "Budi" }],
      isLoading: false,
    });
    render(<RiwayatSelisihModal kode="D-01" nama="Gamis A" selisih={3} onClose={vi.fn()} />);

    const entries = screen.getAllByText(/Disetujui|Penjualan/);
    expect(entries[0]).toHaveTextContent("Penjualan");
    expect(entries[1]).toHaveTextContent("Disetujui");
    expect(screen.getByText(/3 pcs · gudang · Budi/)).toBeInTheDocument();
    expect(screen.getByText("oleh Admin A")).toBeInTheDocument();
  });

  it("header menampilkan kode, nama, dan selisih", () => {
    useHistoryByKodeMock.mockReturnValue({ history: [], loading: false });
    useSalesDetailByKodeMock.mockReturnValue({ data: [], isLoading: false });
    render(<RiwayatSelisihModal kode="D-01" nama="Gamis A" selisih={-4} onClose={vi.fn()} />);
    expect(screen.getByText("Riwayat D-01")).toBeInTheDocument();
    expect(screen.getByText(/selisih -4 pcs/)).toBeInTheDocument();
  });

  it("tombol Tutup memanggil onClose", () => {
    useHistoryByKodeMock.mockReturnValue({ history: [], loading: false });
    useSalesDetailByKodeMock.mockReturnValue({ data: [], isLoading: false });
    const onClose = vi.fn();
    render(<RiwayatSelisihModal kode="D-01" nama="Gamis A" selisih={1} onClose={onClose} />);
    fireEvent.click(screen.getByText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });
});
