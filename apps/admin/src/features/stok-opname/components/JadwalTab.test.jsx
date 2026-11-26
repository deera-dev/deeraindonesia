import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const useCycleCountDueListMock = vi.fn();
vi.mock("../hooks", () => ({ useCycleCountDueList: (...a) => useCycleCountDueListMock(...a) }));

const { default: JadwalTab } = await import("./JadwalTab");

describe("JadwalTab", () => {
  it("menampilkan loading", () => {
    useCycleCountDueListMock.mockReturnValue({ dueList: [], loading: true });
    render(<JadwalTab products={[]} loc="gudang" onPilihKode={vi.fn()} />);
    expect(screen.getByText(/Memuat jadwal/)).toBeInTheDocument();
  });

  it("menampilkan pesan kosong kalau tidak ada yang jatuh tempo", () => {
    useCycleCountDueListMock.mockReturnValue({ dueList: [], loading: false });
    render(<JadwalTab products={[]} loc="gudang" onPilihKode={vi.fn()} />);
    expect(screen.getByText(/Tidak ada kode yang jatuh tempo/)).toBeInTheDocument();
  });

  it("menampilkan daftar jatuh tempo dgn kategori & klik memanggil onPilihKode", () => {
    useCycleCountDueListMock.mockReturnValue({
      dueList: [
        { kode: "D-01-OSK", nama: "Gamis A", kategori: "A", lastCheckedAt: null, overdueBy: Infinity },
        { kode: "D-02-OSK", nama: "Gamis B", kategori: "C", lastCheckedAt: "2026-01-01T00:00:00Z", overdueBy: 5 },
      ],
      loading: false,
    });
    const onPilihKode = vi.fn();
    render(<JadwalTab products={[]} loc="gudang" onPilihKode={onPilihKode} />);

    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("Kategori A")).toBeInTheDocument();
    expect(screen.getByText("belum pernah")).toBeInTheDocument();
    expect(screen.getByText("telat 5 hari")).toBeInTheDocument();

    fireEvent.click(screen.getByText("D-02-OSK").closest("button"));
    expect(onPilihKode).toHaveBeenCalledWith("D-02-OSK");
  });
});
