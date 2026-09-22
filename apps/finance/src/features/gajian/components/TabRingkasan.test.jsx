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
vi.mock("./PerKaryawan", () => ({
  default: () => <div data-testid="per-karyawan" />,
}));
vi.mock("./ShareModal", () => ({
  default: ({ onClose }) => (
    <div data-testid="share-modal">
      <button onClick={onClose}>CloseShare</button>
    </div>
  ),
}));

const mockSaveRequest = vi.fn().mockResolvedValue(undefined);
const mockFinalize = vi.fn().mockResolvedValue(undefined);
const mockUsePettycashTerpakai = vi.fn(() => ({ total: 2895800, loading: false }));
vi.mock("../hooks", () => ({
  useGajianTotals: vi.fn(() => ({
    totals: { gaji: 5000000, potong: 1000000, jahit: 2000000, finishing: 0, qa: 0, kreatif: 0, cmt: 0 },
    loading: false,
  })),
  useKasbonForGajian: vi.fn(() => ({ kasbon: [] })),
  useSaveGajianRequest: vi.fn(() => mockSaveRequest),
  useFinalizeGajian: vi.fn(() => mockFinalize),
  usePettycashTerpakai: (...args) => mockUsePettycashTerpakai(...args),
}));
// Beli Gas & Persiapan ATK (permintaan Denny 2026-09) — mock diberi
// implementasi REAL-ish (bukan sekadar vi.fn kosong) supaya perilaku gabung
// tambahan/checkbox/placeholder bisa diuji end-to-end lewat komponen, sama
// seperti fungsi lain yang sudah mock-dgn-implementasi di sini
// (buildKasbonDeductionsPayload dst tetap vi.fn kosong krn tidak relevan
// diuji di file ini).
vi.mock("../utils", () => ({
  buildKasbonDeductionsPayload: vi.fn(() => []),
  calcTotalRequest: vi.fn(() => 5100000),
  cleanTambahan: vi.fn((t) => t),
  sumKasbonDeduction: vi.fn(() => 0),
  sumTambahan: vi.fn(() => 0),
  BELI_GAS_LABEL: "Beli Gas",
  BELI_GAS_AMOUNT: 100000,
  PERSIAPAN_ATK_LABEL: "Persiapan ATK",
  findTambahanByLabel: vi.fn((tambahan = [], label) => tambahan.find((t) => t.label === label) ?? null),
  otherTambahan: vi.fn((tambahan = []) =>
    tambahan.filter((t) => t.label !== "Beli Gas" && t.label !== "Persiapan ATK"),
  ),
  buildTambahanPayload: vi.fn(({ otherItems = [], beliGasEnabled = false, atkJumlah = 0 } = {}) => {
    const out = [...otherItems];
    if (beliGasEnabled) out.push({ label: "Beli Gas", jumlah: 100000 });
    const atk = Number(atkJumlah) || 0;
    if (atk > 0) out.push({ label: "Persiapan ATK", jumlah: atk });
    return out;
  }),
}));

import TabRingkasan from "./TabRingkasan";

const gajianDraft = {
  id: "g1", status: "draft", pettycash: 100000,
  tambahan: [], kasbon_deductions: [],
};
const gajianFinal = {
  id: "g1", status: "final", total_gaji: 5000000, total_request: 4800000,
  pettycash: 100000, tambahan: [], kasbon_deductions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveRequest.mockResolvedValue(undefined);
  mockFinalize.mockResolvedValue(undefined);
  mockUsePettycashTerpakai.mockReturnValue({ total: 2895800, loading: false });
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("TabRingkasan", () => {
  it("renders total gaji row", () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    expect(screen.getByText("Total Gaji")).toBeInTheDocument();
  });

  it("calls saveGajianRequest on Simpan Pettycash", async () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("Simpan Pettycash, Tambahan & Kasbon"));
    await waitFor(() => expect(mockSaveRequest).toHaveBeenCalled());
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("shows error toast when saveRequest throws", async () => {
    mockSaveRequest.mockRejectedValueOnce(new Error("fail"));
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("Simpan Pettycash, Tambahan & Kasbon"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: fail"));
  });

  it("calls finalizeGajian on Finalisasi", async () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("Finalisasi Gajian"));
    await waitFor(() =>
      expect(mockFinalize).toHaveBeenCalledWith(
        expect.objectContaining({ id: "g1" }),
        expect.any(Object)
      )
    );
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("shows error toast when finalize throws", async () => {
    mockFinalize.mockRejectedValueOnce(new Error("err"));
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("Finalisasi Gajian"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: err"));
  });

  it("does not render finalisasi button when status=final", () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianFinal} />);
    expect(screen.queryByText("Finalisasi Gajian")).toBeNull();
  });

  it("opens ShareModal on Bagikan click", () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("📤 Bagikan Ringkasan"));
    expect(screen.getByTestId("share-modal")).toBeInTheDocument();
  });

  it("closes ShareModal", () => {
    render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
    fireEvent.click(screen.getByText("📤 Bagikan Ringkasan"));
    fireEvent.click(screen.getByText("CloseShare"));
    expect(screen.queryByTestId("share-modal")).toBeNull();
  });

  describe("Switch Pettycash (default ON, otomatis dari Uang Denny & Wulan Terpakai)", () => {
    it("switch default ON meski gajian.pettycash awalnya 0/kosong", () => {
      render(<TabRingkasan gajianId="g1" gajian={{ ...gajianDraft, pettycash: 0 }} />);
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    });

    it("menampilkan label 'Uang Denny & Wulan Terpakai' dan nilainya otomatis saat switch ON", () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      expect(screen.getByText("Uang Denny & Wulan Terpakai")).toBeInTheDocument();
      // Muncul 2x: kotak nilai otomatis DAN baris ringkasan "+ Uang Denny &
      // Wulan Terpakai" di bawah — keduanya menampilkan angka yang sama
      // (total dari switch ON).
      expect(screen.getAllByText("Rp2895800").length).toBe(2);
    });

    it("menampilkan '...' saat masih memuat total pettycash", () => {
      mockUsePettycashTerpakai.mockReturnValue({ total: 0, loading: true });
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      expect(screen.getByText("...")).toBeInTheDocument();
    });

    it("klik switch mematikan toggle dan menyembunyikan kotak nilai otomatis", () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      fireEvent.click(screen.getByRole("switch"));
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
      expect(screen.queryByText("Uang Denny & Wulan Terpakai")).not.toBeInTheDocument();
    });

    it("menyimpan pettycash = total otomatis saat switch ON", async () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      fireEvent.click(screen.getByText("Simpan Pettycash, Tambahan & Kasbon"));
      await waitFor(() => expect(mockSaveRequest).toHaveBeenCalled());
      expect(mockSaveRequest).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ pettycash: 2895800 }),
      );
    });

    it("menyimpan pettycash = 0 saat switch dimatikan", async () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      fireEvent.click(screen.getByRole("switch"));
      fireEvent.click(screen.getByText("Simpan Pettycash, Tambahan & Kasbon"));
      await waitFor(() => expect(mockSaveRequest).toHaveBeenCalled());
      expect(mockSaveRequest).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ pettycash: 0 }),
      );
    });
  });

  // Task 4 (permintaan Denny 2026-09): checkbox "Beli Gas" (nominal tetap
  // Rp100.000) + input manual "Persiapan ATK" (tanpa default value, cuma
  // placeholder) di Ringkasan.
  describe("Beli Gas (checkbox, nominal tetap)", () => {
    it("checkbox default OFF utk periode baru (belum pernah disimpan)", () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      const checkbox = screen.getByRole("checkbox", { name: /beli gas/i });
      expect(checkbox).not.toBeChecked();
    });

    it("menampilkan nominal tetap Rp100.000 di sebelah checkbox", () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      expect(screen.getByText("Rp100000")).toBeInTheDocument();
    });

    it("checkbox default ON kalau periode ini sebelumnya SUDAH pernah disimpan dgn Beli Gas dicentang", () => {
      const gajianWithGas = { ...gajianDraft, tambahan: [{ label: "Beli Gas", jumlah: 100000 }] };
      render(<TabRingkasan gajianId="g1" gajian={gajianWithGas} />);
      expect(screen.getByRole("checkbox", { name: /beli gas/i })).toBeChecked();
    });

    it("centang checkbox lalu Simpan -> tambahan yg disimpan menyertakan entri Beli Gas Rp100.000", async () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      fireEvent.click(screen.getByRole("checkbox", { name: /beli gas/i }));
      fireEvent.click(screen.getByText("Simpan Pettycash, Tambahan & Kasbon"));
      await waitFor(() => expect(mockSaveRequest).toHaveBeenCalled());
      expect(mockSaveRequest).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ tambahan: expect.arrayContaining([{ label: "Beli Gas", jumlah: 100000 }]) }),
      );
    });

    it("checkbox tidak dicentang -> tambahan yg disimpan TIDAK menyertakan Beli Gas", async () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      fireEvent.click(screen.getByText("Simpan Pettycash, Tambahan & Kasbon"));
      await waitFor(() => expect(mockSaveRequest).toHaveBeenCalled());
      const savedTambahan = mockSaveRequest.mock.calls[0][1].tambahan;
      expect(savedTambahan.find((t) => t.label === "Beli Gas")).toBeUndefined();
    });
  });

  describe("Persiapan ATK (input manual, tanpa default value)", () => {
    it("input mulai KOSONG (bukan pre-filled 0), walau periode ini belum pernah punya nilai ATK", () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      expect(screen.getByLabelText("Persiapan ATK")).toHaveValue(null);
    });

    it("input tetap KOSONG saat edit periode yang SEBELUMNYA sudah py Persiapan ATK — nilai lama jadi placeholder saja", () => {
      const gajianWithAtk = { ...gajianDraft, tambahan: [{ label: "Persiapan ATK", jumlah: 45000 }] };
      render(<TabRingkasan gajianId="g1" gajian={gajianWithAtk} />);
      const input = screen.getByLabelText("Persiapan ATK");
      expect(input).toHaveValue(null);
      expect(input).toHaveAttribute("placeholder", "45000");
    });

    it("placeholder '0' kalau belum pernah ada nilai ATK sebelumnya", () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      expect(screen.getByLabelText("Persiapan ATK")).toHaveAttribute("placeholder", "0");
    });

    it("ketik nilai baru lalu Simpan -> tambahan yg disimpan menyertakan Persiapan ATK sesuai ketikan", async () => {
      render(<TabRingkasan gajianId="g1" gajian={gajianDraft} />);
      fireEvent.change(screen.getByLabelText("Persiapan ATK"), { target: { value: "60000" } });
      fireEvent.click(screen.getByText("Simpan Pettycash, Tambahan & Kasbon"));
      await waitFor(() => expect(mockSaveRequest).toHaveBeenCalled());
      expect(mockSaveRequest).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ tambahan: expect.arrayContaining([{ label: "Persiapan ATK", jumlah: 60000 }]) }),
      );
    });

    it("dibiarkan kosong (tidak diketik ulang) saat edit -> nilai LAMA yang tetap terpakai, bukan 0", async () => {
      const gajianWithAtk = { ...gajianDraft, tambahan: [{ label: "Persiapan ATK", jumlah: 45000 }] };
      render(<TabRingkasan gajianId="g1" gajian={gajianWithAtk} />);
      fireEvent.click(screen.getByText("Simpan Pettycash, Tambahan & Kasbon"));
      await waitFor(() => expect(mockSaveRequest).toHaveBeenCalled());
      expect(mockSaveRequest).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ tambahan: expect.arrayContaining([{ label: "Persiapan ATK", jumlah: 45000 }]) }),
      );
    });
  });
});
