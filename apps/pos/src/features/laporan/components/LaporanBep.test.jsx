import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  getTodayInfo: vi.fn(() => ({ location: "gudang", label: "Gudang", isMarketDay: false })),
  getMarketLabel: vi.fn(() => "Gudang"),
  getMarketLocation: vi.fn(() => "gudang"),
  LOCATIONS: ["gudang", "cideng", "tegalgubug"],
}));
vi.mock("@deera/shared/lib/bepUtils", () => ({
  findEarliestMarketDate: vi.fn(() => "2024-01-01"),
  localDateStr: vi.fn(() => "2024-01-01"),
  getSisaHariMingguIni: vi.fn(() => 3),
  computeMarginPerPcs: vi.fn(() => ({ marginPerPcs: 20000, hargaJualRataRata: 100000 })),
  computeBepLokasi: vi.fn(() => ({
    hppPasar: { perHari: 0, perMinggu: 0, perBulan: 0, perTahun: 0 },
    pcsPerHari: 0, pcsPerMinggu: 0, pcsPerBulan: 0, pcsPerTahun: 0,
  })),
  computeSaldoHarian: vi.fn(() => ({ ledger: [], saldoAkhir: 500000 })),
  computeTargetProduksi: vi.fn(() => ({
    targetProduksiPcs: 10, modalBahanDibutuhkan: 0,
    hppPasarPeriode: 0, pcsOngkosPasar: 0, pcsKejarUtang: 0,
  })),
  computeKebutuhanBahanMingguan: vi.fn(() => ({
    pcsPerMinggu: 5, modalBahanMingguan: 0, effectiveWindowDays: 30,
  })),
  computeProyeksiUtangVsSaldo: vi.fn(() => ({ bulanKekurangan: null, skedul: [] })),
  DEFAULT_BIAYA_PASAR: {
    cideng: { transport_per_trip: 180000, sewa_lapak_per_tahun: 50000000 },
    tegalgubug: { transport_per_trip: 1250000, sewa_lapak_per_tahun: 27000000 },
  },
}));

vi.mock("@deera/shared/lib/supabase", () => {
  const makeChain = () => {
    const chain = {};
    ["select","order","eq","in","gte","lte","filter","limit","single"].forEach((m) => {
      chain[m] = vi.fn(() => chain);
    });
    chain.then = (res) => Promise.resolve({ data: [], error: null }).then(res);
    return chain;
  };
  return { supabase: { from: vi.fn(() => makeChain()) } };
});

vi.mock("./ProyeksiUtangBahan", () => ({
  default: () => <div data-testid="proyeksi-utang" />,
}));

import LaporanBep from "./LaporanBep";

describe("LaporanBep", () => {
  it("shows loading spinner initially", () => {
    render(<LaporanBep sales={[]} />);
    expect(screen.getByText(/Memuat data BEP/i)).toBeInTheDocument();
  });

  it("renders BEP content after loading completes", async () => {
    render(<LaporanBep sales={[]} />);
    await waitFor(() =>
      expect(screen.queryByText("Memuat data BEP...")).not.toBeInTheDocument(),
      { timeout: 3000 }
    );
    const matches = screen.getAllByText(/BEP|Break Even|Pasar/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("renders ProyeksiUtangBahan after loading completes", async () => {
    render(<LaporanBep sales={[]} />);
    await waitFor(() =>
      expect(screen.queryByText("Memuat data BEP...")).not.toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(screen.getByTestId("proyeksi-utang")).toBeInTheDocument();
  });
});

// Additional tests -- added to boost coverage of LaporanBep.jsx
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import {
  findEarliestMarketDate,
  computeSaldoHarian,
  computeTargetProduksi,
} from "@deera/shared/lib/bepUtils";
import { getMarketLocation } from "@deera/shared/lib/marketDay";
import { supabase } from "@deera/shared/lib/supabase";

vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
import { toast } from "@deera/shared/features/toast/hooks";

beforeEach(() => vi.clearAllMocks());

// Helper: wait for loading to finish
async function waitLoaded() {
  await waitFor(() =>
    expect(screen.queryByText("Memuat data BEP...")).not.toBeInTheDocument(),
    { timeout: 4000 }
  );
}

describe("LaporanBep — no market transactions", () => {
  it("shows Belum ada transaksi when findEarliestMarketDate returns null", async () => {
    findEarliestMarketDate.mockReturnValueOnce(null).mockReturnValueOnce(null);
    computeSaldoHarian.mockReturnValue({ ledger: [], saldoAkhir: 0 });
    render(<LaporanBep />);
    await waitLoaded();
    expect(screen.getByText(/Belum ada transaksi pasar/i)).toBeInTheDocument();
  });
});

describe("LaporanBep — load error", () => {
  it("shows error banner when supabase returns error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (res) => Promise.resolve({ data: null, error: { message: "DB unavailable" } }).then(res),
    };
    vi.mocked(supabase.from).mockReturnValueOnce(chain);
    render(<LaporanBep />);
    await waitLoaded();
    expect(screen.getByText(/Gagal memuat data BEP/i)).toBeInTheDocument();
    expect(screen.getByText(/DB unavailable/)).toBeInTheDocument();
  });
});

describe("LaporanBep — negative saldo", () => {
  it("shows negative saldo message when saldoAkhir < 0", async () => {
    computeSaldoHarian.mockReturnValue({ ledger: [], saldoAkhir: -200000 });
    render(<LaporanBep />);
    await waitLoaded();
    expect(screen.getByText(/belum cukup menutup ongkos pasar/i)).toBeInTheDocument();
  });

  it("shows positive saldo message when saldoAkhir >= 0", async () => {
    computeSaldoHarian.mockReturnValue({ ledger: [], saldoAkhir: 500000 });
    render(<LaporanBep />);
    await waitLoaded();
    expect(screen.getByText(/sudah lebih besar dari ongkos pasar/i)).toBeInTheDocument();
  });
});

describe("LaporanBep — BiayaPasarModal", () => {
  it("opens BiayaPasarModal when Atur Biaya Pasar clicked", async () => {
    const user = userEvent.setup();
    computeSaldoHarian.mockReturnValue({ ledger: [], saldoAkhir: 500000 });
    render(<LaporanBep />);
    await waitLoaded();
    await user.click(screen.getByText(/Atur Biaya Pasar/i));
    expect(screen.getByText("Atur Biaya Pasar")).toBeInTheDocument();
    expect(screen.getAllByText(/Transport per trip/i).length).toBeGreaterThan(0);
  });

  it("closes BiayaPasarModal on Batal click", async () => {
    const user = userEvent.setup();
    computeSaldoHarian.mockReturnValue({ ledger: [], saldoAkhir: 500000 });
    render(<LaporanBep />);
    await waitLoaded();
    await user.click(screen.getByText(/Atur Biaya Pasar/i));
    // Batal button inside modal
    const batals = screen.getAllByText("Batal");
    await user.click(batals.at(-1));
    expect(screen.queryByText(/Transport per trip/i)).not.toBeInTheDocument();
  });

  it("closes BiayaPasarModal on × button click", async () => {
    const user = userEvent.setup();
    computeSaldoHarian.mockReturnValue({ ledger: [], saldoAkhir: 500000 });
    render(<LaporanBep />);
    await waitLoaded();
    await user.click(screen.getByText(/Atur Biaya Pasar/i));
    const closeBtn = screen.getAllByText("×").at(-1);
    await user.click(closeBtn);
    expect(screen.queryByText(/Transport per trip/i)).not.toBeInTheDocument();
  });

  it("allows typing in transport_per_trip input", async () => {
    const user = userEvent.setup();
    computeSaldoHarian.mockReturnValue({ ledger: [], saldoAkhir: 500000 });
    render(<LaporanBep />);
    await waitLoaded();
    await user.click(screen.getByText(/Atur Biaya Pasar/i));
    const transInputs = screen.getAllByPlaceholderText(/180000|1250000/i);
    await user.clear(transInputs[0]);
    await user.type(transInputs[0], "200000");
    expect(transInputs[0].value).toBe("200000");
  });

  it("shows toast.error when BiayaPasarModal save fails (upsert not in mock chain)", async () => {
    const user = userEvent.setup();
    computeSaldoHarian.mockReturnValue({ ledger: [], saldoAkhir: 500000 });
    render(<LaporanBep />);
    await waitLoaded();
    await user.click(screen.getByText(/Atur Biaya Pasar/i));
    await user.click(screen.getByText("Simpan"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

describe("LaporanBep — SaldoTrendChart", () => {
  it("renders trend chart section when ledger has >= 2 entries", async () => {
    const mockLedger = Array.from({ length: 3 }, (_, i) => ({
      tanggal: `2024-01-0${i + 1}`,
      lokasi: "cideng",
      isMarketDay: true,
      pcsLakuAktual: 5,
      marginTerkumpul: 100000,
      hppPasarHariIni: 80000,
      targetPcsHariIni: 5,
      saldoBaru: i * 20000,
      status: "SURPLUS",
      dailyNet: 20000,
    }));
    computeSaldoHarian.mockReturnValue({ ledger: mockLedger, saldoAkhir: 60000 });
    render(<LaporanBep />);
    await waitLoaded();
    expect(screen.getByText(/Tren BEP/i)).toBeInTheDocument();
  });
});

describe("LaporanBep — market day status card", () => {
  it("shows today status card when it is a market day with ledger entry", async () => {
    const today = "2024-01-01"; // matches localDateStr mock return value
    const mockLedger = [{
      tanggal: today,
      lokasi: "cideng",
      isMarketDay: true,
      pcsLakuAktual: 3,
      marginTerkumpul: 60000,
      hppPasarHariIni: 50000,
      targetPcsHariIni: 5,
      saldoBaru: 10000,
      status: "SURPLUS",
    }];
    computeSaldoHarian.mockReturnValue({ ledger: mockLedger, saldoAkhir: 10000 });
    getMarketLocation.mockReturnValue("cideng");
    render(<LaporanBep />);
    await waitLoaded();
    expect(screen.getByText(/Status BEP Hari Ini/i)).toBeInTheDocument();
    expect(screen.getByText("Cideng")).toBeInTheDocument();
  });
});

describe("LaporanBep — kejar utang text", () => {
  it("shows kejar utang text when pcsKejarUtang > 0", async () => {
    computeSaldoHarian.mockReturnValue({ ledger: [], saldoAkhir: 500000 });
    computeTargetProduksi.mockReturnValue({
      targetProduksiPcs: 10,
      modalBahanDibutuhkan: 0,
      hppPasarPeriode: 0,
      pcsOngkosPasar: 5,
      pcsKejarUtang: 3,
    });
    render(<LaporanBep />);
    await waitLoaded();
    expect(screen.getAllByText(/porsi cicilan/i).length).toBeGreaterThan(0);
  });
});
