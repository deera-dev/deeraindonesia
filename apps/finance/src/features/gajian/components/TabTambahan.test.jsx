import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  inputCls: "",
  labelCls: "",
}));
vi.mock("./PerKaryawan", () => ({ default: () => <div data-testid="per-karyawan" /> }));
vi.mock("./ShareModal", () => ({
  default: ({ onClose }) => (
    <div data-testid="share-modal">
      <button onClick={onClose}>CloseShare</button>
    </div>
  ),
}));
vi.mock("../utils", () => ({
  buildKasbonDeductionsPayload: vi.fn(() => []),
  cleanTambahan: vi.fn((t) => t),
  BELI_GAS_AMOUNT: 100000,
}));

const mockSaveRequest = vi.fn().mockResolvedValue(undefined);
const mockFinalize = vi.fn().mockResolvedValue(undefined);
const mockClearDraft = vi.fn();
const setters = {
  setPettycashEnabled: vi.fn(),
  setBeliGasEnabled: vi.fn(),
  setAtkInput: vi.fn(),
  setTambahan: vi.fn(),
  setKasbonDeds: vi.fn(),
};
let values;
function baseValues(over = {}) {
  return {
    isFinal: false,
    totals: {
      gaji: 5000000,
      potong: 1000000,
      jahit: 2000000,
      finishing: 0,
      qa: 0,
      kreatif: 0,
      cmt: 0,
    },
    loadingTotals: false,
    kasbon: [],
    pettycashTerpakai: 2895800,
    loadingPettycashTerpakai: false,
    pettycashEnabled: true,
    pettycash: 2895800,
    tambahan: [],
    beliGasEnabled: false,
    atkInput: "",
    atkPrevJumlah: 0,
    atkJumlah: 0,
    kasbonDeds: {},
    fullTambahan: [],
    totalGaji: 5000000,
    sTambahan: 0,
    sKasbonDed: 0,
    totalRequest: 7895800,
    shareKasbonDeds: [],
    hasDraft: false,
    clearDraft: mockClearDraft,
    ...setters,
    ...over,
  };
}
vi.mock("../hooks", () => ({
  useRingkasanValues: () => values,
  useSaveGajianRequest: () => mockSaveRequest,
}));

const gajianDraft = {
  id: "g1",
  status: "draft",
  pettycash: 0,
  tambahan: [],
  kasbon_deductions: [],
};
const gajianFinal = {
  id: "g1",
  status: "final",
  total_gaji: 5000000,
  total_request: 4800000,
  pettycash: 100000,
  tambahan: [],
  kasbon_deductions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  values = baseValues();
  mockSaveRequest.mockResolvedValue(undefined);
  mockFinalize.mockResolvedValue(undefined);
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});

import TabTambahan from "./TabTambahan";

describe("TabTambahan", () => {
  it("menampilkan switch Pettycash (ON), Beli Gas Rp100.000 dan input Persiapan ATK kosong", () => {
    render(<TabTambahan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText(/Uang Denny & Wulan Terpakai/).length).toBeGreaterThan(0);
    expect(screen.getByText("Rp100000")).toBeInTheDocument();
    expect(screen.getByLabelText("Persiapan ATK")).toHaveValue(null);
  });

  it("switch mati: kotak nilai otomatis disembunyikan; klik memanggil setter", () => {
    values = baseValues({ pettycashEnabled: false, pettycash: 0 });
    render(<TabTambahan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("switch"));
    expect(setters.setPettycashEnabled).toHaveBeenCalled();
  });

  it("placeholder ATK = nilai tersimpan sebelumnya", () => {
    values = baseValues({ atkPrevJumlah: 45000 });
    render(<TabTambahan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.getByLabelText("Persiapan ATK")).toHaveAttribute("placeholder", "45000");
  });

  it("checkbox Beli Gas & ketikan ATK memanggil setter", () => {
    render(<TabTambahan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(setters.setBeliGasEnabled).toHaveBeenCalledWith(true);
    fireEvent.change(screen.getByLabelText("Persiapan ATK"), { target: { value: "60000" } });
    expect(setters.setAtkInput).toHaveBeenCalledWith("60000");
  });

  it("+ Tambah menambah baris Tambahan Lain; baris yang ada ditampilkan", () => {
    values = baseValues({ tambahan: [{ label: "Lakban", jumlah: "5000" }] });
    render(<TabTambahan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.getByDisplayValue("Lakban")).toBeInTheDocument();
    fireEvent.click(screen.getByText("+ Tambah"));
    expect(setters.setTambahan).toHaveBeenCalled();
  });

  it("Simpan sebagai Draft: menyimpan pettycash, tambahan, total; bersihkan draft lokal + toast", async () => {
    values = baseValues({ fullTambahan: [{ label: "Beli Gas", jumlah: 100000 }] });
    render(<TabTambahan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("Simpan sebagai Draft"));
    await waitFor(() =>
      expect(mockSaveRequest).toHaveBeenCalledWith("g1", {
        pettycash: 2895800,
        tambahan: [{ label: "Beli Gas", jumlah: 100000 }],
        kasbonDeductions: [],
        totalRequest: 7895800,
      }),
    );
    expect(mockClearDraft).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("gagal simpan → toast error, draft lokal TIDAK dihapus", async () => {
    mockSaveRequest.mockRejectedValueOnce(new Error("err"));
    render(<TabTambahan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("Simpan sebagai Draft"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: err"));
    expect(mockClearDraft).not.toHaveBeenCalled();
  });

  it("catatan 'belum disimpan' hanya saat ada draft lokal", () => {
    const { rerender } = render(<TabTambahan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.queryByTestId("draft-belum-disimpan")).toBeNull();
    values = baseValues({ hasDraft: true });
    rerender(<TabTambahan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.getByTestId("draft-belum-disimpan")).toBeInTheDocument();
  });

  it("potongan kasbon: tampil per karyawan & mengubah nilai", () => {
    values = baseValues({ kasbon: [{ id: "k1", sisa: 100000, karyawan: { nama: "Budi" } }] });
    render(<TabTambahan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.getByText("Budi")).toBeInTheDocument();
    fireEvent.change(
      screen.getAllByPlaceholderText("0").find((el) => el.max === "100000"),
      { target: { value: "20000" } },
    );
    expect(setters.setKasbonDeds).toHaveBeenCalled();
  });

  it("status final: form disembunyikan, tampil pesan", () => {
    values = baseValues({ isFinal: true });
    render(<TabTambahan gajianId="g1" gajian={gajianFinal} />);
    expect(screen.getByText(/sudah final/)).toBeInTheDocument();
    expect(screen.queryByText("Simpan sebagai Draft")).toBeNull();
  });
});
