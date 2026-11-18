import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));

const mockUseCmtJahitKirim = vi.fn();
const mockBatalKirim = vi.fn();
vi.mock("../hooks", () => ({
  useCmtJahitKirim: (...a) => mockUseCmtJahitKirim(...a),
  useBatalKirimCmtJahit: () => mockBatalKirim,
}));

vi.mock("./KirimForm", () => ({
  default: ({ onClose }) => (
    <div data-testid="kirim-form">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));
vi.mock("./SetorModal", () => ({
  default: ({ group, onClose }) => (
    <div data-testid="setor-modal">
      <span>{group.namaVendor}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

import CmtJahitTab from "./CmtJahitTab";

const ROW = (o) => ({
  id: "r1",
  kirim_no: "CMT-1",
  nama_vendor: "Vendor A",
  kode_produk: "D-01-OSK",
  size: "Midi",
  warna: "HITAM",
  qty: 10,
  qty_setor: null,
  harga_upah: 7000,
  status: "dikirim",
  tanggal_kirim: "2026-11-18",
  estimasi_selesai: null,
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCmtJahitKirim.mockReturnValue({ rows: [ROW({})], loading: false });
  mockBatalKirim.mockResolvedValue(undefined);
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});

describe("CmtJahitTab", () => {
  it("menampilkan grup kirim dari rows", () => {
    render(<CmtJahitTab />);
    expect(screen.getByText("Vendor A")).toBeInTheDocument();
    expect(screen.getByText(/CMT-1/)).toBeInTheDocument();
  });

  it("loading -> teks Memuat", () => {
    mockUseCmtJahitKirim.mockReturnValue({ rows: [], loading: true });
    render(<CmtJahitTab />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("kosong -> teks belum ada pengiriman", () => {
    mockUseCmtJahitKirim.mockReturnValue({ rows: [], loading: false });
    render(<CmtJahitTab />);
    expect(screen.getByText(/Belum ada pengiriman/)).toBeInTheDocument();
  });

  it("status dikirim -> tombol Setor & Batalkan muncul", () => {
    render(<CmtJahitTab />);
    expect(screen.getByText("Setor")).toBeInTheDocument();
    expect(screen.getByText("Batalkan")).toBeInTheDocument();
  });

  it("status selain dikirim -> tombol aksi tidak muncul", () => {
    mockUseCmtJahitKirim.mockReturnValue({
      rows: [ROW({ status: "setor", qty_setor: 10 })],
      loading: false,
    });
    render(<CmtJahitTab />);
    expect(screen.queryByText("Setor")).toBeNull();
    expect(screen.queryByText("Batalkan")).toBeNull();
  });

  it("klik + Kirim Potongan ke CMT membuka KirimForm", () => {
    render(<CmtJahitTab />);
    fireEvent.click(screen.getByText("+ Kirim Potongan ke CMT"));
    expect(screen.getByTestId("kirim-form")).toBeInTheDocument();
  });

  it("klik Setor membuka SetorModal dengan grup yang benar", () => {
    render(<CmtJahitTab />);
    fireEvent.click(screen.getByText("Setor"));
    expect(screen.getByTestId("setor-modal")).toBeInTheDocument();
  });

  it("klik Batalkan (confirm true) memanggil batalKirim dgn id baris yg belum selesai", async () => {
    render(<CmtJahitTab />);
    fireEvent.click(screen.getByText("Batalkan"));
    await vi.waitFor(() =>
      expect(mockBatalKirim).toHaveBeenCalledWith({ kirimNo: "CMT-1", ids: ["r1"] }),
    );
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("klik Batalkan (confirm false) tidak memanggil batalKirim", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    render(<CmtJahitTab />);
    fireEvent.click(screen.getByText("Batalkan"));
    expect(mockBatalKirim).not.toHaveBeenCalled();
  });

  it("batalKirim gagal -> toast.error", async () => {
    mockBatalKirim.mockRejectedValueOnce(new Error("gagal jaringan"));
    render(<CmtJahitTab />);
    fireEvent.click(screen.getByText("Batalkan"));
    await vi.waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("gagal jaringan")),
    );
  });
});
