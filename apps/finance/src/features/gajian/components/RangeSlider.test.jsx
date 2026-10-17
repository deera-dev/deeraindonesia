import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../../shared/lib/format", () => ({
  labelCls: "label-cls",
}));

import RangeSlider from "./RangeSlider";

function unlock() {
  fireEvent.click(screen.getByText("🔒 Ubah"));
}

describe("RangeSlider", () => {
  it("renders label", () => {
    render(<RangeSlider label="Tarif" value={4000} min={2000} max={8000} onChange={vi.fn()} />);
    expect(screen.getByText("Tarif")).toBeInTheDocument();
  });

  it("renders current value display", () => {
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} onChange={vi.fn()} />);
    expect(screen.getByText("Rp 4.000")).toBeInTheDocument();
  });

  it("renders range input", () => {
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} step={1000} onChange={vi.fn()} />);
    const input = document.querySelector('input[type="range"]');
    expect(input).toBeInTheDocument();
    expect(input.min).toBe("2000");
    expect(input.max).toBe("8000");
  });

  it("calls onChange when range input changes (setelah unlock)", () => {
    const onChange = vi.fn();
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} onChange={onChange} />);
    unlock();
    const input = document.querySelector('input[type="range"]');
    fireEvent.change(input, { target: { value: "6000" } });
    expect(onChange).toHaveBeenCalledWith(6000);
  });

  it("renders mark chips when marks provided", () => {
    render(
      <RangeSlider label="L" value={4000} min={2000} max={8000} marks={[2000, 4000, 6000]} onChange={vi.fn()} />
    );
    expect(screen.getByText("2k")).toBeInTheDocument();
    expect(screen.getByText("4k")).toBeInTheDocument();
    expect(screen.getByText("6k")).toBeInTheDocument();
  });

  it("calls onChange with mark value when chip clicked (setelah unlock)", () => {
    const onChange = vi.fn();
    render(
      <RangeSlider label="L" value={4000} min={2000} max={8000} marks={[2000, 6000]} onChange={onChange} />
    );
    unlock();
    fireEvent.click(screen.getByText("6k"));
    expect(onChange).toHaveBeenCalledWith(6000);
  });

  it("shows active style on current value mark", () => {
    render(
      <RangeSlider label="L" value={4000} min={2000} max={8000} marks={[2000, 4000]} onChange={vi.fn()} />
    );
    const activeChip = screen.getByText("4k");
    expect(activeChip.className).toContain("text-skin-accent-text");
  });

  it("does not render mark chip buttons when marks empty (tombol kunci tetap ada)", () => {
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} marks={[]} onChange={vi.fn()} />);
    expect(document.querySelectorAll("button").length).toBe(1);
    expect(screen.getByText("🔒 Ubah")).toBeInTheDocument();
  });
});

describe("RangeSlider — Kunci/Unlock (permintaan Denny 2026-09)", () => {
  it("mulai dalam status TERKUNCI secara default", () => {
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} onChange={vi.fn()} />);
    const input = document.querySelector('input[type="range"]');
    expect(input.disabled).toBe(true);
    expect(screen.getByText("🔒 Ubah")).toBeInTheDocument();
  });

  it("chip mark ikut dinonaktifkan saat terkunci", () => {
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} marks={[2000, 4000]} onChange={vi.fn()} />);
    const chip = screen.getByText("4k");
    expect(chip.disabled).toBe(true);
  });

  it("mengubah slider TIDAK memanggil onChange selama masih terkunci", () => {
    const onChange = vi.fn();
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} onChange={onChange} />);
    const input = document.querySelector('input[type="range"]');
    fireEvent.change(input, { target: { value: "6000" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("klik chip mark TIDAK memanggil onChange selama masih terkunci", () => {
    const onChange = vi.fn();
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} marks={[2000, 4000]} onChange={onChange} />);
    fireEvent.click(screen.getByText("4k"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("klik 'Ubah' membuka kunci — input & mark jadi aktif, label tombol berubah jadi 'Kunci'", () => {
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} marks={[2000, 4000]} onChange={vi.fn()} />);
    unlock();
    const input = document.querySelector('input[type="range"]');
    expect(input.disabled).toBe(false);
    expect(screen.getByText("4k").disabled).toBe(false);
    expect(screen.getByText("🔓 Kunci")).toBeInTheDocument();
  });

  it("klik 'Kunci' setelah unlock mengembalikan ke status terkunci", () => {
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} onChange={vi.fn()} />);
    unlock();
    fireEvent.click(screen.getByText("🔓 Kunci"));
    const input = document.querySelector('input[type="range"]');
    expect(input.disabled).toBe(true);
    expect(screen.getByText("🔒 Ubah")).toBeInTheDocument();
  });
});
