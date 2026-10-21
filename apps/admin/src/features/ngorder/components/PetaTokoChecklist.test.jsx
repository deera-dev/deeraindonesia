import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/geocode", () => ({ geocodeAddressMulti: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../hooks", async () => ({
  ...(await vi.importActual("../utils")),
  useSetTokoLocationMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
import PetaTokoChecklist from "./PetaTokoChecklist";

const tokoList = [
  { id: "a", nama: "Toko A", alamat: "Jl. Mawar, Tegal", lat: 1, lng: 2, media_sosial: "IG/TikTok @toko.a, FB @tokoa", status_approach: "belum" },
  { id: "b", nama: "Toko B", media_sosial: null, status_approach: "sudah", kesan: "tertarik" },
];

describe("PetaTokoChecklist", () => {
  it("menampilkan link Google Maps & sosmed tiap toko", () => {
    render(<PetaTokoChecklist tokoList={tokoList} selected={new Set()} onToggle={vi.fn()} />);
    const maps = screen.getAllByRole("link", { name: "Google Maps" });
    expect(maps).toHaveLength(2);
    expect(maps[0].getAttribute("href")).toContain("query=Toko%20A%2C%20Jl.%20Mawar%2C%20Tegal");
    expect(screen.getByRole("link", { name: "IG @toko.a" })).toHaveAttribute("href", "https://instagram.com/toko.a");
    expect(screen.getByRole("link", { name: "TikTok @toko.a" })).toHaveAttribute("href", "https://www.tiktok.com/@toko.a");
    expect(screen.getByRole("link", { name: "FB @tokoa" })).toHaveAttribute("href", "https://www.facebook.com/tokoa");
  });

  it("toko tanpa titik tetap bisa masuk rencana, ada Cari titik & Taruh pin", () => {
    const onToggle = vi.fn();
    const onPlacePin = vi.fn();
    render(<PetaTokoChecklist tokoList={tokoList} selected={new Set(["a"])} onToggle={onToggle} onPlacePin={onPlacePin} />);
    const checkB = screen.getByRole("button", { name: "Masukkan Toko B ke rencana" });
    expect(checkB).not.toBeDisabled();
    fireEvent.click(checkB);
    expect(onToggle).toHaveBeenCalledWith(tokoList[1]);
    expect(screen.getByRole("button", { name: "Keluarkan Toko A dari rencana" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Belum ada titik")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Taruh pin" }));
    expect(onPlacePin).toHaveBeenCalledWith(tokoList[1]);
    expect(screen.getAllByRole("button", { name: "Cari titik" })).toHaveLength(1);
  });

  it("menampilkan status approach + kesan dan tombol Edit/Detail", () => {
    const onEdit = vi.fn();
    const onOpen = vi.fn();
    render(<PetaTokoChecklist tokoList={tokoList} selected={new Set()} onToggle={vi.fn()} onEdit={onEdit} onOpen={onOpen} />);
    expect(screen.getByText("Tertarik")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(onEdit).toHaveBeenCalledWith(tokoList[0]);
    fireEvent.click(screen.getByText("Toko B"));
    expect(onOpen).toHaveBeenCalledWith(tokoList[1]);
  });
});
