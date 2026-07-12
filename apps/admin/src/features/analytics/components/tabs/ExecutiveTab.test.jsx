import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../hooks", () => ({
  useAnalyticsExecutive: vi.fn(),
}));

import ExecutiveTab from "./ExecutiveTab";
import { useAnalyticsExecutive } from "../../hooks";

const BASE = {
  kpi: {
    revenue: 5000000,
    profit: 1200000,
    marginPct: 0.24,
    growthMomPct: 25,
    customer: 5,
    transaksi: 8,
    repeatCustomer: 5,
  },
  businessHealth: [
    { status: "green", label: "Penjualan (Bulan ke Bulan)", detail: "Naik 25%" },
    { status: "yellow", label: "Status Keuntungan", detail: "24%" },
    { status: "red", label: "Tingkat Retur", detail: "6%" },
  ],
  // bestProduct/bestCustomer/bestMarket TETAP dikembalikan hooks.js (pass-
  // through overview.quickInsight, TIDAK dihapus) tapi SENGAJA TIDAK LAGI
  // dirender oleh ExecutiveTab (redesign 2026-07 — lihat komentar header
  // ExecutiveTab.jsx: section "Performa Terbaik" dihapus karena duplikat 1:1
  // dengan "Sorotan" di OverviewTab). Field ini tetap ada di fixture supaya
  // shape mock realistis, tapi tidak ada test yang menegaskan tampilannya.
  bestProduct: { kode: "D-01-OSK", nama: "Gamis A", value: 20 },
  bestCustomer: { pelangganId: "p1", nama: "BUDI", value: 2000000 },
  bestMarket: { location: "cideng", value: 700000 },
  biggestOpportunity: [
    { kode: "D-02-SFN", detail: "Demand 20 pcs, stok 2 pcs — sarankan order 25 pcs" },
  ],
  biggestRisk: [
    { kode: "D-05-ABC", category: "Stok Tidak Bergerak", detail: "Belum pernah terjual" },
    { kode: "D-09-XYZ", category: "Margin Negatif", detail: "-5,2% (jual rugi)" },
  ],
  insights: [
    "Persentase keuntungan keseluruhan saat ini 24,0%.",
    "5 produk teratas menyumbang 62.1% dari total penjualan.",
  ],
  recommendations: [
    "Restock produk: D-04-CTN.",
    "Evaluasi harga/modal produk yang terjual rugi: D-09-XYZ.",
  ],
  forecastSummary: {
    meta: { granularity: "week", historyBucketCount: 8, alpha: 0.3, lookbackPeriods: 8, nextPeriodeLabel: "2024-04-01" },
    revenue: { history: [{ periode: "2024-03-25", value: 3000000 }], ma: 2800000, wma: 2900000, es: 2950000 },
    profit: { history: [{ periode: "2024-03-25", value: 700000 }], ma: 650000, wma: 670000, es: 680000 },
    sales: { history: [{ periode: "2024-03-25", value: 15 }], ma: 14, wma: 14.5, es: 14.8 },
  },
  inventorySummary: {
    deadStockCount: 2,
    criticalStockCount: 1,
    totalInventoryValue: 20000000,
    daysOfInventory: 45,
  },
  quickActionsPrioritized: {
    tinggi: [
      { label: "1 produk perlu segera ditambah stoknya.", detail: "Termasuk: D-04-CTN." },
      { label: "1 produk terjual di bawah harga modal (rugi).", detail: null },
    ],
    sedang: [{ label: "3 produk stoknya mulai menipis.", detail: null }],
    rendah: [{ label: "Penjualan naik 25% dibanding bulan sebelumnya.", detail: null }],
  },
  loading: false,
};

const EMPTY_QUICK_ACTIONS = { tinggi: [], sedang: [], rendah: [] };

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsExecutive.mockReturnValue(BASE);
});

describe("ExecutiveTab (Ringkasan Bisnis, redesign 2026-07)", () => {
  it("shows skeleton loading state", () => {
    useAnalyticsExecutive.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<ExecutiveTab />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState (Bahasa Indonesia) with retry when error present", () => {
    const refetch = vi.fn();
    useAnalyticsExecutive.mockReturnValue({ ...BASE, error: new Error("gagal"), refetch });
    render(<ExecutiveTab />);
    expect(screen.getByText("Gagal memuat Ringkasan Bisnis.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders 4 kartu KPI utama dengan istilah sederhana (bukan 7 seperti sebelum redesign)", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText("Total Penjualan")).toBeInTheDocument();
    expect(screen.getByText("Keuntungan")).toBeInTheDocument();
    expect(screen.getByText("Persentase Keuntungan")).toBeInTheDocument();
    expect(screen.getByText("Pertumbuhan Bulanan")).toBeInTheDocument();
    expect(screen.getByText("+25%")).toBeInTheDocument();
  });

  it("setiap kartu KPI utama punya hint penjelasan istilah (owner tidak perlu bertanya 'ini angka apa')", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText("Total nilai seluruh penjualan.")).toBeInTheDocument();
    expect(screen.getByText("Total keuntungan setelah dikurangi modal.")).toBeInTheDocument();
  });

  it("Pelanggan/Transaksi/Pelanggan Kembali disembunyikan di balik <details> 'Lihat Detail Angka Lainnya' (progressive disclosure)", () => {
    const { container } = render(<ExecutiveTab />);
    expect(screen.getByText("Lihat Detail Angka Lainnya")).toBeInTheDocument();
    const details = container.querySelector("details");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByText("Pelanggan Kembali")).toBeInTheDocument();
  });

  it("kpi.growthMomPct null -> 'Data belum cukup' (BUKAN 0%/NaN)", () => {
    useAnalyticsExecutive.mockReturnValue({ ...BASE, kpi: { ...BASE.kpi, growthMomPct: null } });
    render(<ExecutiveTab />);
    expect(screen.getByText("Data belum cukup")).toBeInTheDocument();
  });

  it("renders Kesehatan Bisnis dengan deskripsi section", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText("Kesehatan Bisnis")).toBeInTheDocument();
    expect(screen.getByText(/hijau berarti sehat/)).toBeInTheDocument();
    expect(screen.getByText("Naik 25%")).toBeInTheDocument();
  });

  it("renders Tindakan Prioritas terkelompok Tinggi/Sedang/Rendah", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText("Tindakan Prioritas")).toBeInTheDocument();
    expect(screen.getByText("Prioritas Tinggi")).toBeInTheDocument();
    expect(screen.getByText("1 produk perlu segera ditambah stoknya.")).toBeInTheDocument();
    expect(screen.getByText("Termasuk: D-04-CTN.")).toBeInTheDocument();
    expect(screen.getByText("Prioritas Sedang")).toBeInTheDocument();
    expect(screen.getByText("3 produk stoknya mulai menipis.")).toBeInTheDocument();
    expect(screen.getByText("Prioritas Rendah")).toBeInTheDocument();
    expect(screen.getByText("Penjualan naik 25% dibanding bulan sebelumnya.")).toBeInTheDocument();
  });

  it("Tindakan Prioritas kosong semua -> pesan 'kondisi bisnis sedang baik', BUKAN section kosong", () => {
    useAnalyticsExecutive.mockReturnValue({ ...BASE, quickActionsPrioritized: EMPTY_QUICK_ACTIONS });
    render(<ExecutiveTab />);
    expect(screen.getByText("Kondisi bisnis Anda sedang baik.")).toBeInTheDocument();
    expect(screen.getByText("Tidak ada tindakan mendesak yang perlu dilakukan saat ini.")).toBeInTheDocument();
    expect(screen.queryByText("Prioritas Tinggi")).not.toBeInTheDocument();
  });

  it("hanya menampilkan grup prioritas yang punya isi (mis. hanya Sedang, tanpa Tinggi/Rendah)", () => {
    useAnalyticsExecutive.mockReturnValue({
      ...BASE,
      quickActionsPrioritized: { tinggi: [], sedang: [{ label: "2 produk lama belum terjual.", detail: null }], rendah: [] },
    });
    render(<ExecutiveTab />);
    expect(screen.queryByText("Prioritas Tinggi")).not.toBeInTheDocument();
    expect(screen.getByText("Prioritas Sedang")).toBeInTheDocument();
    expect(screen.queryByText("Prioritas Rendah")).not.toBeInTheDocument();
  });

  it("renders Risiko Terbesar (dulu Biggest Risk)", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText("Risiko Terbesar")).toBeInTheDocument();
    expect(screen.getByText("D-05-ABC — Stok Tidak Bergerak")).toBeInTheDocument();
  });

  it("renders Peluang Terbesar (dulu Biggest Opportunity)", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText("Peluang Terbesar")).toBeInTheDocument();
    expect(screen.getByText("D-02-SFN")).toBeInTheDocument();
  });

  // UX Audit 2026-07 (hilangkan duplikasi lintas-halaman): section "Performa
  // Terbaik" DIHAPUS dari halaman ini — bestProduct/bestCustomer/bestMarket
  // adalah data YANG SAMA PERSIS dengan section "Sorotan" di Ringkasan
  // Penjualan (OverviewTab "Produk Terlaris"/"Cabang Terbaik"/"Pelanggan
  // Terbaik"), jadi menampilkannya lagi di sini tidak menambah informasi
  // baru maupun membantu keputusan. Test ini mengunci bahwa section
  // tersebut TIDAK muncul lagi (regresi anti-duplikasi).
  it("TIDAK render 'Performa Terbaik' (dihapus 2026-07 — duplikat 1:1 dengan Sorotan di Ringkasan Penjualan)", () => {
    render(<ExecutiveTab />);
    expect(screen.queryByText("Performa Terbaik")).not.toBeInTheDocument();
    expect(screen.queryByText("Produk Terbaik")).not.toBeInTheDocument();
    expect(screen.queryByText("Pelanggan Terbaik")).not.toBeInTheDocument();
  });

  it("renders Insight Bisnis sebagai daftar teks", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText("Insight Bisnis")).toBeInTheDocument();
    expect(screen.getByText("Persentase keuntungan keseluruhan saat ini 24,0%.")).toBeInTheDocument();
  });

  it("renders Rekomendasi", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText("Rekomendasi")).toBeInTheDocument();
    expect(screen.getByText("Restock produk: D-04-CTN.")).toBeInTheDocument();
  });

  it("renders Prediksi Singkat sebagai 1 kartu naratif (BUKAN 3 KpiCard terpisah)", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText("Prediksi Singkat")).toBeInTheDocument();
    expect(screen.getByText("Perkiraan Penjualan Berikutnya")).toBeInTheDocument();
    expect(screen.getByText(/Keuntungan sekitar/)).toBeInTheDocument();
  });

  it("Prediksi Singkat: data belum cukup -> pesan eksplisit, BUKAN 0/kosong", () => {
    useAnalyticsExecutive.mockReturnValue({
      ...BASE,
      forecastSummary: {
        meta: { granularity: "week", historyBucketCount: 0, alpha: 0.3, lookbackPeriods: 8, nextPeriodeLabel: null },
        revenue: { history: [], ma: null, wma: null, es: null },
        profit: { history: [], ma: null, wma: null, es: null },
        sales: { history: [], ma: null, wma: null, es: null },
      },
    });
    render(<ExecutiveTab />);
    expect(screen.getByText("Riwayat penjualan belum cukup panjang untuk membuat perkiraan.")).toBeInTheDocument();
  });

  it("renders Ringkasan Persediaan sebagai 1 kartu naratif, TIDAK mengulang angka dead/critical stock (sudah ada di Tindakan Prioritas)", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText("Ringkasan Persediaan")).toBeInTheDocument();
    expect(screen.getByText("Nilai & Ketahanan Stok")).toBeInTheDocument();
    expect(screen.getByText(/Cukup untuk sekitar 45 hari/)).toBeInTheDocument();
  });

  it("SETIAP section punya deskripsi 1-2 kalimat (instruksi eksplisit redesign)", () => {
    render(<ExecutiveTab />);
    expect(screen.getByText(/Angka paling penting pada periode/)).toBeInTheDocument();
    expect(screen.getByText(/Apa yang sebaiknya Anda lakukan sekarang/)).toBeInTheDocument();
    expect(screen.getByText(/Produk yang berpotensi merugikan/)).toBeInTheDocument();
  });

  it("no ellipsis/truncate/overflow-hidden anywhere in rendered output", () => {
    const { container } = render(<ExecutiveTab />);
    const offenders = Array.from(container.querySelectorAll("*")).filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });
});
