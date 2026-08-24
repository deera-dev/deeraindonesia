import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));
vi.mock("../../../shared/components/AdminSidebar", () => ({ default: () => <div data-testid="sidebar" /> }));

const mockUseStokAll = vi.fn();
const mockUseSoldKodes = vi.fn();
vi.mock("../hooks", () => ({
  useStokAll: () => mockUseStokAll(),
  useSoldKodes: (...args) => mockUseSoldKodes(...args),
}));

import PasarRestockPage from "./PasarRestockPage";

// Catatan: halaman ini SENGAJA tidak pernah memanggil useProducts/products.nama
// (permintaan Denny 2026-08) — identifikasi produk pakai `kode` langsung, jadi
// tidak ada mock untuk @deera/shared/features/products/hooks di sini.

// D-01-OSK: menipis di cideng (cideng cuma 1, target 3, total sistem 20 -> butuh 2)
// D-02-SFN: aman di cideng (cideng 5, sudah >= target 3), tapi sekaligus jadi
//           kandidat "tidak bergerak" karena tidak ada di soldKodes.
const stokRows = [
  { id: "r1", kode: "D-01-OSK", size: "Midi", warna: "_", gudang: 15, cideng: 1, tegalgubug: 4 },
  { id: "r2", kode: "D-02-SFN", size: "Gamis", warna: "MERAH", gudang: 4, cideng: 5, tegalgubug: 1 },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <PasarRestockPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseStokAll.mockReturnValue({ stok: stokRows, loading: false });
  mockUseSoldKodes.mockReturnValue({ soldKodes: [], loading: false }); // tidak ada yg laku -> D-02-SFN tidak bergerak
});

describe("PasarRestockPage", () => {
  it("renders judul halaman", () => {
    renderPage();
    expect(screen.getByText("Persiapan Pasar")).toBeInTheDocument();
  });

  it("default market picker terpilih salah satu Cideng/Tegalgubug", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Cideng" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tegalgubug" })).toBeInTheDocument();
  });

  it("menampilkan item menipis (by kode) di daftar Perlu Direstock utk pasar Cideng", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cideng" }));
    const restockSection = screen.getByText("Perlu Direstock").closest("section");
    expect(restockSection).toHaveTextContent("D-01-OSK");
    expect(restockSection).toHaveTextContent("Menipis · butuh 2");
  });

  it("tidak menampilkan item yang stoknya masih aman di daftar restock", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cideng" }));
    // D-02-SFN aman (cideng 5 sudah >= target 3) -> tidak muncul di section restock,
    // tapi MUNCUL di section tidak bergerak (soldKodes kosong).
    const restockSection = screen.getByText("Perlu Direstock").closest("section");
    expect(restockSection).not.toHaveTextContent("D-02-SFN");
  });

  it("menampilkan item tidak bergerak (by kode)", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cideng" }));
    const tidakBergerakSection = screen.getByText("Tidak Bergerak").closest("section");
    expect(tidakBergerakSection).toHaveTextContent("D-02-SFN");
  });

  it("ganti market ke Tegalgubug memanggil useSoldKodes dengan lokasi baru", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Tegalgubug" }));
    expect(mockUseSoldKodes).toHaveBeenLastCalledWith("tegalgubug", expect.any(String));
  });

  it("shows loading state", () => {
    mockUseStokAll.mockReturnValue({ stok: [], loading: true });
    renderPage();
    expect(screen.getAllByText("Memuat...").length).toBeGreaterThan(0);
  });

  it("menggabungkan banyak baris size/warna kode yang sama jadi satu kartu, tapi rincian per warna tetap kelihatan (permintaan Denny 2026-08)", async () => {
    const user = userEvent.setup();
    mockUseStokAll.mockReturnValue({
      stok: [
        // cideng cuma 1, target 3 -> menipis (perlu dibawa)
        { id: "r1", kode: "D-04-MLT", size: "Midi", warna: "HITAM", gudang: 10, cideng: 1, tegalgubug: 3 },
        // cideng 5 sudah >= target 3 -> aman
        { id: "r2", kode: "D-04-MLT", size: "Gamis", warna: "MERAH", gudang: 5, cideng: 5, tegalgubug: 1 },
      ],
      loading: false,
    });
    mockUseSoldKodes.mockReturnValue({ soldKodes: [], loading: false });
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cideng" }));
    const restockSection = screen.getByText("Perlu Direstock").closest("section");
    // Hanya SATU kartu "D-04-MLT" di section restock (bukan 2, satu per size/warna)
    const { getAllByText, getByText } = within(restockSection);
    expect(getAllByText("D-04-MLT")).toHaveLength(1);
    // Tapi kedua rincian warna tetap kelihatan di dalam kartu itu, dengan
    // status masing-masing — supaya jelas warna mana yang perlu dibawa.
    expect(getByText("Midi · HITAM")).toBeInTheDocument();
    expect(getByText("Gamis · MERAH")).toBeInTheDocument();
    expect(restockSection).toHaveTextContent("Menipis");
    expect(restockSection).toHaveTextContent("Cukup");
  });

  it("menandai 'Hampir Habis' kalau total stok sistem warna itu < 3 (bukan cuma 'Menipis' biasa)", async () => {
    const user = userEvent.setup();
    mockUseStokAll.mockReturnValue({
      // total sistem = 2 (gudang 1 + tegalgubug 1), cideng 0 -> tidak mungkin capai target 3
      stok: [{ id: "r1", kode: "D-06-HBS", size: "Midi", warna: "BIRU", gudang: 1, cideng: 0, tegalgubug: 1 }],
      loading: false,
    });
    mockUseSoldKodes.mockReturnValue({ soldKodes: [], loading: false });
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cideng" }));
    const restockSection = screen.getByText("Perlu Direstock").closest("section");
    expect(restockSection).toHaveTextContent("D-06-HBS");
    expect(restockSection).toHaveTextContent("Hampir Habis · bawa 2");
    expect(restockSection).toHaveTextContent("bawa balik ke gudang dulu");
  });

  it("shows empty state kalau tidak ada yang perlu direstock", async () => {
    const user = userEvent.setup();
    mockUseStokAll.mockReturnValue({
      stok: [{ id: "r3", kode: "D-03-AMN", gudang: 1, cideng: 5, tegalgubug: 1 }],
      loading: false,
    });
    mockUseSoldKodes.mockReturnValue({ soldKodes: ["D-03-AMN"], loading: false });
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cideng" }));
    expect(screen.getByText(/masih aman/)).toBeInTheDocument();
    expect(screen.getByText(/masih bergerak/)).toBeInTheDocument();
  });
});
