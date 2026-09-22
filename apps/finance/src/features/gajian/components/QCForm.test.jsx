import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  inputCls: "",
  labelCls: "",
}));
vi.mock("./Modal", () => ({
  Modal: ({ title, onClose, children }) => (
    <div data-testid="modal">
      <span>{title}</span>
      <button onClick={onClose}>×</button>
      {children}
    </div>
  ),
  ModalFooter: ({ onCancel, saving, saveLabel = "Simpan" }) => (
    <div>
      <button type="button" onClick={onCancel} disabled={saving}>Batal</button>
      <button type="submit" disabled={saving}>{saving ? "Menyimpan..." : saveLabel}</button>
    </div>
  ),
}));
vi.mock("./TotalBar", () => ({
  default: ({ label, value }) => <div data-testid="total-bar">{value}</div>,
}));
vi.mock("../../pengaturan/hooks", () => ({
  useFinanceConfig: vi.fn(() => ({ config: { tarif_qc: 1500 } })),
}));
const mockSaveQC = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useProdukList: vi.fn(() => ({ produkList: [{ kode: "D-07-OSK", nama: "Gamis" }] })),
  useSaveQC: vi.fn(() => mockSaveQC),
  // Auto-isi Jumlah QC dari total Finishing periode ini (permintaan Denny
  // 2026-09) — default: belum ada data Finishing sama sekali.
  useFinishing: vi.fn(() => ({ record: null, loading: false })),
}));

import { useFinishing } from "../hooks";
import QCForm from "./QCForm";

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveQC.mockResolvedValue(undefined);
  useFinishing.mockReturnValue({ record: null, loading: false });
});

describe("QCForm", () => {
  it("renders Tambah QC title", () => {
    render(<QCForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Tambah QC")).toBeInTheDocument();
  });

  it("shows error when no karyawan selected", async () => {
    render(<QCForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Pilih karyawan."));
  });

  it("calls saveQC on valid submit", async () => {
    const onSave = vi.fn();
    render(<QCForm gajianId="g1" karyawanList={[{ id: "k1", nama: "RINI", tim: "qc" }]} onSave={onSave} onClose={vi.fn()} />);
    const qcSelects = document.querySelectorAll("select");
    const karyawanSelect = [...qcSelects].find((s) => s.innerHTML.includes("RINI"));
    if (karyawanSelect) fireEvent.change(karyawanSelect, { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveQC).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows success toast", async () => {
    render(<QCForm gajianId="g1" karyawanList={[{ id: "k1", nama: "RINI", tim: "qc" }]} onSave={vi.fn()} onClose={vi.fn()} />);
    const karyawanSelect = [...document.querySelectorAll("select")].find((s) => s.innerHTML.includes("RINI"));
    if (karyawanSelect) fireEvent.change(karyawanSelect, { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Entri QC disimpan."));
  });
});

describe("QCForm — pilih produk by kode", () => {
  it("selects produk by kode and derives nama_produk for payload", async () => {
    render(<QCForm gajianId="g1" karyawanList={[{ id: "k1", nama: "RINI", tim: "qc" }]} onSave={vi.fn()} onClose={vi.fn()} />);
    const selects = document.querySelectorAll("select");
    const produkSelect = [...selects].find((s) => s.innerHTML.includes("D-07-OSK"));
    const karyawanSelect = [...selects].find((s) => s.innerHTML.includes("RINI"));
    fireEvent.change(produkSelect, { target: { value: "D-07-OSK" } });
    fireEvent.change(karyawanSelect, { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveQC).toHaveBeenCalled());
    const { payload } = mockSaveQC.mock.calls[0][0];
    expect(payload.kode_produk).toBe("D-07-OSK");
    expect(payload.nama_produk).toBe("Gamis");
  });

  it("shows kode — nama option format in produk select", () => {
    render(<QCForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("D-07-OSK — Gamis")).toBeInTheDocument();
  });
});

// Permintaan Denny 2026-09: "input gajian QA, saya mau otomatis aja diambil
// dari total baju yang telah selesai di finishing... dengan opsi bisa edit".
describe("QCForm — auto-isi Jumlah QC dari total Finishing (permintaan Denny 2026-09)", () => {
  function mockFinishingItems(items) {
    useFinishing.mockReturnValue({ record: { id: "f1", items }, loading: false });
  }

  it("TAMBAH baru: jumlah QC otomatis terisi total SEMUA kode Finishing digabung (20+5+10=35)", () => {
    mockFinishingItems([
      { kode_produk: "D-01", jumlah: 20 },
      { kode_produk: "D-02", jumlah: 5 },
      { kode_produk: "D-03", jumlah: 10 },
    ]);
    render(<QCForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    const qtyInput = screen.getByLabelText("Jumlah QC (pcs)");
    expect(qtyInput.value).toBe("35");
    expect(screen.getByText(/Otomatis dari total Finishing periode ini/)).toBeInTheDocument();
    expect(screen.getByText(/35 pcs/)).toBeInTheDocument();
  });

  it("admin tetap bisa EDIT angka otomatis itu sebelum simpan", async () => {
    mockFinishingItems([{ kode_produk: "D-01", jumlah: 20 }]);
    render(<QCForm gajianId="g1" karyawanList={[{ id: "k1", nama: "RINI", tim: "qc" }]} onSave={vi.fn()} onClose={vi.fn()} />);
    const qtyInput = screen.getByLabelText("Jumlah QC (pcs)");
    expect(qtyInput.value).toBe("20");
    fireEvent.change(qtyInput, { target: { value: "18" } });
    expect(qtyInput.value).toBe("18");
    const karyawanSelect = [...document.querySelectorAll("select")].find((s) => s.innerHTML.includes("RINI"));
    fireEvent.change(karyawanSelect, { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveQC).toHaveBeenCalled());
    const { payload } = mockSaveQC.mock.calls[0][0];
    expect(payload.jumlah_pcs).toBe(18);
  });

  it("belum ada data Finishing sama sekali: TIDAK auto-isi, tetap kosong dgn placeholder 0", () => {
    render(<QCForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    const qtyInput = screen.getByLabelText("Jumlah QC (pcs)");
    expect(qtyInput.value).toBe("");
    expect(qtyInput.placeholder).toBe("0");
    expect(screen.queryByText(/Otomatis dari total Finishing/)).not.toBeInTheDocument();
  });

  it("mode EDIT (entri sudah ada): TIDAK auto-isi dari Finishing, placeholder tetap angka lama", () => {
    mockFinishingItems([{ kode_produk: "D-01", jumlah: 20 }]);
    render(
      <QCForm
        gajianId="g1"
        initial={{ id: "qc1", jumlah_pcs: 7, karyawan_id: "k1" }}
        karyawanList={[{ id: "k1", nama: "RINI", tim: "qc" }]}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const qtyInput = screen.getByLabelText("Jumlah QC (pcs)");
    expect(qtyInput.value).toBe("");
    expect(qtyInput.placeholder).toBe("7");
    expect(screen.queryByText(/Otomatis dari total Finishing/)).not.toBeInTheDocument();
  });

  it("saat kirim TANPA diedit, payload memakai angka otomatis dari Finishing", async () => {
    mockFinishingItems([
      { kode_produk: "D-01", jumlah: 20 },
      { kode_produk: "D-02", jumlah: 5 },
      { kode_produk: "D-03", jumlah: 10 },
    ]);
    render(<QCForm gajianId="g1" karyawanList={[{ id: "k1", nama: "RINI", tim: "qc" }]} onSave={vi.fn()} onClose={vi.fn()} />);
    const karyawanSelect = [...document.querySelectorAll("select")].find((s) => s.innerHTML.includes("RINI"));
    fireEvent.change(karyawanSelect, { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveQC).toHaveBeenCalled());
    const { payload } = mockSaveQC.mock.calls[0][0];
    expect(payload.jumlah_pcs).toBe(35);
  });
});
