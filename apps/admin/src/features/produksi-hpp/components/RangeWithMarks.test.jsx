import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RangeWithMarks from "./RangeWithMarks";

// Permintaan Denny 2026-09: slider ini sekarang mulai TERKUNCI secara
// default (lihat komentar di RangeWithMarks.jsx) — test interaksi harus
// unlock dulu lewat tombol "🔒 Ubah".
function unlock() {
  fireEvent.click(screen.getByText("🔒 Ubah"));
}

describe("RangeWithMarks", () => {
  const defaultProps = { value: 30000, onChange: vi.fn(), min: 0, max: 100000, step: 5000 };

  it("renders range input", () => {
    const { container } = render(<RangeWithMarks {...defaultProps} />);
    expect(container.querySelector('input[type="range"]')).toBeInTheDocument();
  });

  it("calls onChange when slider moves (setelah unlock)", () => {
    const onChange = vi.fn();
    const { container } = render(<RangeWithMarks {...defaultProps} onChange={onChange} />);
    unlock();
    fireEvent.change(container.querySelector('input[type="range"]'), { target: { value: "50000" } });
    expect(onChange).toHaveBeenCalledWith(50000);
  });

  it("shows min and max labels", () => {
    render(<RangeWithMarks {...defaultProps} min={0} max={100000} zeroLabel="Gratis" />);
    expect(screen.getByText("Gratis")).toBeInTheDocument();
    expect(screen.getByText("100rb")).toBeInTheDocument();
  });

  it("shows non-zero min label in rb format", () => {
    render(<RangeWithMarks {...defaultProps} min={5000} />);
    expect(screen.getByText("5rb")).toBeInTheDocument();
  });

  it("renders mark buttons (setelah unlock)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RangeWithMarks {...defaultProps} onChange={onChange} marks={[{ value: 20000, label: "20rb" }]} />);
    unlock();
    await user.click(screen.getByText("20rb"));
    expect(onChange).toHaveBeenCalledWith(20000);
  });

  it("shows manual input toggle (setelah unlock)", async () => {
    const user = userEvent.setup();
    render(<RangeWithMarks {...defaultProps} />);
    unlock();
    const toggleBtn = screen.getByText("Input manual");
    await user.click(toggleBtn);
    // Both range and number input have value 30000 — find the number input specifically
    const numInput = screen.getAllByDisplayValue("30000").find(el => el.type === "number");
    expect(numInput).toBeInTheDocument();
  });

  it("onChange called when typing in manual input (setelah unlock)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RangeWithMarks {...defaultProps} onChange={onChange} />);
    unlock();
    await user.click(screen.getByText("Input manual"));
    const numInput = screen.getAllByDisplayValue("30000").find(el => el.type === "number");
    fireEvent.change(numInput, { target: { value: "45000" } });
    expect(onChange).toHaveBeenCalledWith(45000);
  });
});

// Permintaan Denny 2026-09: "sering banget kejadian slidernya terpencet dan
// berubah angkanya jadi tidak sesuai... saya mau ketika sudah ada valuenya
// otomatis ke lock, dan kalau mau ubah bisa diunlock dulu".
describe("RangeWithMarks — Kunci/Unlock (permintaan Denny 2026-09)", () => {
  const defaultProps = { value: 30000, onChange: vi.fn(), min: 0, max: 100000, step: 5000 };

  it("mulai dalam status TERKUNCI secara default", () => {
    const { container } = render(<RangeWithMarks {...defaultProps} />);
    const input = container.querySelector('input[type="range"]');
    expect(input.disabled).toBe(true);
    expect(screen.getByText("🔒 Ubah")).toBeInTheDocument();
  });

  it("mark button & tombol 'Input manual' ikut dinonaktifkan saat terkunci", () => {
    render(<RangeWithMarks {...defaultProps} marks={[{ value: 20000, label: "20rb" }]} />);
    expect(screen.getByText("20rb").closest("button").disabled).toBe(true);
    expect(screen.getByText("Input manual").disabled).toBe(true);
  });

  it("mengubah slider TIDAK memanggil onChange selama masih terkunci", () => {
    const onChange = vi.fn();
    const { container } = render(<RangeWithMarks {...defaultProps} onChange={onChange} />);
    fireEvent.change(container.querySelector('input[type="range"]'), { target: { value: "50000" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("klik mark button TIDAK memanggil onChange selama masih terkunci", () => {
    const onChange = vi.fn();
    render(<RangeWithMarks {...defaultProps} onChange={onChange} marks={[{ value: 20000, label: "20rb" }]} />);
    fireEvent.click(screen.getByText("20rb"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("klik 'Ubah' membuka kunci — input & 'Input manual' jadi aktif, label tombol jadi 'Kunci'", () => {
    const { container } = render(<RangeWithMarks {...defaultProps} />);
    unlock();
    const input = container.querySelector('input[type="range"]');
    expect(input.disabled).toBe(false);
    expect(screen.getByText("Input manual").disabled).toBe(false);
    expect(screen.getByText("🔓 Kunci")).toBeInTheDocument();
  });

  it("klik 'Kunci' setelah unlock mengembalikan ke status terkunci & menyembunyikan input manual", async () => {
    const user = userEvent.setup();
    const { container } = render(<RangeWithMarks {...defaultProps} />);
    unlock();
    await user.click(screen.getByText("Input manual"));
    expect(screen.getAllByDisplayValue("30000").find((el) => el.type === "number")).toBeInTheDocument();
    fireEvent.click(screen.getByText("🔓 Kunci"));
    const input = container.querySelector('input[type="range"]');
    expect(input.disabled).toBe(true);
    expect(screen.getByText("🔒 Ubah")).toBeInTheDocument();
    // Input manual field ikut hilang begitu re-locked.
    expect(screen.getAllByDisplayValue("30000").find((el) => el.type === "number")).toBeUndefined();
  });
});
