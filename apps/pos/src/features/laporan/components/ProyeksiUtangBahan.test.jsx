import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));

import ProyeksiUtangBahan from "./ProyeksiUtangBahan";

// Minimal proyeksi shape matching computeProyeksiUtangVsSaldo output
const emptyProyeksi = { skedul: [], bulanKekurangan: null };

describe("ProyeksiUtangBahan", () => {
  it("renders without crashing with empty skedul", () => {
    const { container } = render(<ProyeksiUtangBahan proyeksi={emptyProyeksi} />);
    expect(container).not.toBeEmptyDOMElement();
  });

  it("shows no-utang message when skedul is empty", () => {
    render(<ProyeksiUtangBahan proyeksi={emptyProyeksi} />);
    expect(screen.getByText(/Tidak ada utang bahan/i)).toBeInTheDocument();
  });

  it("renders skedul rows when proyeksi has data", () => {
    const proyeksi = {
      bulanKekurangan: "2024-03",
      skedul: [
        { bulan: "2024-03", utang: 500000, proyeksiSaldo: 300000, selisih: -200000 },
      ],
    };
    render(<ProyeksiUtangBahan proyeksi={proyeksi} />);
    expect(screen.getByText(/Proyeksi Utang Bahan/i)).toBeInTheDocument();
  });
});
