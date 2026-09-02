import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createTransferMock = vi.fn();
vi.mock("@deera/shared/features/transfers/hooks", () => ({
  useCreateTransfer: () => createTransferMock,
}));

const stokState = { items: [], loading: false };
vi.mock("@deera/shared/features/stok/hooks", () => ({
  useStokByLocation: () => stokState,
}));

// stok_warna tidak punya created_at — urutan kode di form transfer ditentukan
// dari useProducts() (permintaan Denny 2026-08: samakan dgn urutan halaman
// Produk). Default kosong di sebagian besar test karena tidak relevan;
// test khusus urutan mengisi ini.
let productsState = [];
vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: () => ({ products: productsState, loading: false }),
}));

let draftState = null;
const saveDraftMock = vi.fn();
const clearDraftMock = vi.fn();
vi.mock("../hooks", () => ({
  readTransferDraft: () => draftState,
  useTransferDraftActions: () => ({ saveDraft: saveDraftMock, clearDraft: clearDraftMock }),
}));

const { default: TransferForm } = await import("./TransferForm");

function makeStokItem(overrides = {}) {
  return {
    id: "s1",
    kode: "D-01-OSK",
    size: "Midi",
    warna: "HITAM",
    gudang: 10,
    cideng: 5,
    tegalgubug: 3,
    ...overrides,
  };
}

beforeEach(() => {
  stokState.items = [];
  stokState.loading = false;
  productsState = [];
  draftState = null;
  saveDraftMock.mockReset();
  clearDraftMock.mockReset();
  createTransferMock.mockReset();
});

describe("TransferForm", () => {
  it("menampilkan header 'Buat Transfer Stok' untuk mode baru", () => {
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText(/Buat Transfer Stok/i)).toBeInTheDocument();
  });

  it("menampilkan header 'Edit Transfer' untuk mode edit", () => {
    const init = {
      from_location: "gudang",
      to_location: "cideng",
      notes: "",
      items: [],
    };
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} initialData={init} />);
    expect(screen.getByText(/Edit Transfer/i)).toBeInTheDocument();
  });

  it("memanggil onClose saat klik backdrop", async () => {
    const onClose = vi.fn();
    const { container } = render(<TransferForm onClose={onClose} onSaved={vi.fn()} />);
    await userEvent.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("memanggil onClose saat klik ✕", async () => {
    const onClose = vi.fn();
    render(<TransferForm onClose={onClose} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalled();
  });

  it("memanggil onClose saat klik Batal", async () => {
    const onClose = vi.fn();
    render(<TransferForm onClose={onClose} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("menampilkan pesan loading stok", () => {
    stokState.loading = true;
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText(/memuat stok/i)).toBeInTheDocument();
  });

  it("menampilkan pesan stok kosong saat items=[]", () => {
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText(/tidak ada stok/i)).toBeInTheDocument();
  });

  it("menampilkan pesan 'tidak ada hasil' saat search tidak match", async () => {
    stokState.items = [makeStokItem()];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/cari kode/i);
    await userEvent.type(searchInput, "XYZNOTFOUND");
    expect(screen.getByText(/tidak ada hasil/i)).toBeInTheDocument();
  });

  it("menampilkan item stok dengan kode, size, warna, dan qty tersedia", () => {
    stokState.items = [makeStokItem()];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText(/10 pcs tersedia/)).toBeInTheDocument();
  });

  it("stepper +1 menambah qty", async () => {
    stokState.items = [makeStokItem({ gudang: 10 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("+"));
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  it("stepper -1 mengurangi qty (tidak di bawah 0)", async () => {
    stokState.items = [makeStokItem({ gudang: 10 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("+"));
    await userEvent.click(screen.getByText("−"));
    const input = screen.getAllByPlaceholderText("0")[0];
    expect(input.value).toBe("");
  });

  it("Seri Penuh +1 per item kode", async () => {
    stokState.items = [makeStokItem({ id: "s1", size: "Midi", gudang: 5 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("Seri Penuh"));
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  it("Reset menghapus semua qty dalam satu kode", async () => {
    stokState.items = [makeStokItem({ id: "s1", gudang: 5 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("+"));
    await userEvent.click(screen.getByText("Reset"));
    const input = screen.getAllByPlaceholderText("0")[0];
    expect(input.value).toBe("");
  });

  it("submit tanpa item: tombol submit disabled saat belum ada item dipilih", () => {
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText("Buat Surat Jalan")).toBeDisabled();
  });

  it("submit dari==tujuan: menampilkan error 'tidak boleh sama'", async () => {
    stokState.items = [makeStokItem({ gudang: 10 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    // Default from=gudang, to=cideng. Change to to gudang
    const selects = screen.getAllByRole("combobox");
    // selects[1] is "Ke Lokasi"
    await userEvent.selectOptions(selects[1], "gudang");
    // add item
    await userEvent.click(screen.getByText("+"));
    await userEvent.click(screen.getByText("Buat Surat Jalan"));
    expect(screen.getByText(/tidak boleh sama/i)).toBeInTheDocument();
  });

  it("submit berhasil: memanggil createTransfer, onSaved, clearDraft", async () => {
    const savedTransfer = { transfer_no: "SJ-DONE-001", id: "t99", items: [] };
    createTransferMock.mockResolvedValue(savedTransfer);
    stokState.items = [makeStokItem({ gudang: 10 })];
    const onSaved = vi.fn();
    render(<TransferForm onClose={vi.fn()} onSaved={onSaved} />);
    await userEvent.click(screen.getByText("+"));
    await userEvent.click(screen.getByText("Buat Surat Jalan"));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedTransfer));
    expect(clearDraftMock).toHaveBeenCalled();
  });

  it("submit error: menampilkan pesan error", async () => {
    createTransferMock.mockRejectedValue(new Error("Jaringan putus"));
    stokState.items = [makeStokItem({ gudang: 10 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("+"));
    await userEvent.click(screen.getByText("Buat Surat Jalan"));
    await waitFor(() => expect(screen.getByText("Jaringan putus")).toBeInTheDocument());
  });

  it("banner draft tersimpan saat ada draft dengan selected", () => {
    draftState = { fromLoc: "gudang", toLoc: "cideng", selected: { "D-01-OSK__Midi__HITAM": 2 }, notes: "" };
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText(/draft tersimpan dipulihkan/i)).toBeInTheDocument();
  });

  it("Hapus draft memanggil clearDraft dan menyembunyikan banner", async () => {
    draftState = { fromLoc: "gudang", toLoc: "cideng", selected: { "D-01-OSK__Midi__HITAM": 2 }, notes: "" };
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("Hapus draft"));
    expect(clearDraftMock).toHaveBeenCalled();
    expect(screen.queryByText(/draft tersimpan/i)).not.toBeInTheDocument();
  });

  it("Lokasi lain → toggle custom to-loc input", async () => {
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText(/lokasi lain/i));
    expect(screen.getByPlaceholderText(/Cth: Reseller/i)).toBeInTheDocument();
  });

  it("customToLoc kosong: tombol submit disabled saat teks lokasi belum diisi", async () => {
    stokState.items = [makeStokItem({ gudang: 10 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("+"));
    await userEvent.click(screen.getByText(/lokasi lain/i));
    // customToLocText is empty -> button disabled
    expect(screen.getByText("Buat Surat Jalan")).toBeDisabled();
  });

  it("RingkasanAccordion toggle buka/tutup", async () => {
    stokState.items = [makeStokItem({ gudang: 10 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("+"));
    // Ringkasan muncul
    expect(screen.getByText(/ringkasan transfer/i)).toBeInTheDocument();
    // Buka accordion
    await userEvent.click(screen.getByText(/ringkasan transfer/i));
    // Kode muncul di accordion body
    expect(screen.getAllByText("D-01-OSK").length).toBeGreaterThan(0);
  });

  it("fromLoc change reset selected", async () => {
    stokState.items = [makeStokItem({ gudang: 10 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("+"));
    // Change fromLoc
    const fromSelect = screen.getAllByRole("combobox")[0];
    await userEvent.selectOptions(fromSelect, "cideng");
    // qty should be reset
    expect(screen.queryByDisplayValue("1")).not.toBeInTheDocument();
  });

  it("warningnya muncul saat from==to (preset)", async () => {
    stokState.items = [makeStokItem({ gudang: 10 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[1], "gudang");
    expect(screen.getByText(/tidak boleh sama/i)).toBeInTheDocument();
  });

  it("mengurutkan kode sesuai urutan produk resmi (dari useProducts), bukan alfabet (permintaan Denny 2026-08)", () => {
    // D-009-LDN dibuat lebih baru dari D-01-DNM -> harus tampil duluan,
    // walau "D-009-LDN" > "D-01-DNM" secara alfabet string.
    productsState = [
      { kode: "D-009-LDN", nama: "Midi Jumbo X", created_at: "2026-03-01" },
      { kode: "D-01-DNM", nama: "Midi Y", created_at: "2026-01-01" },
    ];
    stokState.items = [
      makeStokItem({ id: "s1", kode: "D-01-DNM", size: "Midi", warna: "BIRU" }),
      makeStokItem({ id: "s2", kode: "D-009-LDN", size: "Midi Jumbo", warna: "COKLAT" }),
    ];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    const kodeHeaders = screen.getAllByText(/^D-(009-LDN|01-DNM)$/);
    expect(kodeHeaders.map((el) => el.textContent)).toEqual(["D-009-LDN", "D-01-DNM"]);
  });

  it("kode yang tidak ada di daftar produk ditaruh paling akhir (tiebreak alfabet)", () => {
    productsState = [{ kode: "D-01-DNM", nama: "Midi Y", created_at: "2026-01-01" }];
    stokState.items = [
      makeStokItem({ id: "s1", kode: "D-99-ZZZ", size: "Midi", warna: "BIRU" }), // tidak ada di products
      makeStokItem({ id: "s2", kode: "D-01-DNM", size: "Midi", warna: "HITAM" }),
    ];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    const kodeHeaders = screen.getAllByText(/^D-(99-ZZZ|01-DNM)$/);
    expect(kodeHeaders.map((el) => el.textContent)).toEqual(["D-01-DNM", "D-99-ZZZ"]);
  });

  // ── Tombol swap lokasi asal ↔ tujuan (permintaan Denny 2026-09:
  // "tambahin button swap buat di transfer stok, misal dari gudang ke
  // cideng dengan button swap akan jadi dari cideng ke gudang") ──────────

  it("tombol swap menukar Dari Lokasi <-> Ke Lokasi (preset)", async () => {
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("gudang"); // Dari
    expect(selects[1]).toHaveValue("cideng"); // Ke

    await userEvent.click(screen.getByRole("button", { name: /tukar lokasi/i }));

    expect(selects[0]).toHaveValue("cideng");
    expect(selects[1]).toHaveValue("gudang");
  });

  it("tombol swap mereset pilihan barang (fromLoc berubah -> stokItems scope beda)", async () => {
    stokState.items = [makeStokItem({ gudang: 10 })];
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("+"));
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /tukar lokasi/i }));

    expect(screen.queryByDisplayValue("1")).not.toBeInTheDocument();
  });

  it("tombol swap disabled saat Ke Lokasi custom (tidak ada swap simetris)", async () => {
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText(/lokasi lain/i));
    expect(screen.getByRole("button", { name: /tukar lokasi/i })).toBeDisabled();
  });

  it("klik swap saat custom aktif tidak mengubah apa pun (no-op)", async () => {
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText(/lokasi lain/i));
    const swapBtn = screen.getByRole("button", { name: /tukar lokasi/i });
    await userEvent.click(swapBtn); // disabled, no-op
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("gudang");
  });

  it("mode edit: mengisi initialData ke form (from/to/notes)", () => {
    const init = {
      from_location: "cideng",
      to_location: "tegalgubug",
      items: [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 3 }],
    };
    render(<TransferForm onClose={vi.fn()} onSaved={vi.fn()} initialData={init} />);
    // Lokasi asal terisi dari initialData
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("cideng");
  });
});
