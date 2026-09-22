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
// cfg REALISTIS (bukan cuma 2 field sembarang) — dipakai APA ADANYA oleh
// utils.js asli (TIDAK di-mock, lihat catatan di bawah), supaya
// calcFinishingPerPcs/calcUpahFinishing/summarizeFinishingItems yang
// dipanggil FinishingForm.jsx menghasilkan angka yang konsisten & bisa
// diverifikasi di test (perPcs = 500+300+200+100+150+250 = 1500).
vi.mock("../../pengaturan/hooks", () => ({
  useFinanceConfig: vi.fn(() => ({
    config: {
      tarif_gosok: 500, tarif_lipat: 300, tarif_buang_benang: 200,
      tarif_pasang_pin: 100, tarif_hangtag: 150, tarif_seri: 250,
      tarif_kancing: 50, tarif_lubang: 75,
    },
  })),
}));
const mockSaveFinishing = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useProdukList: vi.fn(() => ({ produkList: [{ kode: "D-07-OSK", nama: "Gamis" }] })),
  useSaveFinishing: vi.fn(() => mockSaveFinishing),
  // Acuan pilih produk (permintaan Denny 2026-09): jumlah sesuai Produksi,
  // kancing sesuai HPP.
  useProduksiTotalMap: vi.fn(() => ({ produksiTotalByKode: { "D-07-OSK": 67 } })),
  useKancingHppMap: vi.fn(() => ({ kancingHppByKode: { "D-07-OSK": 5 } })),
}));
// "../utils" SENGAJA TIDAK di-mock: fungsi kalkulasinya murni (tidak ada
// Supabase/React di dalamnya, sudah diuji sendiri di utils.test.js) dan
// summarizeFinishingItems() memanggil calcFinishingPerPcs/calcUpahFinishing
// SECARA INTERNAL (referensi lokal dalam file yang sama) — kalau salah satu
// di-mock tapi yang lain tidak, angka breakdown akan tidak konsisten dengan
// angka yang FinishingForm.jsx tampilkan langsung. Lebih aman & lebih
// realistis pakai modul aslinya di sini.

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

  it("meneruskan items yang disimpan + id record ke onSave (utk buka rekonsiliasi stok, permintaan Denny 2026-09)", async () => {
    mockSaveFinishing.mockResolvedValue("gf-123");
    const onSave = vi.fn();
    render(<FinishingForm gajianId="g1" onSave={onSave} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ items: expect.any(Array), gajianFinishingId: "gf-123" }),
      ),
    );
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
  // Permintaan Denny 2026-09: "pilih kode bisa search juga" — field Produk
  // sekarang <input list>+<datalist> (native HTML, bisa diketik/cari),
  // bukan <select> lagi. Lihat komentar yg sama di JahitForm.jsx.
  it("selects produk by kode and derives nama_produk for payload", async () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("produk-input-0"), { target: { value: "D-07-OSK" } });
    const jumlahInput = document.querySelectorAll('input[type="number"]')[0];
    fireEvent.change(jumlahInput, { target: { value: "5" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveFinishing).toHaveBeenCalled());
    const { payload } = mockSaveFinishing.mock.calls[0][0];
    expect(payload.items[0].kode_produk).toBe("D-07-OSK");
    expect(payload.items[0].nama_produk).toBe("Gamis");
  });

  it("shows kode — nama sbg label opsi datalist utk produk", () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    // <option> datalist tidak punya teks anak (pakai attribute `label`),
    // jadi dicek langsung dari attribute-nya, bukan getByText.
    const option = document.querySelector("datalist option[value='D-07-OSK']");
    expect(option).not.toBeNull();
    expect(option.getAttribute("label")).toBe("D-07-OSK — Gamis");
  });
});

// ── Acuan Produksi/HPP saat pilih produk (permintaan Denny 2026-09) ─────────
describe("FinishingForm — acuan Produksi & HPP saat pilih produk", () => {
  it("tidak menampilkan acuan sebelum produk dipilih", () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText(/Acuan:/)).not.toBeInTheDocument();
  });

  it("menampilkan acuan Produksi (pcs) & HPP Kancing (/pcs) setelah kode dipilih", () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("produk-input-0"), { target: { value: "D-07-OSK" } });
    expect(screen.getByText(/Acuan:/)).toBeInTheDocument();
    expect(screen.getByText("67 pcs")).toBeInTheDocument();
    expect(screen.getByText("5/pcs")).toBeInTheDocument();
  });

  it("acuan HPP disembunyikan kalau kode belum punya Template HPP (beda dari HPP kancing_qty=0)", () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("produk-input-0"), { target: { value: "D-99-XXX" } });
    expect(screen.getByText(/Acuan:/)).toBeInTheDocument();
    expect(screen.getByText("0 pcs")).toBeInTheDocument(); // belum ada data produksi
    expect(screen.queryByText(/HPP Kancing/)).not.toBeInTheDocument();
  });
});

// ── Kancing per-pcs otomatis + fitur Lubang (permintaan Denny 2026-09) ──────
describe("FinishingForm — Kancing per pcs (auto-kalkulasi, bukan total manual)", () => {
  it("menghitung kancing_qty = jumlah x kancing per pcs, tidak perlu kalkulasi manual lagi", async () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    const jumlahInput = document.querySelectorAll('input[type="number"]')[0];
    const kancingPerPcsInput = screen.getByTestId("kancing-per-pcs-0");
    fireEvent.change(jumlahInput, { target: { value: "42" } });
    fireEvent.change(kancingPerPcsInput, { target: { value: "8" } });
    // Ditampilkan langsung di form (bukan cuma pas submit)
    expect(screen.getByText(/= 42 × 8 = 336 kancing/)).toBeInTheDocument();

    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveFinishing).toHaveBeenCalled());
    const { payload } = mockSaveFinishing.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ jumlah: 42, kancing_per_pcs: 8, kancing_qty: 336 });
  });

  it("record LAMA (cuma py kancing_qty total, tanpa kancing_per_pcs) tetap kepakai kalau field tidak diketik ulang", async () => {
    const initial = {
      id: "f1",
      items: [{ kode_produk: "D-07-OSK", nama_produk: "Gamis", jumlah: 42, kancing_qty: 336 }],
    };
    render(<FinishingForm gajianId="g1" initial={initial} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveFinishing).toHaveBeenCalled());
    const { payload } = mockSaveFinishing.mock.calls[0][0];
    // 336/42 = 8 per pcs, di-derive otomatis dari data lama
    expect(payload.items[0]).toMatchObject({ jumlah: 42, kancing_per_pcs: 8, kancing_qty: 336 });
  });
});

// Permintaan Denny 2026-09 ("kancing saling terhubung"): arah HPP -> Finishing
// — kalau HPP kode itu sudah punya kancing (kancingHppByKode), field "Kancing
// / pcs" di Finishing otomatis pakai nilai itu (placeholder + fallback
// kalkulasi) kalau admin tidak ketik apa-apa & belum ada snapshot lama.
describe("FinishingForm — Kancing per pcs otomatis dari Template HPP (permintaan Denny 2026-09, kancing saling terhubung)", () => {
  it("entri BARU, kode dipilih, field Kancing/pcs dibiarkan kosong -> placeholder & payload pakai nilai HPP (5)", async () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("produk-input-0"), { target: { value: "D-07-OSK" } });
    const jumlahInput = document.querySelectorAll('input[type="number"]')[0];
    fireEvent.change(jumlahInput, { target: { value: "10" } });

    const kancingInput = screen.getByTestId("kancing-per-pcs-0");
    expect(kancingInput.placeholder).toBe("5");

    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveFinishing).toHaveBeenCalled());
    const { payload } = mockSaveFinishing.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ kancing_per_pcs: 5, kancing_qty: 50 });
  });

  it("kode belum punya Template HPP sama sekali -> placeholder tetap 0, TIDAK error", () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("produk-input-0"), { target: { value: "D-99-XXX" } });
    expect(screen.getByTestId("kancing-per-pcs-0").placeholder).toBe("0");
  });

  it("admin ketik manual -> nilai manual MENANG, bukan fallback HPP", async () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("produk-input-0"), { target: { value: "D-07-OSK" } });
    const jumlahInput = document.querySelectorAll('input[type="number"]')[0];
    fireEvent.change(jumlahInput, { target: { value: "10" } });
    fireEvent.change(screen.getByTestId("kancing-per-pcs-0"), { target: { value: "3" } });

    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveFinishing).toHaveBeenCalled());
    const { payload } = mockSaveFinishing.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ kancing_per_pcs: 3, kancing_qty: 30 });
  });

  it("record LAMA yang py snapshot kancing_per_pcs sendiri TETAP diutamakan drpd fallback HPP", async () => {
    // Snapshot lama kode ini kancing_per_pcs efektifnya 2 (kancing_qty 84 / jumlah 42),
    // padahal kancingHppByKode kode ini = 5 — snapshot lama harus menang (fallback PERTAMA).
    const initial = {
      id: "f1",
      items: [{ kode_produk: "D-07-OSK", nama_produk: "Gamis", jumlah: 42, kancing_qty: 84 }],
    };
    render(<FinishingForm gajianId="g1" initial={initial} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveFinishing).toHaveBeenCalled());
    const { payload } = mockSaveFinishing.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ kancing_per_pcs: 2, kancing_qty: 84 });
  });
});

describe("FinishingForm — opsi Lubang (toggle per produk, qty terpisah dari Kancing)", () => {
  it("input Lubang/pcs tersembunyi sebelum toggle 'Pakai Lubang?' dicentang", () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByTestId("lubang-per-pcs-0")).not.toBeInTheDocument();
  });

  it("centang 'Pakai Lubang?' menampilkan input Lubang/pcs, hitung lubang_qty = jumlah x lubang/pcs", async () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    const jumlahInput = document.querySelectorAll('input[type="number"]')[0];
    fireEvent.change(jumlahInput, { target: { value: "42" } });

    fireEvent.click(screen.getByLabelText("Pakai Lubang?"));
    const lubangInput = screen.getByTestId("lubang-per-pcs-0");
    fireEvent.change(lubangInput, { target: { value: "3" } });
    expect(screen.getByText(/= 42 × 3 = 126 lubang/)).toBeInTheDocument();

    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveFinishing).toHaveBeenCalled());
    const { payload } = mockSaveFinishing.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ pakai_lubang: true, lubang_per_pcs: 3, lubang_qty: 126 });
  });

  it("TIDAK menghitung biaya/qty lubang kalau toggle tidak dicentang, walau field sempat diisi lalu di-uncheck", async () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    const jumlahInput = document.querySelectorAll('input[type="number"]')[0];
    fireEvent.change(jumlahInput, { target: { value: "42" } });

    const toggle = screen.getByLabelText("Pakai Lubang?");
    fireEvent.click(toggle); // nyala
    fireEvent.change(screen.getByTestId("lubang-per-pcs-0"), { target: { value: "3" } });
    fireEvent.click(toggle); // matiin lagi

    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveFinishing).toHaveBeenCalled());
    const { payload } = mockSaveFinishing.mock.calls[0][0];
    expect(payload.items[0]).toMatchObject({ pakai_lubang: false, lubang_per_pcs: 0, lubang_qty: 0 });
  });
});

describe("FinishingForm — breakdown Total Finishing/Kancing/Lubang", () => {
  it("menampilkan breakdown total per komponen sesuai input", () => {
    render(<FinishingForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    const jumlahInput = document.querySelectorAll('input[type="number"]')[0];
    fireEvent.change(jumlahInput, { target: { value: "10" } });
    fireEvent.change(screen.getByTestId("kancing-per-pcs-0"), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("Pakai Lubang?"));
    fireEvent.change(screen.getByTestId("lubang-per-pcs-0"), { target: { value: "1" } });

    // perPcs = 500+300+200+100+150+250 = 1500 (dari cfg di atas)
    expect(screen.getByText("Total Finishing")).toBeInTheDocument();
    expect(screen.getByText("Rp15000")).toBeInTheDocument(); // 10 x 1500
    expect(screen.getByText("Total Kancing (20 buah)")).toBeInTheDocument(); // 10x2
    expect(screen.getByText("Rp1000")).toBeInTheDocument(); // 20 x tarif_kancing 50
    expect(screen.getByText("Total Lubang (10 buah)")).toBeInTheDocument(); // 10x1
    expect(screen.getByText("Rp750")).toBeInTheDocument(); // 10 x tarif_lubang 75
  });
});
