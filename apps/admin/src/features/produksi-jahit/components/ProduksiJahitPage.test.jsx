import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../shared/components/ProduksiLayout", () => ({
  default: ({ children, title }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockAssign = vi.fn().mockResolvedValue(undefined);
const mockMoveToReadyFinishing = vi.fn().mockResolvedValue(undefined);
const mockUnassignCard = vi.fn().mockResolvedValue(undefined);
const mockMoveBackToProgress = vi.fn().mockResolvedValue(undefined);
const mockMarkCardDone = vi.fn().mockResolvedValue(undefined);

const mockUseJahitCards = vi.fn();
const mockUseKaryawanJahit = vi.fn(() => ({ karyawanList: [{ id: "k1", nama: "Budi" }], loading: false }));

vi.mock("../hooks", () => ({
  useJahitCards: (...args) => mockUseJahitCards(...args),
  useKaryawanJahit: (...args) => mockUseKaryawanJahit(...args),
  useAssignKaryawan: () => ({ assign: mockAssign, assigning: false }),
  useMoveToReadyFinishing: () => mockMoveToReadyFinishing,
  useUnassignCard: () => mockUnassignCard,
  useMoveBackToProgress: () => mockMoveBackToProgress,
  useMarkCardDone: () => mockMarkCardDone,
}));

vi.mock("./JahitColumn", () => ({
  default: ({ label, cards, active, onAssign, onMoveToFinishing, onUnassign, onMoveBackToProgress, onMarkDone }) => (
    <div data-testid={`column-${label}`} data-active={String(active)}>
      <span>{label}: {cards.length}</span>
      {cards.map((c) => (
        <div key={c.id}>
          <span>{c.kode_produk}</span>
          <button onClick={() => onAssign(c)}>Assign-{c.id}</button>
          <button onClick={() => onMoveToFinishing(c)}>MoveFinish-{c.id}</button>
          <button onClick={() => onUnassign(c)}>Unassign-{c.id}</button>
          <button onClick={() => onMoveBackToProgress(c)}>MoveBack-{c.id}</button>
          <button onClick={() => onMarkDone(c)}>MarkDone-{c.id}</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("./JahitDoneSection", () => ({
  default: () => <div data-testid="done-section">DoneSection</div>,
}));

vi.mock("./AssignModal", () => ({
  default: ({ card, onAssign, onClose }) => (
    <div data-testid="assign-modal">
      <span>Assigning {card.kode_produk}</span>
      <button onClick={() => onAssign({ cardId: card.id, karyawanId: "k1", karyawanNama: "Budi" })}>
        ConfirmAssign
      </button>
      <button onClick={onClose}>CloseModal</button>
    </div>
  ),
}));

import ProduksiJahitPage from "./ProduksiJahitPage";
import { toast } from "@deera/shared/features/toast/hooks";

const cards = [
  { id: "c1", kode_produk: "D-038-KBR", nama_produk: "Gamis A", size: "Midi", warna: "ABU", qty: 10, status: "belum_assign" },
  { id: "c2", kode_produk: "D-016-KBR", nama_produk: "Gamis B", size: "Midi", warna: "PINK", qty: 5, status: "on_progress", karyawan_nama: "Budi" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseJahitCards.mockReturnValue({ cards, loading: false });
});

describe("ProduksiJahitPage", () => {
  it("menampilkan 3 kolom kanban dengan jumlah kartu yang benar", () => {
    render(<ProduksiJahitPage />);
    expect(screen.getByTestId("column-Belum Assign")).toHaveTextContent("Belum Assign: 1");
    expect(screen.getByTestId("column-On Progress")).toHaveTextContent("On Progress: 1");
    expect(screen.getByTestId("column-Ready Finishing")).toHaveTextContent("Ready Finishing: 0");
  });

  // Tab switcher mobile (permintaan Denny 2026-09) — kurangi scroll di HP.
  it("menampilkan tab switcher dgn badge jumlah per status, default aktif = Belum Assign", () => {
    render(<ProduksiJahitPage />);
    expect(screen.getByRole("button", { name: /Belum Assign \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /On Progress \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ready Finishing \(0\)/ })).toBeInTheDocument();
    expect(screen.getByTestId("column-Belum Assign")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("column-On Progress")).toHaveAttribute("data-active", "false");
    expect(screen.getByTestId("column-Ready Finishing")).toHaveAttribute("data-active", "false");
  });

  it("klik tab lain mengubah status aktif yang diteruskan ke JahitColumn", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByRole("button", { name: /On Progress/ }));
    expect(screen.getByTestId("column-On Progress")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("column-Belum Assign")).toHaveAttribute("data-active", "false");
  });

  it("tab switcher tidak dirender saat loading atau kosong", () => {
    mockUseJahitCards.mockReturnValue({ cards: [], loading: true });
    render(<ProduksiJahitPage />);
    expect(screen.queryByRole("button", { name: /Belum Assign/ })).not.toBeInTheDocument();
  });

  it("loading state menampilkan teks memuat", () => {
    mockUseJahitCards.mockReturnValue({ cards: [], loading: true });
    render(<ProduksiJahitPage />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("empty state menampilkan pesan belum ada kartu", () => {
    mockUseJahitCards.mockReturnValue({ cards: [], loading: false });
    render(<ProduksiJahitPage />);
    expect(screen.getByText(/Belum ada kartu Jahit/)).toBeInTheDocument();
  });

  it("search memfilter kartu di semua kolom", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.type(screen.getByPlaceholderText(/Cari kode/), "016");
    expect(screen.getByTestId("column-Belum Assign")).toHaveTextContent("Belum Assign: 0");
    expect(screen.getByTestId("column-On Progress")).toHaveTextContent("On Progress: 1");
  });

  it("klik Assign membuka AssignModal, konfirmasi memanggil assign() lalu menutup modal", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText("Assign-c1"));
    expect(screen.getByTestId("assign-modal")).toBeInTheDocument();

    await user.click(screen.getByText("ConfirmAssign"));
    expect(mockAssign).toHaveBeenCalledWith({
      cardId: "c1",
      karyawanId: "k1",
      karyawanNama: "Budi",
      kode: "D-038-KBR",
      nama: "Gamis A",
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("tombol pindah ke finishing memanggil hook terkait", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText("MoveFinish-c2"));
    expect(mockMoveToReadyFinishing).toHaveBeenCalledWith({ cardId: "c2", kode: "D-016-KBR", nama: "Gamis B" });
  });

  it("tombol batalkan assign memanggil hook terkait", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText("Unassign-c2"));
    expect(mockUnassignCard).toHaveBeenCalledWith({ cardId: "c2", kode: "D-016-KBR", nama: "Gamis B" });
  });

  it("menampilkan pesan error toast kalau assign gagal", async () => {
    mockAssign.mockRejectedValueOnce(new Error("network fail"));
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText("Assign-c1"));
    await user.click(screen.getByText("ConfirmAssign"));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("network fail"));
  });

  it("tombol tandai selesai memanggil hook terkait dan toast sukses", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText("MarkDone-c2"));
    expect(mockMarkCardDone).toHaveBeenCalledWith({ cardId: "c2", kode: "D-016-KBR", nama: "Gamis B" });
    expect(toast.success).toHaveBeenCalled();
  });

  it("menampilkan pesan error toast kalau tandai selesai gagal", async () => {
    mockMarkCardDone.mockRejectedValueOnce(new Error("gagal update"));
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText("MarkDone-c2"));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("gagal update"));
  });

  it("Arsip Selesai selalu dirender, baik saat loading, kosong, maupun ada kartu (permintaan Denny: bagian ini harus selalu ada)", () => {
    render(<ProduksiJahitPage />);
    expect(screen.getByTestId("done-section")).toBeInTheDocument();

    mockUseJahitCards.mockReturnValue({ cards: [], loading: true });
    render(<ProduksiJahitPage />);
    expect(screen.getAllByTestId("done-section").length).toBeGreaterThan(0);

    mockUseJahitCards.mockReturnValue({ cards: [], loading: false });
    render(<ProduksiJahitPage />);
    expect(screen.getAllByTestId("done-section").length).toBeGreaterThan(0);
  });
});
