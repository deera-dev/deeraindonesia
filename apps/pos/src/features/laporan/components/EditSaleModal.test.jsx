import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));

vi.mock("../../../hooks/useProducts", () => ({
  useProducts: vi.fn(() => ({ products: [], loading: false })),
}));

vi.mock("../../kasir/components/BuyerInput", () => ({
  default: ({ value, onChange, disabled }) => (
    <input
      data-testid="buyer-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled ?? false}
    />
  ),
}));

import EditSaleModal from "./EditSaleModal";
import { useProducts } from "../../../hooks/useProducts";

const simpleSale = {
  id: "s1", type: "sale", location: "gudang",
  buyer_name: "BUDI", buyer_hp: "081", total: 100000, discount: 0,
  items: [{ kode: "D-01", size: "Midi", harga: 100000, hpp: 80000, qty: 2, warna: null }],
};

const warnaSale = {
  id: "s2", type: "sale", location: "gudang",
  buyer_name: "ANI", buyer_hp: "", total: 200000, discount: 0,
  items: [
    {
      kode: "D-02", size: "Gamis", harga: 100000, hpp: 80000, qty: null,
      warna: [{ nama: "HITAM", qty: 1 }, { nama: "MERAH", qty: 2 }],
    },
  ],
};

const twoItemSale = {
  ...simpleSale,
  items: [
    { kode: "D-01", size: "Midi", harga: 100000, hpp: 0, qty: 1, warna: null },
    { kode: "D-02", size: "Gamis", harga: 120000, hpp: 0, qty: 1, warna: null },
  ],
};

function fillNote(value = "koreksi") {
  fireEvent.change(screen.getByPlaceholderText(/Contoh:/i), { target: { value } });
}

describe("EditSaleModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProducts.mockReturnValue({ products: [], loading: false });
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  it("renders modal with buyer name input", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByTestId("buyer-input")).toHaveValue("BUDI");
  });

  it("renders item kode and size", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("D-01 — Midi")).toBeInTheDocument();
  });

  it("calls onClose when Batal clicked", () => {
    const onClose = vi.fn();
    render(<EditSaleModal sale={simpleSale} onClose={onClose} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when header ✕ button clicked", () => {
    const onClose = vi.fn();
    render(<EditSaleModal sale={simpleSale} onClose={onClose} onSave={vi.fn()} />);
    // First ✕ in DOM order is the header close button
    fireEvent.click(screen.getAllByText("✕")[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <EditSaleModal sale={simpleSale} onClose={onClose} onSave={vi.fn()} />
    );
    fireEvent.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  // ── Save ────────────────────────────────────────────────────────────────────

  it("calls onSave when Simpan clicked with note", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={onSave} />);
    fillNote();
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it("shows alert when Simpan clicked with empty note", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("catatan"));
    alertSpy.mockRestore();
  });

  it("shows saving state while onSave is pending", async () => {
    const onSave = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={onSave} />);
    fillNote();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    });
    expect(screen.getByText("Menyimpan...")).toBeInTheDocument();
  });

  it("passes edited note in onSave payload", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={onSave} />);
    fillNote("salah input");
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ _editNote: "salah input" })
      )
    );
  });

  // ── Buyer ──────────────────────────────────────────────────────────────────

  it("allows buyer name change", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    const input = screen.getByTestId("buyer-input");
    fireEvent.change(input, { target: { value: "ANI" } });
    expect(input.value).toBe("ANI");
  });

  it("updates buyer HP when phone input changes", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    const hpInput = screen.getByPlaceholderText("No HP (opsional)");
    fireEvent.change(hpInput, { target: { value: "08123456789" } });
    expect(hpInput.value).toBe("08123456789");
  });

  // ── Discount ───────────────────────────────────────────────────────────────

  it("shows discount row in summary when discount > 0", () => {
    const discountedSale = { ...simpleSale, discount: 10000 };
    render(<EditSaleModal sale={discountedSale} onClose={vi.fn()} onSave={vi.fn()} />);
    // "- Rp {amount}" only appears in the conditional summary row, not the section heading
    expect(screen.getByText("- Rp 10000")).toBeInTheDocument();
  });

  it("does not show discount amount row when discount is 0", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    // Section heading "Diskon" is always visible; conditional "- Rp ..." should be absent
    expect(screen.queryByText(/- Rp/)).not.toBeInTheDocument();
  });

  it("updates discount input", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    const discountInput = screen.getByPlaceholderText("0");
    fireEvent.change(discountInput, { target: { value: "5000" } });
    expect(discountInput.value).toBe("5000");
  });

  // ── Simple qty editing ──────────────────────────────────────────────────────

  it("increments simple item qty with + button", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("decrements simple item qty with − button (min 1)", () => {
    const sale1 = { ...simpleSale, items: [{ ...simpleSale.items[0], qty: 1 }] };
    render(<EditSaleModal sale={sale1} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "−" }));
    // Stays at 1 (min)
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("decrements simple item qty from 2 to 1", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "−" }));
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // ── Remove item ────────────────────────────────────────────────────────────

  it("removes item when Hapus clicked with multiple items", () => {
    render(<EditSaleModal sale={twoItemSale} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("D-01 — Midi")).toBeInTheDocument();
    expect(screen.getByText("D-02 — Gamis")).toBeInTheDocument();
    fireEvent.click(screen.getAllByTitle("Hapus item")[0]);
    expect(screen.queryByText("D-01 — Midi")).not.toBeInTheDocument();
    expect(screen.getByText("D-02 — Gamis")).toBeInTheDocument();
  });

  it("shows alert when trying to remove the only item", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Hapus item"));
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Minimal 1 produk"));
    alertSpy.mockRestore();
  });

  // ── Harga editing ──────────────────────────────────────────────────────────

  it("shows harga input when Ubah harga clicked", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Ubah harga"));
    expect(screen.getByDisplayValue("100000")).toBeInTheDocument();
  });

  it("saves updated harga when ✓ button clicked", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Ubah harga"));
    fireEvent.change(screen.getByDisplayValue("100000"), { target: { value: "150000" } });
    fireEvent.click(screen.getByText("✓"));
    expect(screen.getByText("Rp 150000 /pcs")).toBeInTheDocument();
  });

  it("saves harga on Enter key press", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Ubah harga"));
    const input = screen.getByDisplayValue("100000");
    fireEvent.change(input, { target: { value: "90000" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Rp 90000 /pcs")).toBeInTheDocument();
  });

  it("cancels harga edit on Escape key", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Ubah harga"));
    fireEvent.keyDown(screen.getByDisplayValue("100000"), { key: "Escape" });
    expect(screen.getByText("Ubah harga")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("100000")).not.toBeInTheDocument();
  });

  it("cancels harga edit on cancel ✕ button", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Ubah harga"));
    // ✕ buttons in order: header-close, item-remove, harga-cancel
    const closeButtons = screen.getAllByText("✕");
    fireEvent.click(closeButtons[closeButtons.length - 1]); // harga cancel is last
    expect(screen.getByText("Ubah harga")).toBeInTheDocument();
  });

  it("does not update harga when invalid value entered", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Ubah harga"));
    fireEvent.change(screen.getByDisplayValue("100000"), { target: { value: "" } });
    fireEvent.click(screen.getByText("✓"));
    // original harga preserved
    expect(screen.getByText("Rp 100000 /pcs")).toBeInTheDocument();
  });

  // ── Warna items ────────────────────────────────────────────────────────────

  it("renders warna-based item with per-warna labels", () => {
    render(<EditSaleModal sale={warnaSale} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });

  it("increments warna qty", () => {
    render(<EditSaleModal sale={warnaSale} onClose={vi.fn()} onSave={vi.fn()} />);
    // HITAM=1, MERAH=2 initially
    expect(screen.getByText("1")).toBeInTheDocument();
    const plusButtons = screen.getAllByRole("button", { name: "+" });
    fireEvent.click(plusButtons[0]); // HITAM +1 → 2
    // Now both warna show qty=2, so "1" is gone
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("decrements warna qty (min 1)", () => {
    render(<EditSaleModal sale={warnaSale} onClose={vi.fn()} onSave={vi.fn()} />);
    const minusButtons = screen.getAllByRole("button", { name: "−" });
    fireEvent.click(minusButtons[0]); // HITAM: qty=1, stays 1
    // HITAM still in DOM (not filtered out)
    expect(screen.getByText("HITAM")).toBeInTheDocument();
  });

  it("decrements MERAH warna qty from 2 to 1", () => {
    render(<EditSaleModal sale={warnaSale} onClose={vi.fn()} onSave={vi.fn()} />);
    const minusButtons = screen.getAllByRole("button", { name: "−" });
    fireEvent.click(minusButtons[1]); // MERAH: 2 → 1
    // MERAH still present, both now show 1
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });

  // ── Add product flow ────────────────────────────────────────────────────────

  it("shows add product panel when + Tambah Produk clicked", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Tambah Produk"));
    expect(screen.getByPlaceholderText("Cari kode atau nama produk...")).toBeInTheDocument();
  });

  it("hides add product panel when Tutup clicked", () => {
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Tambah Produk"));
    fireEvent.click(screen.getByText("Tutup"));
    expect(screen.queryByText("Tutup")).not.toBeInTheDocument();
    expect(screen.getByText("+ Tambah Produk")).toBeInTheDocument();
  });

  it("shows filtered products in search results", () => {
    useProducts.mockReturnValue({
      products: [
        { kode: "D-01", nama: "Gamis Polos", hpp: 80000, variants: [] },
        { kode: "D-05", nama: "Mukena Bordir", hpp: 90000, variants: [] },
      ],
      loading: false,
    });
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Tambah Produk"));
    fireEvent.change(
      screen.getByPlaceholderText("Cari kode atau nama produk..."),
      { target: { value: "D-05" } }
    );
    expect(screen.getByText("D-05")).toBeInTheDocument();
    expect(screen.queryByText("D-01")).not.toBeInTheDocument();
  });

  it("selects product kode and shows size options", () => {
    useProducts.mockReturnValue({
      products: [
        {
          kode: "D-03", nama: "Test Gamis", hpp: 70000,
          variants: [{ size: "Midi", harga: 100000 }],
        },
      ],
      loading: false,
    });
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Tambah Produk"));
    fireEvent.change(
      screen.getByPlaceholderText("Cari kode atau nama produk..."),
      { target: { value: "D-03" } }
    );
    fireEvent.click(screen.getByText("D-03"));
    // Size picker should appear
    expect(screen.getByText("Midi")).toBeInTheDocument();
  });

  it("adds new item when + Tambahkan clicked", async () => {
    useProducts.mockReturnValue({
      products: [
        {
          kode: "D-03", nama: "Test", hpp: 70000,
          variants: [{ size: "Midi", harga: 100000 }],
        },
      ],
      loading: false,
    });
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Tambah Produk"));
    fireEvent.change(
      screen.getByPlaceholderText("Cari kode atau nama produk..."),
      { target: { value: "D-03" } }
    );
    fireEvent.click(screen.getByText("D-03"));
    fireEvent.click(screen.getByText("Midi"));
    fireEvent.click(screen.getByText("+ Tambahkan"));
    await waitFor(() =>
      expect(screen.getByText("D-03 — Midi")).toBeInTheDocument()
    );
    // Panel should close after adding
    expect(
      screen.queryByPlaceholderText("Cari kode atau nama produk...")
    ).not.toBeInTheDocument();
  });

  it("increments qty when adding product that already exists in items", async () => {
    // D-01/Midi/no-warna already in simpleSale with qty=2
    useProducts.mockReturnValue({
      products: [
        {
          kode: "D-01", nama: "Gamis", hpp: 80000,
          variants: [{ size: "Midi", harga: 100000 }],
        },
      ],
      loading: false,
    });
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("2")).toBeInTheDocument(); // initial qty
    fireEvent.click(screen.getByText("+ Tambah Produk"));
    fireEvent.change(
      screen.getByPlaceholderText("Cari kode atau nama produk..."),
      { target: { value: "D-01" } }
    );
    fireEvent.click(screen.getByText("D-01"));
    fireEvent.click(screen.getByText("Midi"));
    fireEvent.click(screen.getByText("+ Tambahkan"));
    // qty should go from 2 → 3
    await waitFor(() => expect(screen.getByText("3")).toBeInTheDocument());
  });

  it("resets to product list when size-picker Batal clicked", () => {
    useProducts.mockReturnValue({
      products: [
        {
          kode: "D-03", nama: "Test", hpp: 70000,
          variants: [{ size: "Midi", harga: 100000 }],
        },
      ],
      loading: false,
    });
    render(<EditSaleModal sale={simpleSale} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Tambah Produk"));
    fireEvent.change(
      screen.getByPlaceholderText("Cari kode atau nama produk..."),
      { target: { value: "D-03" } }
    );
    fireEvent.click(screen.getByText("D-03"));
    fireEvent.click(screen.getByText("Midi"));
    // In size-confirm view: Batal button appears (before modal footer Batal)
    const batalButtons = screen.getAllByRole("button", { name: "Batal" });
    fireEvent.click(batalButtons[0]); // add-panel Batal: clears addSize + addKode
    // Search box should still be visible (panel still open)
    expect(
      screen.getByPlaceholderText("Cari kode atau nama produk...")
    ).toBeInTheDocument();
    // Product D-03 appears in list again (search "D-03" still active)
    expect(screen.getByText("D-03")).toBeInTheDocument();
  });
});
