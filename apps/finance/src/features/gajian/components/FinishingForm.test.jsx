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
  useFinanceConfig: vi.fn(() => ({
    config: { upah_finishing: 2000, harga_kancing: 500 },
  })),
}));
const mockSaveFinishing = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useProdukList: vi.fn(() => ({ produkList: [{ kode: "D-07-OSK", nama: "Gamis" }] })),
  useSaveFinishing: vi.fn(() => mockSaveFinishing),
}));
vi.mock("../utils", () => ({
  calcFinishingPerPcs: vi.fn(() => 2500),
  calcUpahFinishing: vi.fn(() => 50000),
  newProduk: vi.fn(() => ({ kode_produk: "", nama_produk: "", jumlah: "", kancing_qty: "" })),
}));

import FinishingForm from "./FinishingForm";

beforeEach(() => { vi.clearAllMocks(); mockSaveFinishing.mockResolvedValue(undefined); });

describe("FinishingForm", () => {
  it("renders Finishing modal", () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId("modal")).toBeInTheDocument();
  });

  it("calls saveFinishing on submit", async () => {
    const onSave = vi.fn();
    render(<FinishingForm gajianId="g1" onSave={onSave} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveFinishing).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows success toast", async () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Data Finishing disimpan."));
  });

  it("shows error toast when save throws", async () => {
    mockSaveFinishing.mockRejectedValueOnce(new Error("err"));
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: err"));
  });
});

describe("FinishingForm — pilih produk by kode", () => {
  it("selects produk by kode and derives nama_produk for payload", async () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    const select = document.querySelector("select");
    fireEvent.change(select, { target: { value: "D-07-OSK" } });
    const jumlahInput = document.querySelectorAll('input[type="number"]')[0];
    fireEvent.change(jumlahInput, { target: { value: "5" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveFinishing).toHaveBeenCalled());
    const { payload } = mockSaveFinishing.mock.calls[0][0];
    expect(payload.items[0].kode_produk).toBe("D-07-OSK");
    expect(payload.items[0].nama_produk).toBe("Gamis");
  });

  it("shows kode — nama option format in produk select", () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("D-07-OSK — Gamis")).toBeInTheDocument();
  });
});
