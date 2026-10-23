import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

const mockLookup = vi.fn();
const mockReceive = vi.fn().mockResolvedValue(undefined);
const mockUnassignCard = vi.fn().mockResolvedValue(undefined);
const mockMarkCardDone = vi.fn().mockResolvedValue(undefined);

const mockUseJahitCards = vi.fn();
const mockUseKaryawanJahit = vi.fn(() => ({ karyawanList: [{ id: "k1", nama: "Budi" }], loading: false }));

vi.mock("../hooks", () => ({
  useJahitCards: (...args) => mockUseJahitCards(...args),
  useKaryawanJahit: (...args) => mockUseKaryawanJahit(...args),
  useLookupJahitCard: () => ({ lookup: mockLookup, looking: false }),
  useReceiveCard: () => ({ receive: mockReceive, receiving: false }),
  useUnassignCard: () => mockUnassignCard,
  useMarkCardDone: () => mockMarkCardDone,
}));

vi.mock("./JahitColumn", () => ({
  default: ({ label, cards, active, onUnassign, onMarkDone, onPrint, onPrintGroup }) => (
    <div data-testid={`column-${label}`} data-active={String(active)}>
      <span>{label}: {cards.length}</span>
      {cards.length > 0 && (
        <button data-testid={`printgroup-${label}`} onClick={() => onPrintGroup(cards)}>
          CetakSemuaGrup
        </button>
      )}
      {cards.map((c) => (
        <div key={c.id}>
          <span>{c.kode_produk}</span>
          <button onClick={() => onUnassign(c)}>Unassign-{c.id}</button>
          <button onClick={() => onMarkDone(c)}>MarkDone-{c.id}</button>
          <button onClick={() => onPrint(c)}>Print-{c.id}</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("./JahitDoneSection", () => ({
  default: () => <div data-testid="done-section">DoneSection</div>,
}));

vi.mock("@deera/shared/components/ScanKartuModal", () => ({
  default: ({ onDetect, onClose }) => (
    <div data-testid="scan-modal">
      <button onClick={() => onDetect("11111111-2222-3333-4444-555555555555")}>SimulateScan</button>
      <button onClick={onClose}>CloseScan</button>
    </div>
  ),
}));

vi.mock("./ReceiveCardModal", () => ({
  default: ({ card, onConfirm, onClose }) => (
    <div data-testid="receive-modal">
      <span>Receiving {card.kode_produk}</span>
      <button onClick={() => onConfirm({ cardId: card.id, karyawanId: "k1", karyawanNama: "Budi", qty: 7 })}>
        ConfirmReceive
      </button>
      <button onClick={onClose}>CloseReceiveModal</button>
    </div>
  ),
}));

vi.mock("./PrintKartuModal", () => ({
  default: ({ card, onClose }) => (
    <div data-testid="print-modal">
      <span>Printing {card.kode_produk}</span>
      <button onClick={onClose}>ClosePrintModal</button>
    </div>
  ),
}));

vi.mock("./PrintKartuBatchModal", () => ({
  default: ({ cards, onClose }) => (
    <div data-testid="print-batch-modal">
      <span>Printing {cards.length} kartu</span>
      <button onClick={onClose}>ClosePrintBatchModal</button>
    </div>
  ),
}));

import ProduksiJahitPage from "./ProduksiJahitPage";
import { toast } from "@deera/shared/features/toast/hooks";

const cards = [
  { id: "c1", kode_produk: "D-038-KBR", nama_produk: "Gamis A", size: "Midi", warna: "ABU", qty: 10, status: "belum_assign" },
  { id: "c2", kode_produk: "D-016-KBR", nama_produk: "Gamis B", size: "Midi", warna: "PINK", qty: 5, status: "ready_finishing", karyawan_nama: "Budi" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseJahitCards.mockReturnValue({ cards, loading: false });
});

describe("ProduksiJahitPage", () => {
  it("menampilkan 2 bucket (Belum Diterima & Siap Finishing) dengan jumlah kartu yang benar", () => {
    render(<ProduksiJahitPage />);
    expect(screen.getByTestId("column-Belum Diterima")).toHaveTextContent("Belum Diterima: 1");
    expect(screen.getByTestId("column-Siap Finishing")).toHaveTextContent("Siap Finishing: 1");
  });

  it("menampilkan tab switcher dgn badge jumlah per bucket, default aktif = Belum Diterima", () => {
    render(<ProduksiJahitPage />);
    expect(screen.getByRole("button", { name: /Belum Diterima \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Siap Finishing \(1\)/ })).toBeInTheDocument();
    expect(screen.getByTestId("column-Belum Diterima")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("column-Siap Finishing")).toHaveAttribute("data-active", "false");
  });

  it("klik tab lain mengubah status aktif yang diteruskan ke JahitColumn", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByRole("button", { name: /Siap Finishing/ }));
    expect(screen.getByTestId("column-Siap Finishing")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("column-Belum Diterima")).toHaveAttribute("data-active", "false");
  });

  it("tab switcher tidak dirender saat loading atau kosong", () => {
    mockUseJahitCards.mockReturnValue({ cards: [], loading: true });
    render(<ProduksiJahitPage />);
    expect(screen.queryByRole("button", { name: /Belum Diterima/ })).not.toBeInTheDocument();
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

  it("search memfilter kartu di semua bucket", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.type(screen.getByPlaceholderText(/Cari kode/), "016");
    expect(screen.getByTestId("column-Belum Diterima")).toHaveTextContent("Belum Diterima: 0");
    expect(screen.getByTestId("column-Siap Finishing")).toHaveTextContent("Siap Finishing: 1");
  });

  it("tombol Scan & Terima Setoran membuka ScanKartuModal", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    expect(screen.queryByTestId("scan-modal")).not.toBeInTheDocument();
    await user.click(screen.getByText(/Scan & Terima Setoran/));
    expect(screen.getByTestId("scan-modal")).toBeInTheDocument();
  });

  it("scan sukses membuka ReceiveCardModal dengan kartu hasil lookup", async () => {
    mockLookup.mockResolvedValue({ id: "c1", kode_produk: "D-038-KBR", qty: 10 });
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText(/Scan & Terima Setoran/));
    await user.click(screen.getByText("SimulateScan"));

    expect(await screen.findByTestId("receive-modal")).toHaveTextContent("Receiving D-038-KBR");
    expect(mockLookup).toHaveBeenCalledWith("11111111-2222-3333-4444-555555555555");
  });

  it("menampilkan toast error kalau kartu hasil scan tidak ditemukan", async () => {
    mockLookup.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText(/Scan & Terima Setoran/));
    await user.click(screen.getByText("SimulateScan"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Kartu tidak ditemukan."));
  });

  it("konfirmasi di ReceiveCardModal memanggil receive() dan menutup modal", async () => {
    mockLookup.mockResolvedValue({ id: "c1", kode_produk: "D-038-KBR", nama_produk: "Gamis A", qty: 10 });
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText(/Scan & Terima Setoran/));
    await user.click(screen.getByText("SimulateScan"));
    await screen.findByTestId("receive-modal");

    await user.click(screen.getByText("ConfirmReceive"));
    expect(mockReceive).toHaveBeenCalledWith({
      cardId: "c1",
      karyawanId: "k1",
      karyawanNama: "Budi",
      qty: 7,
      kode: "D-038-KBR",
      nama: "Gamis A",
    });
    expect(toast.success).toHaveBeenCalled();
    expect(screen.queryByTestId("receive-modal")).not.toBeInTheDocument();
  });

  it("menampilkan pesan error toast kalau terima setoran gagal", async () => {
    mockLookup.mockResolvedValue({ id: "c1", kode_produk: "D-038-KBR", qty: 10 });
    mockReceive.mockRejectedValueOnce(new Error("network fail"));
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText(/Scan & Terima Setoran/));
    await user.click(screen.getByText("SimulateScan"));
    await screen.findByTestId("receive-modal");
    await user.click(screen.getByText("ConfirmReceive"));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("network fail"));
  });

  it("tombol batalkan terima memanggil hook terkait", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    await user.click(screen.getByText("Unassign-c2"));
    expect(mockUnassignCard).toHaveBeenCalledWith({ cardId: "c2", kode: "D-016-KBR", nama: "Gamis B" });
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

  it("klik Print membuka PrintKartuModal, tutup modal mengembalikan ke kondisi semula", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    expect(screen.queryByTestId("print-modal")).not.toBeInTheDocument();

    await user.click(screen.getByText("Print-c1"));
    expect(screen.getByTestId("print-modal")).toHaveTextContent("Printing D-038-KBR");

    await user.click(screen.getByText("ClosePrintModal"));
    expect(screen.queryByTestId("print-modal")).not.toBeInTheDocument();
  });

  it("klik Cetak Semua Kartu di satu bucket membuka PrintKartuBatchModal dgn semua kartu bucket itu, tutup mengembalikan ke kondisi semula", async () => {
    const user = userEvent.setup();
    render(<ProduksiJahitPage />);
    expect(screen.queryByTestId("print-batch-modal")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("printgroup-Belum Diterima"));
    expect(screen.getByTestId("print-batch-modal")).toHaveTextContent("Printing 1 kartu");

    await user.click(screen.getByText("ClosePrintBatchModal"));
    expect(screen.queryByTestId("print-batch-modal")).not.toBeInTheDocument();
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
