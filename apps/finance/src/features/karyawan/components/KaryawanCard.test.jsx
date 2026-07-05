import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../utils", () => ({
  timLabel: vi.fn((t) => `Tim-${t}`),
}));

import KaryawanCard from "./KaryawanCard";

const kAktif = {
  id: "k1", nama: "BUDI", tim: "jahit",
  no_rekening: "1234567", nama_bank: "BCA", aktif: true,
};
const kNonAktif = { ...kAktif, aktif: false };

describe("KaryawanCard", () => {
  it("renders nama", () => {
    render(<KaryawanCard k={kAktif} onEdit={vi.fn()} onToggleAktif={vi.fn()} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("renders timLabel", () => {
    render(<KaryawanCard k={kAktif} onEdit={vi.fn()} onToggleAktif={vi.fn()} />);
    expect(screen.getByText("Tim-jahit")).toBeInTheDocument();
  });

  it("renders rekening and bank", () => {
    render(<KaryawanCard k={kAktif} onEdit={vi.fn()} onToggleAktif={vi.fn()} />);
    expect(screen.getByText(/BCA/)).toBeInTheDocument();
    expect(screen.getByText(/1234567/)).toBeInTheDocument();
  });

  it("shows Non-aktifkan button when aktif=true", () => {
    render(<KaryawanCard k={kAktif} onEdit={vi.fn()} onToggleAktif={vi.fn()} />);
    expect(screen.getByText("Non-aktifkan")).toBeInTheDocument();
  });

  it("shows Aktifkan button when aktif=false", () => {
    render(<KaryawanCard k={kNonAktif} onEdit={vi.fn()} onToggleAktif={vi.fn()} />);
    expect(screen.getByText("Aktifkan")).toBeInTheDocument();
  });

  it("shows non-aktif badge when aktif=false", () => {
    render(<KaryawanCard k={kNonAktif} onEdit={vi.fn()} onToggleAktif={vi.fn()} />);
    expect(screen.getByText("non-aktif")).toBeInTheDocument();
  });

  it("calls onEdit with k when Edit clicked", () => {
    const onEdit = vi.fn();
    render(<KaryawanCard k={kAktif} onEdit={onEdit} onToggleAktif={vi.fn()} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(kAktif);
  });

  it("calls onToggleAktif with k when toggle button clicked", () => {
    const onToggleAktif = vi.fn();
    render(<KaryawanCard k={kAktif} onEdit={vi.fn()} onToggleAktif={onToggleAktif} />);
    fireEvent.click(screen.getByText("Non-aktifkan"));
    expect(onToggleAktif).toHaveBeenCalledWith(kAktif);
  });

  it("applies opacity-50 class when non-aktif", () => {
    const { container } = render(
      <KaryawanCard k={kNonAktif} onEdit={vi.fn()} onToggleAktif={vi.fn()} />
    );
    expect(container.firstChild.className).toContain("opacity-50");
  });
});

// Additional branch coverage
describe("KaryawanCard — null rekening/bank", () => {
  it("does not render rekening line when both are null", () => {
    const k = { ...kAktif, no_rekening: null, nama_bank: null };
    const { container } = render(<KaryawanCard k={k} onEdit={vi.fn()} onToggleAktif={vi.fn()} />);
    expect(container.querySelector(".font-editorial.text-xs.text-skin-text3.mt-1")).toBeNull();
  });
});
