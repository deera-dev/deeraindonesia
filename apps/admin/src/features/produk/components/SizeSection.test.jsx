import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SizeSection from "./SizeSection";

// SIZE_PRESETS: Midi, Midi Jumbo, Gamis, Gamis Jumbo

function renderSection(overrides = {}) {
  return render(
    <SizeSection
      activeSet={new Set()}
      hargaMap={{}}
      onToggle={vi.fn()}
      onHarga={vi.fn()}
      saving={false}
      {...overrides}
    />
  );
}

describe("SizeSection", () => {
  it("merender 4 baris ukuran sesuai SIZE_PRESETS", () => {
    renderSection();
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("Midi Jumbo")).toBeInTheDocument();
    expect(screen.getByText("Gamis")).toBeInTheDocument();
    expect(screen.getByText("Gamis Jumbo")).toBeInTheDocument();
  });

  it("merender dimensi LD/PB dengan benar", () => {
    renderSection();
    expect(screen.getByText("LD 110 · PB 130 cm")).toBeInTheDocument(); // Midi
    expect(screen.getByText("LD 120 · PB 130 cm")).toBeInTheDocument(); // Midi Jumbo
    expect(screen.getByText("LD 110 · PB 140 cm")).toBeInTheDocument(); // Gamis
    expect(screen.getByText("LD 120 · PB 140 cm")).toBeInTheDocument(); // Gamis Jumbo
  });

  it("klik baris memanggil onToggle(size) saat saving=false", () => {
    const onToggle = vi.fn();
    const { container } = renderSection({ onToggle });
    // Klik baris Midi (div pertama di space-y-3)
    const rows = container.querySelectorAll(".space-y-3 > div");
    fireEvent.click(rows[0]);
    expect(onToggle).toHaveBeenCalledWith("Midi");
  });

  it("klik baris TIDAK memanggil onToggle saat saving=true", () => {
    const onToggle = vi.fn();
    const { container } = renderSection({ onToggle, saving: true });
    const rows = container.querySelectorAll(".space-y-3 > div");
    fireEvent.click(rows[0]);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("menampilkan checkmark ✓ hanya pada ukuran aktif", () => {
    renderSection({ activeSet: new Set(["Midi"]) });
    const checkmarks = screen.queryAllByText("✓");
    expect(checkmarks).toHaveLength(1);
  });

  it("input harga disabled saat ukuran tidak aktif", () => {
    const { container } = renderSection();
    const inputs = container.querySelectorAll('input[type="text"]');
    inputs.forEach((input) => expect(input).toBeDisabled());
  });

  it("input harga enabled saat ukuran aktif & saving=false", () => {
    const { container } = renderSection({ activeSet: new Set(["Midi", "Gamis"]) });
    const inputs = container.querySelectorAll('input[type="text"]');
    // Midi (index 0) & Gamis (index 2) aktif → enabled
    expect(inputs[0]).not.toBeDisabled();
    expect(inputs[2]).not.toBeDisabled();
    // Midi Jumbo (index 1) & Gamis Jumbo (index 3) tidak aktif → disabled
    expect(inputs[1]).toBeDisabled();
    expect(inputs[3]).toBeDisabled();
  });

  it("input harga disabled saat saving=true meskipun ukuran aktif", () => {
    const { container } = renderSection({ activeSet: new Set(["Midi"]), saving: true });
    const inputs = container.querySelectorAll('input[type="text"]');
    inputs.forEach((input) => expect(input).toBeDisabled());
  });

  it("onChange input harga memanggil onHarga(size, value)", () => {
    const onHarga = vi.fn();
    const { container } = renderSection({
      activeSet: new Set(["Midi"]),
      onHarga,
    });
    const inputs = container.querySelectorAll('input[type="text"]');
    fireEvent.change(inputs[0], { target: { value: "230000" } });
    expect(onHarga).toHaveBeenCalledWith("Midi", "230000");
  });

  it("klik pada wrapper input (onClick stopPropagation) tidak memicu onToggle", () => {
    const onToggle = vi.fn();
    const { container } = renderSection({ onToggle });
    // Wrapper div dengan onClick stopPropagation (div flex items-center gap-2)
    const priceWrappers = container.querySelectorAll(".space-y-3 > div > div.flex.items-center.gap-2");
    fireEvent.click(priceWrappers[0]);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("menampilkan nilai harga dari hargaMap pada input yang sesuai", () => {
    renderSection({
      activeSet: new Set(["Gamis"]),
      hargaMap: { Gamis: "180000" },
    });
    expect(screen.getByDisplayValue("180000")).toBeInTheDocument();
  });

  it("Preview WA TIDAK tampil saat activeSet kosong", () => {
    renderSection({ activeSet: new Set() });
    expect(screen.queryByText(/Preview WA/i)).toBeNull();
  });

  it("Preview WA tampil saat ada ukuran aktif, menampilkan harga dari hargaMap", () => {
    renderSection({
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "200000" },
    });
    expect(screen.getByText(/Preview WA/i)).toBeInTheDocument();
    // formatHarga(200000) → "200.000"
    expect(screen.getByText(/200\.000/)).toBeInTheDocument();
  });

  it("Preview WA menampilkan '—' saat ukuran aktif tapi tidak ada harga di hargaMap", () => {
    renderSection({
      activeSet: new Set(["Midi"]),
      hargaMap: {},
    });
    expect(screen.getByText(/Preview WA/i)).toBeInTheDocument();
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  it("Preview WA menampilkan beberapa ukuran aktif", () => {
    renderSection({
      activeSet: new Set(["Midi", "Gamis Jumbo"]),
      hargaMap: { Midi: "200000", "Gamis Jumbo": "250000" },
    });
    // Gunakan teks lengkap preview WA agar tidak ambiguous dengan size list
    expect(screen.getByText(/Midi.*LD 110.*PB 130/)).toBeInTheDocument();
    expect(screen.getByText(/Gamis Jumbo.*LD 120.*PB 140/)).toBeInTheDocument();
  });
});
