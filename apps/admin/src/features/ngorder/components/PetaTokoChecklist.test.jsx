import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@deera/shared/lib/geocode", () => ({ geocodeAddressMulti: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: { error: vi.fn() } }));
vi.mock("../hooks", async () => ({
  ...(await vi.importActual("../utils")),
  useSetTokoLocationMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
import PetaTokoChecklist from "./PetaTokoChecklist";

describe("PetaTokoChecklist", () => {
  it("menampilkan link Google Maps & sosmed tiap toko di rencana kunjungan", () => {
    const tokoList = [
      { id: "a", nama: "Toko A", alamat: "Jl. Mawar, Tegal", lat: 1, lng: 2, media_sosial: "IG/TikTok @toko.a, FB @tokoa" },
      { id: "b", nama: "Toko B", media_sosial: null },
    ];
    render(<PetaTokoChecklist tokoList={tokoList} selected={new Set()} onToggle={vi.fn()} />);
    const maps = screen.getAllByRole("link", { name: "Google Maps" });
    expect(maps).toHaveLength(2);
    expect(maps[0].getAttribute("href")).toContain("query=Toko%20A%2C%20Jl.%20Mawar%2C%20Tegal");
    expect(screen.getByRole("link", { name: "IG @toko.a" })).toHaveAttribute("href", "https://instagram.com/toko.a");
    expect(screen.getByRole("link", { name: "TikTok @toko.a" })).toHaveAttribute("href", "https://www.tiktok.com/@toko.a");
    expect(screen.getByRole("link", { name: "FB @tokoa" })).toHaveAttribute("href", "https://www.facebook.com/tokoa");
  });
});
