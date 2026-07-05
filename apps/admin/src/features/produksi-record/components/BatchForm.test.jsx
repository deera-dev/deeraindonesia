import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ProductEntryCard stub — uses the actual prop names BatchForm passes
vi.mock("./ProductEntryCard", () => ({
  default: ({ entry, idx, canRemove, onRemove, onKodeAngkaChange }) => (
    <div data-testid="entry-card">
      <span>{entry._key ?? "entry"}</span>
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
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
