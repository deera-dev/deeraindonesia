import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ProductEntryCard stub — uses the actual prop names BatchForm passes.
// entry.warnaList is exposed as text so tests can verify BatchForm's shared
// warna section (sharedAddWarna/sharedRemoveWarna) correctly syncs into
// every productEntries[i].warnaList (see BatchForm.jsx "Warna shared" block).
vi.mock("./ProductEntryCard", () => ({
  default: ({ entry, idx, canRemove, onRemove, onKodeAngkaChange }) => (
    <div data-testid="entry-card">
      <span>{entry._key ?? "entry"}</span>
      <span data-testid={`warna-${idx}`}>
        {(entry.warnaList ?? []).length > 0 ? entry.warnaList.join(",") : "tanpa warna"}
      </span>
      <input
        data-testid={`kode-angka-${idx}`}
        value={entry.kodeAngka}
        onChange={(e) => onKodeAngkaChange(e.target.value)}
      />
      {canRemove && (
        <button onClick={onRemove} data-testid={`remove-${idx}`}>
          Hapus
        </button>
      )}
    </div>
  ),
}));

vi.mock("@deera/shared/features/products/hooks", () => ({
  useInvalidateProducts: () => vi.fn(),
}));
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// hooks return PLAIN FUNCTIONS (not objects with mutateAsync)
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
vi.mock("../hooks", () => ({
  fetchHppTemplate: vi.fn().mockResolvedValue(null),
  useCreateBatches: () => mockCreate,
  useUpdateBatch: () => mockUpdate,
}));

import BatchForm from "./BatchForm";
import { toast } from "@deera/shared/features/toast/hooks";
import { fetchHppTemplate } from "../hooks";

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockResolvedValue([]);
  mockUpdate.mockResolvedValue({});
});

// Helper: submit the form directly (bypass disabled-button restrictions)
function submitForm(container) {
  fireEvent.submit(container.querySelector("form"));
}

describe("BatchForm — add mode (isEdit=false)", () => {
  it("renders batchNo input prefilled with PROD- pattern", () => {
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByDisplayValue(/^PROD-/);
    expect(input).toBeInTheDocument();
  });

  it("renders ProductEntryCard stub", () => {
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getAllByTestId("entry-card").length).toBeGreaterThan(0);
  });

  it("+ Tambah Produk adds another entry card", async () => {
    const user = userEvent.setup();
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    const before = screen.getAllByTestId("entry-card").length;
    await user.click(screen.getByText("+ Tambah Produk"));
    expect(screen.getAllByTestId("entry-card").length).toBe(before + 1);
  });

  it("shows remove button when multiple entries", async () => {
    const user = userEvent.setup();
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByText("+ Tambah Produk"));
    // second entry should have canRemove=true → Hapus button visible
    expect(screen.getAllByText("Hapus").length).toBeGreaterThan(0);
  });

  it("calls onCancel when Batal clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows error when saving with incomplete kode (fireEvent.submit bypasses disabled button)", async () => {
    const { container } = render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    submitForm(container);
    await waitFor(() => {
      // buildEntryDto throws "Produk 1: kode produk belum lengkap."
      expect(screen.getByText(/kode produk belum lengkap/i)).toBeInTheDocument();
    });
  });

  it("shows catatan textarea with Opsional placeholder", () => {
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByPlaceholderText("Opsional...")).toBeInTheDocument();
  });

  it("shows Buat Produk & Batch button in add mode", () => {
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Buat/)).toBeInTheDocument();
  });

  // ── Warna shared (2026-07): satu input warna berlaku utk semua productEntries ──
  it("shows exactly ONE shared warna input + Tambah button (not one per entry card)", async () => {
    const user = userEvent.setup();
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByText("+ Tambah Produk")); // now 2 entries
    expect(screen.getAllByPlaceholderText("Cth: HITAM").length).toBe(1);
    expect(screen.getAllByText("Tambah").length).toBe(1);
  });

  it("adding a shared warna updates warnaList for entry 1", async () => {
    const user = userEvent.setup();
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId("warna-0")).toHaveTextContent("tanpa warna");
    await user.type(screen.getByPlaceholderText("Cth: HITAM"), "HITAM");
    await user.click(screen.getByText("Tambah"));
    expect(screen.getByTestId("warna-0")).toHaveTextContent("HITAM");
  });

  it("adding a 2nd product entry automatically includes the already-added shared warna (not 'tanpa warna')", async () => {
    const user = userEvent.setup();
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText("Cth: HITAM"), "HITAM");
    await user.click(screen.getByText("Tambah"));
    await user.click(screen.getByText("+ Tambah Produk"));
    expect(screen.getByTestId("warna-1")).toHaveTextContent("HITAM");
  });

  it("removing a shared warna clears it from all entries' warnaList", async () => {
    const user = userEvent.setup();
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText("Cth: HITAM"), "HITAM");
    await user.click(screen.getByText("Tambah"));
    await user.click(screen.getByText("+ Tambah Produk"));
    expect(screen.getByTestId("warna-0")).toHaveTextContent("HITAM");
    expect(screen.getByTestId("warna-1")).toHaveTextContent("HITAM");
    // × chip button removes the shared warna
    await user.click(screen.getByText("×"));
    expect(screen.getByTestId("warna-0")).toHaveTextContent("tanpa warna");
    expect(screen.getByTestId("warna-1")).toHaveTextContent("tanpa warna");
  });

  it("supports adding multiple shared warna via Enter key", async () => {
    const user = userEvent.setup();
    render(<BatchForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByPlaceholderText("Cth: HITAM");
    await user.type(input, "HITAM{Enter}");
    await user.type(input, "MERAH{Enter}");
    expect(screen.getByTestId("warna-0")).toHaveTextContent("HITAM,MERAH");
  });
});

describe("BatchForm — edit mode (isEdit=true)", () => {
  const batch = {
    id: "b1",
    batch_no: "PROD-20240101-111",
    tanggal_produksi: "2024-01-01",
    catatan: "catatan edit",
    kode_produk: "D-07-OSK",
    nama_produk: "Gamis Oskelin",
    bahan: "OSK",
    sizes: [
      { size: "Midi", warna: [{ warna: "HITAM", qty: 5 }] },
    ],
    total_kain: 5,
    hpp_per_item: 0,
    bahan_dipakai: [],
    hpp_snapshot: null,
  };

  it("prefills batchNo from initial", () => {
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByDisplayValue("PROD-20240101-111")).toBeInTheDocument();
  });

  it("prefills catatan from initial", () => {
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByDisplayValue("catatan edit")).toBeInTheDocument();
  });

  it("shows Simpan Perubahan button in edit mode", () => {
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Simpan Perubahan")).toBeInTheDocument();
  });

  it("shows Identitas Produk section in edit mode", () => {
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Identitas Produk/)).toBeInTheDocument();
  });

  it("shows Tambah Produk ke Batch Ini section header in edit mode", () => {
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Tambah Produk ke Batch Ini/)).toBeInTheDocument();
  });

  it("prefills kodeAngka field from initial kode_produk", () => {
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByDisplayValue("07")).toBeInTheDocument();
  });

  it("calls onSave after successful update", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue({});
    render(<BatchForm initial={batch} onSave={onSave} onCancel={vi.fn()} />);
    await user.click(screen.getByText("Simpan Perubahan"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("shows toast.success after successful update", async () => {
    const user = userEvent.setup();
    mockUpdate.mockResolvedValue({});
    render(<BatchForm initial={batch} onSave={vi.fn().mockResolvedValue(undefined)} onCancel={vi.fn()} />);
    await user.click(screen.getByText("Simpan Perubahan"));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("shows error on update failure", async () => {
    const user = userEvent.setup();
    mockUpdate.mockRejectedValue(new Error("Network error"));
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByText("Simpan Perubahan"));
    await waitFor(() => expect(screen.getByText(/Network error/i)).toBeInTheDocument());
  });

  it("shows peringatan Template HPP belum ada saat fetchHppTemplate resolve null (default mock)", async () => {
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/Belum ada Template HPP/)).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/pemakaian bahan batch ini tidak tercatat di Stok Bahan/),
    ).toBeInTheDocument();
  });

  it("tidak menampilkan peringatan Template HPP saat template ditemukan", async () => {
    fetchHppTemplate.mockResolvedValueOnce({
      total_hpp: 90000,
      bahan_items: [{ nama_bahan: "Wolfis", qty_per_baju: 2, satuan: "yard" }],
    });
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/Template HPP ditemukan/)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Belum ada Template HPP/)).not.toBeInTheDocument();
  });

  it("the single-product edit-mode Warna section (warnaList/editAddWarna) is untouched — still has its own Tambah button", () => {
    // Edit mode renders TWO warna sections: the primary single-product one
    // (untouched, out of scope) AND the shared one for productEntries
    // ("Tambah Produk ke Batch Ini"). Both use the same "Cth: HITAM"
    // placeholder + "Tambah" label, so there should be exactly 2 of each
    // in edit mode (productEntries starts empty in edit mode, so shared
    // section still renders its own input even with 0 entries).
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getAllByPlaceholderText("Cth: HITAM").length).toBe(2);
  });

  it("adding a shared warna in edit mode does not affect the primary product's own warnaList section", async () => {
    const user = userEvent.setup();
    render(<BatchForm initial={batch} onSave={vi.fn()} onCancel={vi.fn()} />);
    // HITAM already exists as a chip in the primary product's own warna section (from initial.sizes)
    const before = screen.getAllByText("HITAM").length;
    const inputs = screen.getAllByPlaceholderText("Cth: HITAM");
    const tambahBtns = screen.getAllByText("Tambah");
    // Second input/button pair = shared section (first pair = primary edit-mode section)
    await user.type(inputs[1], "MERAH");
    await user.click(tambahBtns[1]);
    // HITAM count in primary section should be unchanged; MERAH is new
    expect(screen.getAllByText("HITAM").length).toBe(before);
    expect(screen.getAllByText("MERAH").length).toBeGreaterThan(0);
  });
});
