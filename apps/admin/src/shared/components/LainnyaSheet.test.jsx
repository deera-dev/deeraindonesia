import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Toggle dark/light mode (permintaan Denny 2026-10: "pindahkan fitur switch
// dark/light mode di navigasi aja ... kalau yang mobile baiknya gimana?")
// — versi mobile ada di footer sheet ini, dibuka dari tombol "Lainnya" yang
// selalu ada di AdminBottomNav di semua halaman.
vi.mock("@deera/shared/features/theme/hooks", () => ({
  useTheme: vi.fn(),
}));

import LainnyaSheet from "./LainnyaSheet";
import { useTheme } from "@deera/shared/features/theme/hooks";
import { IconPelanggan, IconRiwayat } from "./AdminBottomNav";

const ITEMS = [
  { to: "/pelanggan", exact: false, label: "Pelanggan", Icon: IconPelanggan },
  { to: "/history", exact: false, label: "Riwayat", Icon: IconRiwayat },
];

function renderSheet(props = {}) {
  const isActive = (to, exact) => (exact ? to === "/" : false);
  return render(
    <MemoryRouter>
      <LainnyaSheet items={ITEMS} isActive={isActive} onClose={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useTheme.mockReturnValue({ isDark: false, toggleTheme: vi.fn() });
});

describe("LainnyaSheet", () => {
  it("renders item nav sisa yang dioper (Pelanggan, Riwayat)", () => {
    renderSheet();
    expect(screen.getByText("Pelanggan")).toBeInTheDocument();
    expect(screen.getByText("Riwayat")).toBeInTheDocument();
  });

  it("klik tombol Tutup memanggil onClose", () => {
    const onClose = vi.fn();
    renderSheet({ onClose });
    fireEvent.click(screen.getByLabelText("Tutup"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("toggle dark/light mode (satu-satunya tempat di mobile)", () => {
    it("label 'Mode Terang' saat isDark=false", () => {
      renderSheet();
      expect(screen.getByText("Mode Terang")).toBeInTheDocument();
    });

    it("label 'Mode Gelap' saat isDark=true", () => {
      useTheme.mockReturnValue({ isDark: true, toggleTheme: vi.fn() });
      renderSheet();
      expect(screen.getByText("Mode Gelap")).toBeInTheDocument();
    });

    it("klik toggle memanggil toggleTheme, TIDAK menutup sheet", () => {
      const toggleTheme = vi.fn();
      const onClose = vi.fn();
      useTheme.mockReturnValue({ isDark: false, toggleTheme });
      renderSheet({ onClose });
      fireEvent.click(screen.getByRole("button", { name: /aktifkan mode gelap/i }));
      expect(toggleTheme).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
