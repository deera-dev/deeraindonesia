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
const mockProdukList = [
  { kode: "D-07-OSK", nama: "Gamis", variants: [{ size: "Midi" }, { size: "Gamis" }], warna: ["MERAH", "HITAM"] },
  { kode: "D-99-SGL", nama: "Single", variants: [{ size: "Midi" }], warna: ["HITAM"] },
];
vi.mock("../hooks", () => ({
  useProdukList: vi.fn(() => ({ produkList: mockProdukList })),
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

  // Task 3 (permintaan Denny 2026-09): "ketika input stok langsung ada
  // default valuenya yaitu 0, saya gamau, maunya placeholder aja" — baris
  // manual (cardId null) WAJIB mulai kosong secara visual, bukan pre-filled
  // "0". Baris AUTO (dari kartu asli, cardId ada, mis. MERAH/HITAM di
  // baseState) TETAP tampilkan angka sungguhan kartu — itu bukan "default 0"
  // yang dikeluhkan.
  describe("Qty Kartu — placeholder bukan default 0 (Task 3)", () => {
    it("baris manual baru (+ Tambah baris manual) tampil KOSONG dgn placeholder '0', BUKAN pre-filled '0'", async () => {
      render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
      await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
      fireEvent.click(screen.getByText("+ Tambah baris manual"));
      const qtyInputs = document.querySelectorAll('input[type="number"]');
      const manualQtyInput = qtyInputs[qtyInputs.length - 1]; // baris manual baru = paling akhir
      expect(manualQtyInput).toHaveValue(null); // kosong, BUKAN 0
      expect(manualQtyInput).toHaveAttribute("placeholder", "0");
    });

    it("baris AUTO (dari kartu asli) tetap menampilkan angka kartu sungguhan sbg value, bukan kosong", async () => {
      render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
      await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
      const qtyInputs = document.querySelectorAll('input[type="number"]');
      expect(qtyInputs[0]).toHaveValue(10); // MERAH, dari cardId c1
      expect(qtyInputs[1]).toHaveValue(10); // HITAM, dari cardId c2
    });

    it("mengetik di baris manual tetap memicu recalc qtyDitambahkan yang benar", async () => {
      render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
      await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
      fireEvent.click(screen.getByText("+ Tambah baris manual"));
      const qtyInputs = document.querySelectorAll('input[type="number"]');
      const manualQtyInput = qtyInputs[qtyInputs.length - 1];
      fireEvent.change(manualQtyInput, { target: { value: "6" } });
      // baris manual baru: size/warna kosong -> stokSaatIni/terjualSaatIni 0 -> qtyDitambahkan = 6
      // total: 7 (MERAH) + 10 (HITAM) + 6 (manual) = 23
      await waitFor(() => expect(screen.getByText("23 pcs")).toBeInTheDocument());
    });

    // Rekonsiliasi ULANG (edit) — kartu sudah "done" semua, buildKodeReconciliation
    // seed baris manual dari riwayat stok_masuk_log (qtyKartuPlaceholder), bukan
    // baris kosong tanpa acuan. Diuji lewat mock useLoadFinishingReconciliation
    // langsung (logika buildManualRowsFromLog sendiri sudah diuji di utils.test.js).
    it("baris manual yg diseed dari riwayat (qtyKartuPlaceholder) tampil kosong dgn placeholder = qty riwayat", async () => {
      mockLoadReconciliation.mockResolvedValue({
        "D-07-OSK": {
          kode: "D-07-OSK",
          nama: "Gamis",
          jumlahFinance: 20,
          cardsSum: 0,
          mismatch: true,
          rows: [
            { kode: "D-07-OSK", size: "Midi", warna: "MERAH", qtyKartu: "", qtyKartuPlaceholder: 18, cardId: null, stokSaatIni: 0, terjualSaatIni: 0, qtyDitambahkan: 0 },
          ],
          soldRows: [],
          stokRows: [],
        },
      });
      render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
      await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
      const qtyInput = document.querySelector('input[type="number"]');
      expect(qtyInput).toHaveValue(null);
      expect(qtyInput).toHaveAttribute("placeholder", "18");
    });
  });

  // Task D #3 (permintaan Denny 2026-09): "untuk setiap dropdown, kalau
  // pilihannya hanya ada 1 opsi, maka otomatis terpilih, tetapi jika lebih
  // dari 1 jangan ada yang dipilih dulu" — diuji di sini via dropdown
  // Ukuran/Warna baris manual (produk D-99-SGL cuma punya 1 ukuran "Midi"
  // dan 1 warna "HITAM", sedangkan D-07-OSK punya 2+2 jadi tetap kosong).
  describe("Ukuran/Warna baris manual — auto-select kalau cuma 1 opsi (Task D #3)", () => {
    const singleOptionState = {
      "D-99-SGL": {
        kode: "D-99-SGL",
        nama: "Single",
        jumlahFinance: 8,
        cardsSum: 0,
        mismatch: true,
        rows: [],
        soldRows: [{ size: "Midi", warna: "HITAM", qty: 1 }],
        stokRows: [{ size: "Midi", warna: "HITAM", gudang: 2, cideng: 0, tegalgubug: 0 }],
      },
    };
    const singleItems = [{ kode_produk: "D-99-SGL", nama_produk: "Single", jumlah: 8 }];

    it("baris manual baru langsung terisi Ukuran+Warna kalau produk cuma punya 1 opsi masing-masing", async () => {
      mockLoadReconciliation.mockResolvedValue(clone(singleOptionState));
      render(<FinishingStockModal items={singleItems} gajianFinishingId="gf-1" onClose={vi.fn()} />);
      await waitFor(() => expect(screen.getByText(/D-99-SGL — Single/)).toBeInTheDocument());
      fireEvent.click(screen.getByText("+ Tambah baris manual"));
      const selects = document.querySelectorAll("select");
      const [sizeSelect, warnaSelect] = selects; // hanya 1 baris manual -> 2 select
      expect(sizeSelect).toHaveValue("Midi");
      expect(warnaSelect).toHaveValue("HITAM");
    });

    it("stokSaatIni/terjualSaatIni langsung ke-lookup (recalc) begitu size+warna auto-terisi", async () => {
      mockLoadReconciliation.mockResolvedValue(clone(singleOptionState));
      render(<FinishingStockModal items={singleItems} gajianFinishingId="gf-1" onClose={vi.fn()} />);
      await waitFor(() => expect(screen.getByText(/D-99-SGL — Single/)).toBeInTheDocument());
      fireEvent.click(screen.getByText("+ Tambah baris manual"));
      // stok gudang 2, terjual 1 -> begitu size="Midi"/warna="HITAM" auto-terisi,
      // recalcReconciliationRow langsung lookup stokSaatIni=2, terjualSaatIni=1
      // (bukan 0/0 seperti sebelum size/warna terisi).
      expect(screen.getByText((_, node) => node?.textContent === "Stok saat ini: 2")).toBeInTheDocument();
      expect(screen.getByText((_, node) => node?.textContent === "Sudah terjual: 1")).toBeInTheDocument();
    });

    it("tetap kosong (bukan auto-terpilih) kalau produk punya lebih dari 1 opsi ukuran/warna", async () => {
      render(<FinishingStockModal items={items} gajianFinishingId="gf-1" onClose={vi.fn()} />);
      await waitFor(() => expect(screen.getByText(/D-07-OSK — Gamis/)).toBeInTheDocument());
      fireEvent.click(screen.getByText("+ Tambah baris manual"));
      const selects = document.querySelectorAll("select");
      const sizeSelect = selects[selects.length - 2];
      const warnaSelect = selects[selects.length - 1];
      expect(sizeSelect).toHaveValue("");
      expect(warnaSelect).toHaveValue("");
    });
  });
});
