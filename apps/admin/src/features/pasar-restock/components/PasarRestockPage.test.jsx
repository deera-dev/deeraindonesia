import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));
vi.mock("../../../shared/components/AdminSidebar", () => ({ default: () => <div data-testid="sidebar" /> }));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: toastMock }));

const mockUsePasarRestock = vi.fn();
const mockUseTargetSeriQty = vi.fn();
const mockUseCreateTransfer = vi.fn();
const createTransferFn = vi.fn();
vi.mock("../hooks", () => ({
  usePasarRestock: (...a) => mockUsePasarRestock(...a),
  useTargetSeriQty: (...a) => mockUseTargetSeriQty(...a),
  useCreateTransfer: (...a) => mockUseCreateTransfer(...a),
}));

import PasarRestockPage from "./PasarRestockPage";

const detail = (o) => ({
  size: "Midi", warna: "HITAM", marketQty: 1, gudangQty: 10, otherQty: 0, otherMarket: "tegalgubug",
  total: 20, target: 3, butuh: 2, menipis: true, hampirHabis: false, ...o,
});
const RESTOCK = [
  { kode: "D-01-OSK", details: [detail({})], maxButuh: 2, anyHampirHabis: false },
  {
    kode: "D-06-HBS",
    details: [detail({ warna: "BIRU", marketQty: 0, total: 2, target: 2, butuh: 2, hampirHabis: true })],
    maxButuh: 2,
    anyHampirHabis: true,
  },
];
const TIDAK = [{ kode: "D-02-SFN", details: [{ size: "Gamis", warna: "MERAH", marketQty: 5 }], totalMarketQty: 5 }];

function renderPage() {
  return render(
    <MemoryRouter>
      <PasarRestockPage />
    </MemoryRouter>,
  );
}

let targetByMarket;
let setTargetMock;

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePasarRestock.mockReturnValue({ restockList: RESTOCK, tidakBergerakList: TIDAK, loading: false });
  targetByMarket = { cideng: 2, tegalgubug: 3 };
  setTargetMock = vi.fn();
  mockUseTargetSeriQty.mockImplementation((market) => ({ target: targetByMarket[market], setTarget: setTargetMock }));
  mockUseCreateTransfer.mockReturnValue(createTransferFn);
  createTransferFn.mockResolvedValue({ id: "t1" });
});

describe("PasarRestockPage", () => {
  it("renders judul & market picker", () => {
    renderPage();
    expect(screen.getByText("Persiapan Pasar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cideng" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tegalgubug" })).toBeInTheDocument();
  });

  it("menampilkan kartu restock apa adanya dari backend", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cideng" }));
    const section = screen.getByText("Perlu Direstock").closest("section");
    expect(section).toHaveTextContent("D-01-OSK");
    expect(section).toHaveTextContent("Menipis · butuh 2");
    expect(section).toHaveTextContent("Midi · HITAM");
    expect(section).toHaveTextContent("Hampir Habis · bawa 2");
    expect(section).toHaveTextContent("bawa balik ke gudang dulu");
  });

  it("menampilkan kartu tidak bergerak dari backend", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cideng" }));
    expect(screen.getByText("Tidak Bergerak").closest("section")).toHaveTextContent("D-02-SFN");
  });

  it("ganti market memanggil usePasarRestock dengan pasar baru & target pasar itu", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Tegalgubug" }));
    expect(mockUsePasarRestock).toHaveBeenLastCalledWith("tegalgubug", 3);
  });

  it("shows loading state", () => {
    mockUsePasarRestock.mockReturnValue({ restockList: [], tidakBergerakList: [], loading: true });
    renderPage();
    expect(screen.getAllByText("Memuat...").length).toBeGreaterThan(0);
  });

  it("shows empty state kalau backend mengembalikan daftar kosong", () => {
    mockUsePasarRestock.mockReturnValue({ restockList: [], tidakBergerakList: [], loading: false });
    renderPage();
    expect(screen.getByText(/masih aman/)).toBeInTheDocument();
    expect(screen.getByText(/masih bergerak/)).toBeInTheDocument();
  });

  describe("target minimal seri (editable, default beda per pasar)", () => {
    it("default cideng=2 ditampilkan di input & teks deskripsi", () => {
      renderPage();
      expect(screen.getByLabelText("Target minimal seri Cideng")).toHaveValue(2);
      expect(screen.getByText(/target 2 pcs per warna/)).toBeInTheDocument();
    });

    it("tegalgubug default=3 saat pasar itu dipilih", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole("button", { name: "Tegalgubug" }));
      expect(screen.getByLabelText("Target minimal seri Tegalgubug")).toHaveValue(3);
    });

    it("mengubah angka memanggil setTarget dari hook", () => {
      renderPage();
      const input = screen.getByLabelText("Target minimal seri Cideng");
      fireEvent.change(input, { target: { value: "5" } });
      expect(setTargetMock).toHaveBeenCalledWith(5);
    });
  });

  describe("checklist restock -> Buat Transfer", () => {
    it("baris dengan butuh>0 punya checkbox, baris 'Cukup' (butuh=0) tidak", async () => {
      mockUsePasarRestock.mockReturnValue({
        restockList: [
          { kode: "D-09-XYZ", details: [detail({ butuh: 0, menipis: false }), detail({ warna: "PUTIH", butuh: 1 })], maxButuh: 1, anyHampirHabis: false },
        ],
        tidakBergerakList: [],
        loading: false,
      });
      renderPage();
      expect(screen.getAllByRole("checkbox").length).toBe(1);
    });

    it("centang 1 item -> muncul tombol 'Buat Transfer (1)'", async () => {
      const user = userEvent.setup();
      renderPage();
      expect(screen.queryByText(/Buat Transfer/)).toBeNull();
      await user.click(screen.getAllByRole("checkbox")[0]);
      expect(screen.getByText("Buat Transfer (1)")).toBeInTheDocument();
    });

    it("klik Buat Transfer memanggil createTransfer dgn fromLocation gudang, toLocation market, items dari checklist", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getAllByRole("checkbox")[0]);
      await user.click(screen.getByText("Buat Transfer (1)"));
      expect(createTransferFn).toHaveBeenCalledWith(
        expect.objectContaining({
          fromLocation: "gudang",
          toLocation: "cideng",
          items: [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 2 }],
        }),
      );
      expect(toastMock.success).toHaveBeenCalled();
    });

    it("Pilih Semua mencentang semua baris butuh>0 dari kedua kartu", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText("Pilih Semua"));
      expect(screen.getByText("Buat Transfer (2)")).toBeInTheDocument();
    });

    it("gagal membuat transfer -> toast.error, bukan toast.success", async () => {
      createTransferFn.mockRejectedValueOnce(new Error("gagal jaringan"));
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getAllByRole("checkbox")[0]);
      await user.click(screen.getByText("Buat Transfer (1)"));
      expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining("gagal jaringan"));
      expect(toastMock.success).not.toHaveBeenCalled();
    });

    it("ganti pasar mengosongkan checklist sebelumnya", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getAllByRole("checkbox")[0]);
      expect(screen.getByText("Buat Transfer (1)")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Tegalgubug" }));
      expect(screen.queryByText(/Buat Transfer/)).toBeNull();
    });

    // Admin: "kok bisa ke transfer 2? sedangkan di gudang cuma ada 1? kalau
    // sesuai behavior kan harusnya cuma ambil dari gudang" — transfer
    // SELALU dari Gudang, qty tidak boleh lebih dari stok Gudang yang ada.
    describe("qty transfer di-cap ke stok Gudang yang benar-benar ada (bugfix)", () => {
      it("Gudang kurang dari butuh -> item TETAP punya checkbox, tapi qty yg dikirim di-cap + catatan parsial", async () => {
        mockUsePasarRestock.mockReturnValue({
          restockList: [
            { kode: "D-53-LBR", details: [detail({ warna: "UNGU", butuh: 2, gudangQty: 1 })], maxButuh: 2, anyHampirHabis: false },
          ],
          tidakBergerakList: [],
          loading: false,
        });
        const user = userEvent.setup();
        renderPage();
        expect(screen.getByText(/Gudang cuma ada 1 — bisa kirim 1 dari butuh 2/)).toBeInTheDocument();
        await user.click(screen.getAllByRole("checkbox")[0]);
        await user.click(screen.getByText("Buat Transfer (1)"));
        expect(createTransferFn).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [{ kode: "D-53-LBR", size: "Midi", warna: "UNGU", qty: 1 }],
          }),
        );
      });

      it("Gudang 0 -> TIDAK ada checkbox sama sekali (tidak ada yang bisa ditransfer)", () => {
        mockUsePasarRestock.mockReturnValue({
          restockList: [
            { kode: "D-53-LBR", details: [detail({ warna: "UNGU", butuh: 2, gudangQty: 0 })], maxButuh: 2, anyHampirHabis: false },
          ],
          tidakBergerakList: [],
          loading: false,
        });
        renderPage();
        expect(screen.queryAllByRole("checkbox").length).toBe(0);
        expect(screen.getByText(/Gudang kosong — tidak bisa direstock dari sini/)).toBeInTheDocument();
      });

      it("Pilih Semua ikut meng-cap qty & melewati baris yang Gudang-nya 0", async () => {
        mockUsePasarRestock.mockReturnValue({
          restockList: [
            {
              kode: "D-53-LBR",
              details: [
                detail({ warna: "UNGU", butuh: 2, gudangQty: 1 }),
                detail({ warna: "HITAM", butuh: 2, gudangQty: 0 }),
              ],
              maxButuh: 2,
              anyHampirHabis: false,
            },
          ],
          tidakBergerakList: [],
          loading: false,
        });
        const user = userEvent.setup();
        renderPage();
        await user.click(screen.getByText("Pilih Semua"));
        // Cuma UNGU yang ke-pilih (HITAM gudangnya 0, tidak checkable).
        expect(screen.getByText("Buat Transfer (1)")).toBeInTheDocument();
        await user.click(screen.getByText("Buat Transfer (1)"));
        expect(createTransferFn).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [{ kode: "D-53-LBR", size: "Midi", warna: "UNGU", qty: 1 }],
          }),
        );
      });
    });
  });
});
