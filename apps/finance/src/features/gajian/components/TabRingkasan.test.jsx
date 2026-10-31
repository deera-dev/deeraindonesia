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
  useFinalizeGajian: () => mockFinalize,
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

import TabRingkasan from "./TabRingkasan";

describe("TabRingkasan (hanya melihat data)", () => {
  it("menampilkan Total Gaji, total mingguan & rincian per karyawan", () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.getByText("Total Gaji")).toBeInTheDocument();
    expect(screen.getByText("Total Mingguan")).toBeInTheDocument();
    expect(screen.getByText("Rp7895800")).toBeInTheDocument();
    expect(screen.getByTestId("per-karyawan")).toBeInTheDocument();
  });

  it("TIDAK ada form input (switch pettycash, Beli Gas, ATK, tombol simpan)", () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByLabelText("Persiapan ATK")).toBeNull();
    expect(screen.queryByText("Simpan sebagai Draft")).toBeNull();
  });

  it("menampilkan baris tambahan (Beli Gas, ATK) yang diisi di tab Tambahan", () => {
    values = baseValues({
      fullTambahan: [
        { label: "Beli Gas", jumlah: 100000 },
        { label: "Persiapan ATK", jumlah: 45000 },
      ],
    });
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.getByText("+ Beli Gas")).toBeInTheDocument();
    expect(screen.getByText("+ Persiapan ATK")).toBeInTheDocument();
  });

  it("compact (panel samping): hanya total, tanpa rincian karyawan & tombol", () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} compact />);
    expect(screen.getByText("Total Mingguan")).toBeInTheDocument();
    expect(screen.queryByTestId("per-karyawan")).toBeNull();
    expect(screen.queryByText("Finalisasi Gajian")).toBeNull();
  });

  it("calls finalizeGajian on Finalisasi lalu bersihkan draft lokal", async () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("Finalisasi Gajian"));
    await waitFor(() =>
      expect(mockFinalize).toHaveBeenCalledWith(
        expect.objectContaining({ id: "g1" }),
        expect.any(Object),
      ),
    );
    expect(mockToast.success).toHaveBeenCalled();
    expect(mockClearDraft).toHaveBeenCalled();
  });

  it("shows error toast when finalize throws", async () => {
    mockFinalize.mockRejectedValueOnce(new Error("err"));
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("Finalisasi Gajian"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: err"));
  });

  it("does not render finalisasi button when status=final (tampil ✓ Final)", () => {
    values = baseValues({ isFinal: true, totalGaji: 5000000, totalRequest: 4800000 });
    render(<TabRingkasan gajianId="g1" gajian={gajianFinal} />);
    expect(screen.queryByText("Finalisasi Gajian")).toBeNull();
    expect(screen.getByText("✓ Final")).toBeInTheDocument();
  });

  it("opens & closes ShareModal", () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("📤 Bagikan Ringkasan"));
    expect(screen.getByTestId("share-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("CloseShare"));
    expect(screen.queryByTestId("share-modal")).toBeNull();
  });
});
