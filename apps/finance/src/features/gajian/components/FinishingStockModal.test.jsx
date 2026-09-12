import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/lib/format", () => ({
  inputCls: "",
  labelCls: "",
}));
vi.mock("@deera/shared/lib/constants", () => ({
  SIZE_PRESETS: [{ size: "Midi" }, { size: "Midi Jumbo" }, { size: "Gamis" }, { size: "Gamis Jumbo" }],
}));
vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(() => ({
    user: { email: "finance@deera.id", user_metadata: { full_name: "Finance Admin" } },
  })),
}));
vi.mock("./Modal", () => ({
  Modal: ({ title, onClose, children }) => (
    <div data-testid="modal">
      <span>{title}</span>
      <button onClick={onClose}>×</button>
      {children}
    </div>
  ),
}));

// buildKodeReconciliation asli sudah lengkap diuji di ../utils.test.js — di
// sini kita pasok hasil rekonsiliasi awal langsung lewat mock
// useLoadFinishingReconciliation, tapi TETAP pakai implementasi ASLI
// newManualReconciliationRow/recalcReconciliationRow (../utils, tidak
// dimock) supaya interaksi tambah-baris-manual & recalculate teruji nyata.
const mockLoadReconciliation = vi.fn();
const mockApply = vi.fn();
vi.mock("../hooks", () => ({
  useProdukList: vi.fn(() => ({
    produkList: [
      { kode: "D-07-OSK", nama: "Gamis", variants: [{ size: "Midi" }, { size: "Gamis" }], warna: ["MERAH", "HITAM"] },
    ],
  })),
  useLoadFinishingReconciliation: vi.fn(() => mockLoadReconciliation),
  useApplyFinishingStockIntake: vi.fn(() => ({ apply: mockApply, applying: false })),
}));

import FinishingStockModal from "./FinishingStockModal";

const baseState = {
  "D-07-OSK": {
    kode: "D-07-OSK",
    nama: "Gamis",
    jumlahFinance: 20,
    cardsSum: 20,
    mismatch: false,
    rows: [
      { kode: "D-07-OSK", size: "Midi", warna: "MERAH", qtyKartu: 10, cardId: "c1", stokSaatIni: 2, terjualSaatIni: 1, qtyDitambahkan: 7 },
      { kode: "D-07-OSK", size: "Midi", warna: "HITAM", qtyKartu: 10, cardId: "c2", stokSaatIni: 0, terjualSaatIni: 0, qtyDitambahkan: 10 },
    ],
    soldRows: [
      { size: "Midi", warna: "MERAH", qty: 1 },
      { size: "Midi", warna: "HITAM", qty: 0 },
    ],
    stokRows: [
      { size: "Midi", warna: "MERAH", gudang: 2, cideng: 0, tegalgubug: 0 },
      { size: "Midi", warna: "HITAM", gudang: 0, cideng: 0, tegalgubug: 0 },
    ],
  },
};

const items = [{ kode_produk: "D-07-OSK", nama_produk: "Gamis", jumlah: 20 }];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadReconciliation.mockResolvedValue(clone(baseState));
  mockApply.mockResolvedValue(undefined);
});

describe("FinishingStockModal (permintaan Denny 2026-09)", () => {
  it("shows loading state before reconciliation resolves", () => {
    let resolveFn;
    mockLoadReconciliation.mockReturnValue(new Promise((r) => (resolveFn = r)));
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
    expect(screen.getByText("Memuat rekonsiliasi...")).toBeInTheDocument();
    resolveFn(clone(baseState));
  });

  it("calls useLoadFinishingReconciliation with the provided items once on mount", () => {
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
    expect(mockLoadReconciliation).toHaveBeenCalledTimes(1);
    expect(mockLoadReconciliation).toHaveBeenCalledWith(items);
  });

  it("renders per-kode section with rows after loading", async () => {
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
    expect(screen.getByText("Finance: 20 pcs")).toBeInTheDocument();
    expect(screen.getAllByText("MERAH")).not.toHaveLength(0);
    expect(screen.getByText(/Total tambah ke Gudang/)).toBeInTheDocument();
    // 7 + 10 = 17
    expect(screen.getByText("17 pcs")).toBeInTheDocument();
  });

  it("shows mismatch warning banner when state.mismatch is true", async () => {
    mockLoadReconciliation.mockResolvedValue({
      "D-07-OSK": { ...structuredClone(baseState["D-07-OSK"]), mismatch: true, cardsSum: 15 },
    });
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Kartu Jahit Ready Finishing/)).toBeInTheDocument());
  });

  it("does not show mismatch banner when state.mismatch is false", async () => {
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
    expect(screen.queryByText(/Kartu Jahit Ready Finishing/)).not.toBeInTheDocument();
  });

  it("adds a manual row when '+ Tambah baris manual' clicked", async () => {
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
    const selectsBefore = document.querySelectorAll("select");
    fireEvent.click(screen.getByText("+ Tambah baris manual"));
    const selectsAfter = document.querySelectorAll("select");
    // baris manual baru punya 2 <select> tambahan (ukuran + warna, keduanya editable)
    expect(selectsAfter.length).toBe(selectsBefore.length + 2);
  });

  it("removes a manual row when '− Hapus baris' clicked, but existing card rows have no remove button", async () => {
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
    expect(screen.queryByText("− Hapus baris")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("+ Tambah baris manual"));
    expect(screen.getByText("− Hapus baris")).toBeInTheDocument();
    fireEvent.click(screen.getByText("− Hapus baris"));
    expect(screen.queryByText("− Hapus baris")).not.toBeInTheDocument();
  });

  it("recalculates qtyDitambahkan when editing qtyKartu of an existing row", async () => {
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
    const qtyInputs = document.querySelectorAll('input[type="number"]');
    // baris pertama (MERAH): stokSaatIni=2, terjualSaatIni=1 -> ubah qtyKartu jadi 5 => max(0,5-2-1)=2
    fireEvent.change(qtyInputs[0], { target: { value: "5" } });
    // total baru: 2 (baris1 baru) + 10 (baris2 tetap) = 12
    await waitFor(() => expect(screen.getByText("12 pcs")).toBeInTheDocument());
  });

  it("Lewati button calls onClose without calling apply", async () => {
    const onClose = vi.fn();
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={onClose} />);
    await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
    fireEvent.click(screen.getByText("Lewati"));
    expect(mockApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Konfirmasi & Update Stok calls apply with flattened rows + user info, then closes", async () => {
    const onClose = vi.fn();
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={onClose} />);
    await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
    fireEvent.click(screen.getByText("Konfirmasi & Update Stok"));
    await waitFor(() => expect(mockApply).toHaveBeenCalledTimes(1));
    const arg = mockApply.mock.calls[0][0];
    expect(arg.gajianFinishingId).toBe("gf-1");
    expect(arg.userEmail).toBe("finance@deera.id");
    expect(arg.userName).toBe("Finance Admin");
    expect(arg.rows).toHaveLength(2);
    expect(mockToast.success).toHaveBeenCalledWith("Stok Gudang berhasil disinkronkan.");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("excludes incomplete manual rows (no size/warna) from apply payload", async () => {
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
    fireEvent.click(screen.getByText("+ Tambah baris manual"));
    fireEvent.click(screen.getByText("Konfirmasi & Update Stok"));
    await waitFor(() => expect(mockApply).toHaveBeenCalledTimes(1));
    // baris manual baru (size/warna kosong) tidak ikut dikirim
    expect(mockApply.mock.calls[0][0].rows).toHaveLength(2);
  });

  it("shows error toast and does not close when apply throws", async () => {
    mockApply.mockRejectedValueOnce(new Error("db down"));
    const onClose = vi.fn();
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={onClose} />);
    await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
    fireEvent.click(screen.getByText("Konfirmasi & Update Stok"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal update stok: db down"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows error toast when loading reconciliation fails", async () => {
    mockLoadReconciliation.mockRejectedValueOnce(new Error("network error"));
    render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("Gagal memuat data rekonsiliasi: network error"),
    );
  });
});
