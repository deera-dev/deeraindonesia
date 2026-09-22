import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
}));
vi.mock("./TabHeader", () => ({
  default: ({ title }) => <div><span>{title}</span></div>,
}));
vi.mock("./TotalBar", () => ({
  default: ({ label, value }) => <div data-testid="total-bar">{label}:{value}</div>,
}));
vi.mock("./FinishingForm", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="finishing-form">
      <button onClick={onClose}>Close</button>
      <button
        onClick={() =>
          onSave({
            items: [{ kode_produk: "D-07-OSK", jumlah: 20 }],
            gajianFinishingId: "gf-1",
          })
        }
      >
        Save
      </button>
      <button
        data-testid="save-zero"
        onClick={() =>
          onSave({
            items: [{ kode_produk: "D-07-OSK", jumlah: 0 }],
            gajianFinishingId: "gf-1",
          })
        }
      >
        Save (jumlah 0)
      </button>
    </div>
  ),
}));
vi.mock("./FinishingStockModal", () => ({
  default: ({ items, gajianFinishingId, onClose }) => (
    <div data-testid="finishing-stock-modal">
      <span>reconcile-items:{items.length}</span>
      <span>gajianFinishingId:{gajianFinishingId}</span>
      <button onClick={onClose}>Close reconcile</button>
    </div>
  ),
}));

const DEFAULT_FINISHING_RECORD = {
  id: "f1",
  total_upah: 250000,
  items: [
    { nama_produk: "D-07-OSK", jumlah: 20, kancing_qty: 40 },
  ],
};

const mockDeleteFinishing = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useFinishing: vi.fn(() => ({ record: DEFAULT_FINISHING_RECORD, loading: false })),
  useDeleteFinishing: vi.fn(() => mockDeleteFinishing),
}));

import { useFinishing } from "../hooks";
import TabFinishing from "./TabFinishing";

beforeEach(() => {
  vi.clearAllMocks();
  // BUGFIX (test isolation): `.mockReturnValue(...)` (dipakai di beberapa
  // test jalur CREATE di bawah, karena `record` harus stabil `null` di
  // SEMUA render selama satu urutan klik, bukan cuma render pertama seperti
  // `mockReturnValueOnce`) mengganti implementation mock secara PERMANEN —
  // `vi.clearAllMocks()` tidak meng-undo itu. Reset eksplisit di sini
  // supaya tiap test selalu mulai dari default (record sudah ada), apa pun
  // urutan/isi test sebelumnya.
  useFinishing.mockReturnValue({ record: DEFAULT_FINISHING_RECORD, loading: false });
  mockDeleteFinishing.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("TabFinishing", () => {
  it("renders Finishing title", () => {
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText("Finishing")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useFinishing.mockReturnValueOnce({ record: null, loading: true });
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows no data state when record is null", () => {
    useFinishing.mockReturnValueOnce({ record: null, loading: false });
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText("Belum ada data finishing.")).toBeInTheDocument();
  });

  it("shows + Input Finishing when no record", () => {
    useFinishing.mockReturnValueOnce({ record: null, loading: false });
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText("+ Input Finishing")).toBeInTheDocument();
  });

  it("renders record data when exists", () => {
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText(/D-07-OSK/)).toBeInTheDocument();
  });

  // Permintaan Denny 2026-09: info Lubang ikut ditampilkan di ringkasan item.
  it("menampilkan info lubang kalau pakai_lubang aktif & lubang_qty > 0", () => {
    useFinishing.mockReturnValueOnce({
      record: {
        id: "f1",
        total_upah: 250000,
        items: [
          { nama_produk: "D-07-OSK", jumlah: 20, kancing_qty: 40, pakai_lubang: true, lubang_qty: 20 },
        ],
      },
      loading: false,
    });
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText(/20 lubang/)).toBeInTheDocument();
  });

  it("TIDAK menampilkan info lubang kalau pakai_lubang false, walau lubang_qty ada nilainya", () => {
    useFinishing.mockReturnValueOnce({
      record: {
        id: "f1",
        total_upah: 250000,
        items: [
          { nama_produk: "D-07-OSK", jumlah: 20, kancing_qty: 40, pakai_lubang: false, lubang_qty: 20 },
        ],
      },
      loading: false,
    });
    render(<TabFinishing gajianId="g1" />);
    expect(screen.queryByText(/lubang/)).not.toBeInTheDocument();
  });

  it("opens form on Edit click", () => {
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("finishing-form")).toBeInTheDocument();
  });

  it("calls deleteFinishing on Hapus with confirm", async () => {
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("Hapus"));
    await waitFor(() => expect(mockDeleteFinishing).toHaveBeenCalledWith("f1"));
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("does not delete when confirm=false", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("Hapus"));
    expect(mockDeleteFinishing).not.toHaveBeenCalled();
  });

  it("opens form on + Input Finishing click", () => {
    useFinishing.mockReturnValueOnce({ record: null, loading: false });
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("+ Input Finishing"));
    expect(screen.getByTestId("finishing-form")).toBeInTheDocument();
  });
});

// Permintaan Denny 2026-09: setelah PERTAMA KALI simpan Finishing (create),
// buka modal rekonsiliasi stok Gudang otomatis kalau ada item dengan
// jumlah > 0.
//
// BUGFIX 2026-09 (laporan bug Denny): sebelumnya modal ini otomatis terbuka
// lagi juga saat entri di-EDIT (bukan cuma create) — kartu Jahit acuan
// breakdown sudah "done" dari rekonsiliasi pertama, jadi modal edit
// berikutnya muncul kosong & minta admin ketik ulang dari nol, resiko
// dobel-input & stok salah. Sekarang HANYA otomatis muncul saat create;
// saat edit tersedia tombol manual "Rekonsiliasi Stok" (lihat describe
// terpisah di bawah).
describe("TabFinishing — buka FinishingStockModal otomatis HANYA saat create (permintaan Denny 2026-09)", () => {
  it("CREATE (belum ada record): membuka FinishingStockModal otomatis dgn items (jumlah>0) + gajianFinishingId setelah simpan", () => {
    // mockReturnValue (bukan Once) — record:null harus tetap stabil di
    // SEMUA render selama urutan klik ini (termasuk re-render dari
    // setShowForm), bukan cuma render pertama, supaya isCreate ikut
    // konsisten null di semua render.
    useFinishing.mockReturnValue({ record: null, loading: false });
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("+ Input Finishing"));
    fireEvent.click(screen.getByText("Save"));
    expect(screen.queryByTestId("finishing-form")).not.toBeInTheDocument();
    const modal = screen.getByTestId("finishing-stock-modal");
    expect(modal).toBeInTheDocument();
    expect(screen.getByText("reconcile-items:1")).toBeInTheDocument();
    expect(screen.getByText("gajianFinishingId:gf-1")).toBeInTheDocument();
  });

  it("CREATE: TIDAK membuka FinishingStockModal kalau semua item jumlah <= 0", () => {
    useFinishing.mockReturnValue({ record: null, loading: false });
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("+ Input Finishing"));
    fireEvent.click(screen.getByTestId("save-zero"));
    expect(screen.queryByTestId("finishing-stock-modal")).not.toBeInTheDocument();
  });

  it("BUGFIX: EDIT (record sudah ada sebelum simpan) — TIDAK membuka FinishingStockModal otomatis", () => {
    render(<TabFinishing gajianId="g1" />); // default mock: record sudah ada
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Save"));
    expect(screen.queryByTestId("finishing-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("finishing-stock-modal")).not.toBeInTheDocument();
  });

  it("menutup FinishingStockModal ketika onClose dipanggil (jalur create)", () => {
    useFinishing.mockReturnValue({ record: null, loading: false });
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("+ Input Finishing"));
    fireEvent.click(screen.getByText("Save"));
    fireEvent.click(screen.getByText("Close reconcile"));
    expect(screen.queryByTestId("finishing-stock-modal")).not.toBeInTheDocument();
  });
});

// Tombol manual "Rekonsiliasi Stok" (permintaan Denny 2026-09, lihat bugfix
// di atas) — cara admin membuka ulang rekonsiliasi setelah edit, kalau
// memang perlu (mis. qty bertambah), TANPA menunggu auto-trigger yang sudah
// dihapus.
describe("TabFinishing — tombol manual 'Rekonsiliasi Stok'", () => {
  it("muncul di kartu entri yang sudah ada", () => {
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText("Rekonsiliasi Stok")).toBeInTheDocument();
  });

  it("tidak muncul saat belum ada record (state kosong)", () => {
    useFinishing.mockReturnValueOnce({ record: null, loading: false });
    render(<TabFinishing gajianId="g1" />);
    expect(screen.queryByText("Rekonsiliasi Stok")).not.toBeInTheDocument();
  });

  it("klik membuka FinishingStockModal dgn items record saat ini (jumlah>0) + id record sbg gajianFinishingId", () => {
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("Rekonsiliasi Stok"));
    const modal = screen.getByTestId("finishing-stock-modal");
    expect(modal).toBeInTheDocument();
    expect(screen.getByText("reconcile-items:1")).toBeInTheDocument();
    expect(screen.getByText("gajianFinishingId:f1")).toBeInTheDocument();
  });

  it("tidak membuka modal kalau semua item record jumlah <= 0", () => {
    useFinishing.mockReturnValueOnce({
      record: { id: "f1", total_upah: 0, items: [{ nama_produk: "D-07-OSK", jumlah: 0 }] },
      loading: false,
    });
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("Rekonsiliasi Stok"));
    expect(screen.queryByTestId("finishing-stock-modal")).not.toBeInTheDocument();
  });
});
