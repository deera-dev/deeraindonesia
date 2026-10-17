import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HppSection from "./HppSection";


const DEFAULT_PROPS = {
  hpp: "",
  onHpp: vi.fn(),
  activeSet: new Set(),
  hargaMap: {},
  saving: false,
};

function renderSection(overrides = {}) {
  return render(<HppSection {...DEFAULT_PROPS} {...overrides} />);
}

describe("HppSection", () => {
  it("merender input HPP dengan nilai yang diberikan", () => {
    renderSection({ hpp: "100000" });
    expect(screen.getByDisplayValue("100000")).toBeInTheDocument();
  });

  it("input disabled saat saving=true", () => {
    renderSection({ saving: true });
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("input enabled saat saving=false", () => {
    renderSection({ saving: false });
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });

  it("onChange strips karakter non-digit & memanggil onHpp", () => {
    const onHpp = vi.fn();
    renderSection({ onHpp });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rp100.000" } });
    expect(onHpp).toHaveBeenCalledWith("100000");
  });

  it("margin block TIDAK tampil saat hpp kosong meskipun activeSet tidak kosong", () => {
    renderSection({ hpp: "", activeSet: new Set(["Midi"]), hargaMap: { Midi: "200000" } });
    expect(screen.queryByText(/margin/i)).toBeNull();
  });

  it("margin block TIDAK tampil saat hpp ada tapi activeSet kosong", () => {
    renderSection({ hpp: "100000", activeSet: new Set() });
    expect(screen.queryByText(/margin/i)).toBeNull();
  });

  it("menampilkan margin block dengan kalkulasi benar saat hpp & activeSet keduanya terisi", () => {
    renderSection({
      hpp: "100000",
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "200000" },
    });
    expect(screen.getByText(/Midi: margin/)).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/100\.000/)).toBeInTheDocument();
  });

  it("menampilkan margin hanya untuk ukuran aktif, tidak untuk ukuran tidak aktif", () => {
    renderSection({
      hpp: "150000",
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "300000", Gamis: "350000" },
    });
    expect(screen.getByText(/Midi: margin/)).toBeInTheDocument();
    expect(screen.queryByText(/Gamis: margin/)).toBeNull();
  });

  it("mengembalikan null (tidak render margin row) saat harga jual = 0 untuk ukuran aktif", () => {
    renderSection({
      hpp: "100000",
      activeSet: new Set(["Midi"]),
      hargaMap: {},
    });
    expect(screen.queryByText(/Midi: margin/)).toBeNull();
  });

  it("mengembalikan null saat hpp invalid (non-numeric string) → parseInt NaN → hppVal=0", () => {
    renderSection({
      hpp: "abc",
      activeSet: new Set(["Midi"]),
      hargaMap: { Midi: "200000" },
    });
    expect(screen.queryByText(/Midi: margin/)).toBeNull();
  });

  it("menampilkan margin untuk beberapa ukuran aktif sekaligus", () => {
    renderSection({
      hpp: "100000",
      activeSet: new Set(["Midi", "Gamis"]),
      hargaMap: { Midi: "200000", Gamis: "250000" },
    });
    expect(screen.getByText(/Midi: margin/)).toBeInTheDocument();
    expect(screen.getByText(/Gamis: margin/)).toBeInTheDocument();
  });
});
