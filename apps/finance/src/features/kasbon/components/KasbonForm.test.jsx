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
const mockCreate = vi.fn().mockResolvedValue({ accumulated: false, karyawanNama: "BUDI", newJumlah: 500000 });
const mockUpdate = vi.fn().mockResolvedValue({ newSisa: 400000 });
vi.mock("../hooks", () => ({
  useCreateOrAccumulateKasbon: vi.fn(() => mockCreate),
  useUpdateKasbonJumlah: vi.fn(() => mockUpdate),
}));

import KasbonForm from "./KasbonForm";

const kList = [{ id: "k1", nama: "BUDI", tim: "jahit" }];
const existingRows = [];

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockResolvedValue({ accumulated: false, karyawanNama: "BUDI", newJumlah: 500000 });
  mockUpdate.mockResolvedValue({ newSisa: 400000 });
});

describe("KasbonForm — new", () => {
  it("renders Kasbon Baru title", () => {
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Kasbon Baru/i)).toBeInTheDocument();
  });

  it("shows error when no karyawan selected", async () => {
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Pilih karyawan."));
  });

  it("shows error when jumlah is 0", async () => {
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    const select = document.querySelector("select");
    fireEvent.change(select, { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Jumlah harus lebih dari 0."));
  });

  it("calls createOrAccumulate on valid submit", async () => {
    const onSave = vi.fn();
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={onSave} onClose={vi.fn()} />);
    const select = document.querySelector("select");
    fireEvent.change(select, { target: { value: "k1" } });
    const numInput = document.querySelector('input[type="number"]');
    if (numInput) fireEvent.change(numInput, { target: { value: "500000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows accumulated toast when accumulated=true", async () => {
    mockCreate.mockResolvedValueOnce({ accumulated: true, karyawanNama: "BUDI", newJumlah: 1000000 });
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    const select = document.querySelector("select");
    fireEvent.change(select, { target: { value: "k1" } });
    const numInput = document.querySelector('input[type="number"]');
    if (numInput) fireEvent.change(numInput, { target: { value: "500000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("Ditambahkan")));
  });
});

describe("KasbonForm — edit", () => {
  const initial = { id: "kb1", karyawan_id: "k1", jumlah: 1000000, sisa: 700000 };

  it("renders Edit Kasbon title", () => {
    render(<KasbonForm initial={initial} karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Edit Kasbon/i)).toBeInTheDocument();
  });

  it("calls updateKasbonJumlah on edit submit with new jumlah", async () => {
    const onSave = vi.fn();
    render(<KasbonForm initial={initial} karyawanList={kList} existingRows={existingRows} onSave={onSave} onClose={vi.fn()} />);
    const numInput = document.querySelector('input[type="number"]');
    if (numInput) fireEvent.change(numInput, { target: { value: "1200000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });
});

// ── Additional branch/field coverage ─────────────────────────────────────────
describe("KasbonForm — field interactions", () => {
  it("changes tanggal field", () => {
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: "2026-06-15" } });
    expect(dateInput.value).toBe("2026-06-15");
  });

  it("changes keterangan field", () => {
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    const ketInput = document.querySelector('input[type="text"]');
    fireEvent.change(ketInput, { target: { value: "keperluan darurat" } });
    expect(ketInput.value).toBe("keperluan darurat");
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={onClose} />);
    fireEvent.click(document.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows accumulation warning when karyawan already has belum kasbon", () => {
    const withBelum = [{ id: "kb1", karyawan_id: "k1", status: "belum" }];
    render(<KasbonForm karyawanList={kList} existingRows={withBelum} onSave={vi.fn()} onClose={vi.fn()} />);
    const select = document.querySelector("select");
    fireEvent.change(select, { target: { value: "k1" } });
    expect(screen.getByText(/diakumulasikan/)).toBeInTheDocument();
  });

  it("shows jumlah fmtRp preview when jumlah entered in new mode", () => {
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    const numInput = document.querySelector('input[type="number"]');
    fireEvent.change(numInput, { target: { value: "250000" } });
    expect(screen.getByText("Rp250000")).toBeInTheDocument();
  });
});

describe("KasbonForm — edit mode edge cases", () => {
  const initial = { id: "kb1", karyawan_id: "k1", jumlah: 1000000, sisa: 700000 };

  it("uses initial.jumlah when jumlah field left empty in edit mode", async () => {
    const onSave = vi.fn();
    // initial.jumlah=1000000, sisa=700000 → totalDibayar=300000; effJumlah=1000000 > 300000 → ok
    render(<KasbonForm initial={initial} karyawanList={kList} existingRows={existingRows} onSave={onSave} onClose={vi.fn()} />);
    // Don't enter jumlah — leave empty so effJumlah = initial.jumlah
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows error when effJumlah < totalDibayar", async () => {
    // initial.jumlah=1000000, sisa=700000 → totalDibayar=300000; enter 100000 < 300000
    render(<KasbonForm initial={initial} karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    const numInput = document.querySelector('input[type="number"]');
    fireEvent.change(numInput, { target: { value: "100000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("tidak boleh kurang")));
  });

  it("shows error toast when updateKasbonJumlah throws", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("DB error"));
    render(<KasbonForm initial={initial} karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    const numInput = document.querySelector('input[type="number"]');
    fireEvent.change(numInput, { target: { value: "1200000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: DB error"));
  });

  it("shows error toast when createOrAccumulate throws (new mode)", async () => {
    mockCreate.mockRejectedValueOnce(new Error("network fail"));
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    const select = document.querySelector("select");
    fireEvent.change(select, { target: { value: "k1" } });
    const numInput = document.querySelector('input[type="number"]');
    fireEvent.change(numInput, { target: { value: "500000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: network fail"));
  });
});

describe("KasbonForm — Number(jumlah) || 0 false branch", () => {
  it("renders fmtRp(0) preview when jumlah is '0'", () => {
    render(<KasbonForm karyawanList={kList} existingRows={existingRows} onSave={vi.fn()} onClose={vi.fn()} />);
    const numInput = document.querySelector('input[type="number"]');
    fireEvent.change(numInput, { target: { value: "0" } });
    // "0" is truthy string so preview shows; Number("0") || 0 = 0 covers false branch
    expect(screen.getByText("Rp0")).toBeInTheDocument();
  });
});
