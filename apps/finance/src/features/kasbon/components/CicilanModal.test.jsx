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
const mockPayCicilan = vi.fn().mockResolvedValue({ newSisa: 400000, newStatus: "belum" });
vi.mock("../hooks", () => ({ usePayCicilan: vi.fn(() => mockPayCicilan) }));

import CicilanModal from "./CicilanModal";

const kasbon = { id: "kb1", karyawan_id: "k1", jumlah: 1000000, sisa: 700000, status: "belum" };

beforeEach(() => {
  vi.clearAllMocks();
  mockPayCicilan.mockResolvedValue({ newSisa: 400000, newStatus: "belum" });
});

describe("CicilanModal", () => {
  it("renders Bayar Cicilan title", () => {
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("Bayar Cicilan")).toBeInTheDocument();
  });

  it("shows sisa kasbon", () => {
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("Rp700000")).toBeInTheDocument();
  });

  it("shows error when jumlah is 0 on submit", async () => {
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Jumlah cicilan harus > 0."));
  });

  it("shows error when cicilan melebihi sisa", async () => {
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={vi.fn()} />);
    const input = document.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: "800000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("melebihi sisa")));
  });

  it("calls payCicilan on valid submit", async () => {
    const onSave = vi.fn();
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={onSave} />);
    const input = document.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: "300000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockPayCicilan).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows Kasbon lunas toast when newStatus=lunas", async () => {
    mockPayCicilan.mockResolvedValueOnce({ newSisa: 0, newStatus: "lunas" });
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={vi.fn()} />);
    const input = document.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: "700000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Kasbon lunas!"));
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<CicilanModal kasbon={kasbon} onClose={onClose} onSave={vi.fn()} />);
    fireEvent.click(document.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error toast when payCicilan throws", async () => {
    mockPayCicilan.mockRejectedValueOnce(new Error("DB error"));
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={vi.fn()} />);
    const input = document.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: "300000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: DB error"));
  });
});

// ── Additional branch/field coverage ─────────────────────────────────────────
describe("CicilanModal — field interactions", () => {
  it("changes tanggal field", () => {
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={vi.fn()} />);
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: "2026-06-20" } });
    expect(dateInput.value).toBe("2026-06-20");
  });

  it("changes keterangan field and submits with non-null keterangan", async () => {
    const onSave = vi.fn();
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={onSave} />);
    const numInput = document.querySelector('input[type="number"]');
    fireEvent.change(numInput, { target: { value: "300000" } });
    const ketInput = document.querySelector('input[type="text"]');
    fireEvent.change(ketInput, { target: { value: "potong gaji" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockPayCicilan).toHaveBeenCalledWith(
      expect.objectContaining({ keterangan: "potong gaji" })
    ));
    expect(onSave).toHaveBeenCalled();
  });

  it("shows jumlah fmtRp preview when jumlah entered", () => {
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={vi.fn()} />);
    const numInput = document.querySelector('input[type="number"]');
    fireEvent.change(numInput, { target: { value: "150000" } });
    expect(screen.getByText("Rp150000")).toBeInTheDocument();
  });

  it("calls onClose when × button clicked", () => {
    const onClose = vi.fn();
    render(<CicilanModal kasbon={kasbon} onClose={onClose} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows Cicilan dicatat toast when newStatus is belum", async () => {
    mockPayCicilan.mockResolvedValueOnce({ newSisa: 400000, newStatus: "belum" });
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={vi.fn()} />);
    const numInput = document.querySelector('input[type="number"]');
    fireEvent.change(numInput, { target: { value: "300000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("Cicilan dicatat")));
  });
});

describe("CicilanModal — Number(jumlah) || 0 false branch", () => {
  it("renders fmtRp(0) preview when jumlah is '0' (Number=0 is falsy)", () => {
    render(<CicilanModal kasbon={kasbon} onClose={vi.fn()} onSave={vi.fn()} />);
    const numInput = document.querySelector('input[type="number"]');
    fireEvent.change(numInput, { target: { value: "0" } });
    // "0" string is truthy so preview renders; Number("0") || 0 = 0
    expect(screen.getByText("Rp0")).toBeInTheDocument();
  });
});
