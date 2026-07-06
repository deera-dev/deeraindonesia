import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../hooks", () => ({
  detectDupes: vi.fn(),
  useMergeDupes: vi.fn(),
}));

import MergeDupeModal from "./MergeDupeModal";
import { detectDupes, useMergeDupes } from "../hooks";

const dupeGroups = [
  [
    { id: "a1", nama_bahan: "Wolfis",  kode_bahan: "WLF", satuan: "yard", tanggal: "2024-01-10", jumlah: 5, total_harga: 50000 },
    { id: "a2", nama_bahan: "Wolfis",  kode_bahan: "WLF", satuan: "yard", tanggal: "2024-01-10", jumlah: 3, total_harga: 30000 },
  ],
];

beforeEach(() => {
  vi.clearAllMocks();
  useMergeDupes.mockReturnValue(vi.fn().mockResolvedValue(0));
});

describe("MergeDupeModal", () => {
  it("shows loading while detectDupes is running", async () => {
    detectDupes.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<MergeDupeModal table="bahan_pembelian" onClose={() => {}} />);
    expect(screen.getByText("Mendeteksi duplikat...")).toBeInTheDocument();
  });

  it("shows 'tidak ada duplikat' when no dupes found", async () => {
    detectDupes.mockResolvedValue([]);
    render(<MergeDupeModal table="bahan_pembelian" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Tidak ada duplikat ditemukan/)).toBeInTheDocument());
  });

  it("shows dupe groups when found", async () => {
    detectDupes.mockResolvedValue(dupeGroups);
    render(<MergeDupeModal table="bahan_pembelian" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("1 grup duplikat ditemukan")).toBeInTheDocument());
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
  });

  it("shows [SIMPAN] for first entry and [HAPUS] for rest", async () => {
    detectDupes.mockResolvedValue(dupeGroups);
    render(<MergeDupeModal table="bahan_pembelian" onClose={() => {}} />);
    await waitFor(() => screen.getByText("[SIMPAN]"));
    expect(screen.getByText("[SIMPAN]")).toBeInTheDocument();
    expect(screen.getByText("[HAPUS]")).toBeInTheDocument();
  });

  it("calls onClose when × button clicked", async () => {
    const user = userEvent.setup();
    detectDupes.mockResolvedValue([]);
    const onClose = vi.fn();
    render(<MergeDupeModal table="bahan_pembelian" onClose={onClose} />);
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Batal clicked after loading dupes", async () => {
    const user = userEvent.setup();
    detectDupes.mockResolvedValue(dupeGroups);
    const onClose = vi.fn();
    render(<MergeDupeModal table="bahan_pembelian" onClose={onClose} />);
    await waitFor(() => screen.getByText("Batal"));
    await user.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls mergeDupes and shows done state on success", async () => {
    const user = userEvent.setup();
    detectDupes.mockResolvedValue(dupeGroups);
    const mergeFn = vi.fn().mockResolvedValue(0);
    useMergeDupes.mockReturnValue(mergeFn);
    render(<MergeDupeModal table="bahan_pembelian" onClose={() => {}} />);
    await waitFor(() => screen.getByText(/Gabung 1 Grup/));
    await user.click(screen.getByText(/Gabung 1 Grup/));
    await waitFor(() => expect(screen.getByText("Penggabungan berhasil!")).toBeInTheDocument());
    expect(mergeFn).toHaveBeenCalledWith(dupeGroups);
  });

  it("shows done screen Tutup button that calls onClose", async () => {
    const user = userEvent.setup();
    detectDupes.mockResolvedValue(dupeGroups);
    useMergeDupes.mockReturnValue(vi.fn().mockResolvedValue(0));
    const onClose = vi.fn();
    render(<MergeDupeModal table="bahan_pembelian" onClose={onClose} />);
    await waitFor(() => screen.getByText(/Gabung 1 Grup/));
    await user.click(screen.getByText(/Gabung 1 Grup/));
    await waitFor(() => screen.getByText("Tutup"));
    await user.click(screen.getByText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });

  it("stays on result step when merge has errors", async () => {
    const user = userEvent.setup();
    detectDupes.mockResolvedValue(dupeGroups);
    useMergeDupes.mockReturnValue(vi.fn().mockResolvedValue(2)); // 2 errors
    render(<MergeDupeModal table="bahan_pembelian" onClose={() => {}} />);
    await waitFor(() => screen.getByText(/Gabung 1 Grup/));
    await user.click(screen.getByText(/Gabung 1 Grup/));
    await waitFor(() => expect(screen.queryByText("Penggabungan berhasil!")).not.toBeInTheDocument());
    expect(screen.getByText("1 grup duplikat ditemukan")).toBeInTheDocument();
  });

  it("calls onClose when backdrop clicked", async () => {
    const user = userEvent.setup();
    detectDupes.mockResolvedValue([]);
    const onClose = vi.fn();
    const { container } = render(<MergeDupeModal table="bahan_pembelian" onClose={onClose} />);
    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows bahan_pinjam label for pinjam table", async () => {
    detectDupes.mockResolvedValue([]);
    render(<MergeDupeModal table="bahan_pinjam" onClose={() => {}} />);
    await waitFor(() => screen.getByText(/Tidak ada duplikat/));
    expect(screen.getByText(/Bahan Pinjam/)).toBeInTheDocument();
  });
});
