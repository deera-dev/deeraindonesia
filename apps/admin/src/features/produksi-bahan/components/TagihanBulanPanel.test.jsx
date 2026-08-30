import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagihanBulanPanel from "./TagihanBulanPanel";

vi.mock("./TagihanShareModal", () => ({
  default: ({ groups, onClose }) => (
    <div data-testid="tagihan-share-modal">
      <span data-testid="tagihan-share-group-count">{groups?.length ?? 0}</span>
      <button onClick={onClose}>close-share</button>
    </div>
  ),
}));

// Items with belum status and jatuh_tempo
const pembelianItems = [
  { id: 1, status_bayar: "belum", jatuh_tempo: "2024-03-15", total_harga: 50000, nama_bahan: "Wolfis", motif: null, tanggal: "2024-02-01", jumlah: 5, satuan: "yard", harga_satuan: 10000 },
  { id: 2, status_bayar: "belum", jatuh_tempo: "2024-04-01", total_harga: 30000, nama_bahan: "Sifon",  motif: "Bunga", tanggal: "2024-02-15", jumlah: 3, satuan: "yard", harga_satuan: 9000 },
  { id: 3, status_bayar: "lunas", jatuh_tempo: "2024-03-20", total_harga: 20000, nama_bahan: "Katun",  motif: null, tanggal: "2024-02-10", jumlah: 2, satuan: "meter", harga_satuan: 10000 },
];

describe("TagihanBulanPanel", () => {
  it("returns null when no belum-lunas items with jatuh_tempo", () => {
    const { container } = render(<TagihanBulanPanel items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when all items are lunas", () => {
    const lunas = [{ status_bayar: "lunas", jatuh_tempo: "2024-03-01", total_harga: 5000 }];
    const { container } = render(<TagihanBulanPanel items={lunas} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows grand total of belum-lunas items", () => {
    render(<TagihanBulanPanel items={pembelianItems} />);
    // 50000 + 30000 = 80000
    expect(screen.getByText(/80\.000/)).toBeInTheDocument();
  });

  it("expands when header button clicked", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    // Not expanded initially — group items not visible
    expect(screen.queryByText("Wolfis")).not.toBeInTheDocument();
    // Click to expand
    const btn = screen.getByText(/Tagihan per Bulan/).closest("button");
    await user.click(btn);
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
  });

  it("shows tombol Bagikan / Simpan when expanded", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    await user.click(screen.getByText(/Tagihan per Bulan/).closest("button"));
    expect(screen.getByText(/Bagikan \/ Simpan/i)).toBeInTheDocument();
  });

  it("shows TagihanShareModal (dengan SEMUA grup bulan) saat Bagikan diklik", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    await user.click(screen.getByText(/Tagihan per Bulan/).closest("button"));
    await user.click(screen.getByText(/Bagikan \/ Simpan/i));
    expect(screen.getByTestId("tagihan-share-modal")).toBeInTheDocument();
    // 2 grup bulan (Maret & April)
    expect(screen.getByTestId("tagihan-share-group-count").textContent).toBe("2");
  });

  it("closes TagihanShareModal when close-share clicked", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    await user.click(screen.getByText(/Tagihan per Bulan/).closest("button"));
    await user.click(screen.getByText(/Bagikan \/ Simpan/i));
    await user.click(screen.getByText("close-share"));
    expect(screen.queryByTestId("tagihan-share-modal")).not.toBeInTheDocument();
  });

  it("TagihanShareModal TIDAK dirender secara default", () => {
    render(<TagihanBulanPanel items={pembelianItems} />);
    expect(screen.queryByTestId("tagihan-share-modal")).not.toBeInTheDocument();
  });

  it("shows motif when present", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    await user.click(screen.getByText(/Tagihan per Bulan/).closest("button"));
    expect(screen.getByText(/Bunga/)).toBeInTheDocument();
  });

  it("collapses when header clicked again", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    const btn = screen.getByText(/Tagihan per Bulan/).closest("button");
    await user.click(btn); // expand
    await user.click(btn); // collapse); // collapse
    expect(screen.queryByText(/Bunga/)).not.toBeInTheDocument();
  });

  it("shows harga per satuan × jumlah untuk tiap item (harga_satuan × 5 yard = total)", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    await user.click(screen.getByText(/Tagihan per Bulan/).closest("button"));
    // item id=1: harga_satuan 10000, jumlah 5 yard
    expect(screen.getByText(/Rp\s*10\.000\/yard\s*×\s*5\s*yard/)).toBeInTheDocument();
    // item id=2: harga_satuan 9000, jumlah 3 yard
    expect(screen.getByText(/Rp\s*9\.000\/yard\s*×\s*3\s*yard/)).toBeInTheDocument();
  });

  it("TIDAK mengulang qty di baris 'Beli' (sudah ada di baris harga×qty) & menggabung Beli+Tempo satu baris", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    await user.click(screen.getByText(/Tagihan per Bulan/).closest("button"));
    const wolfisRow = screen.getByText("Wolfis").closest("div").parentElement;
    // Baris "Beli" digabung dengan "Tempo" dalam satu <p>, TIDAK ada "· 5 yard"
    expect(wolfisRow).toHaveTextContent("Beli 01 Februari 2024 · Tempo: 15 Maret 2024");
    expect(wolfisRow).not.toHaveTextContent("Beli 01 Februari 2024 · 5 yard");
  });

  // ── Prop status="lunas" (Riwayat Lunas) ───────────────────────────────────
  // permintaan Denny 2026-08: "bahan yang udh lunas, lihat tagihannya
  // dimana ya? ga ada tempat buat lihat tagihan sebelumnya, yang sudah lunas"

  it("status='lunas': returns null kalau tidak ada item lunas", () => {
    const belumSaja = pembelianItems.filter((r) => r.status_bayar === "belum");
    const { container } = render(<TagihanBulanPanel items={belumSaja} status="lunas" />);
    expect(container.firstChild).toBeNull();
  });

  it("status='lunas': menampilkan judul 'Riwayat Lunas per Bulan' & total item lunas saja", () => {
    render(<TagihanBulanPanel items={pembelianItems} status="lunas" />);
    expect(screen.getByText("Riwayat Lunas per Bulan")).toBeInTheDocument();
    // item id=3 (Katun) satu-satunya yg lunas, total_harga 20000
    expect(screen.getByText(/20\.000/)).toBeInTheDocument();
  });

  it("status='lunas': expand menampilkan item lunas (Katun), bukan item belum (Wolfis/Sifon)", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} status="lunas" />);
    await user.click(screen.getByText("Riwayat Lunas per Bulan").closest("button"));
    expect(screen.getByText("Katun")).toBeInTheDocument();
    expect(screen.queryByText("Wolfis")).not.toBeInTheDocument();
    expect(screen.queryByText("Sifon")).not.toBeInTheDocument();
  });

  it("status default ('belum') tetap judul 'Tagihan per Bulan (Belum Lunas)' & tidak menampilkan item lunas", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    expect(screen.getByText("Tagihan per Bulan (Belum Lunas)")).toBeInTheDocument();
    await user.click(screen.getByText("Tagihan per Bulan (Belum Lunas)").closest("button"));
    expect(screen.queryByText("Katun")).not.toBeInTheDocument();
  });
});
