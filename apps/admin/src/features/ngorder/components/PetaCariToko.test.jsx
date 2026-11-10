import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const searchPlacesTextMock = vi.fn();
const fetchPlaceDetailsMock = vi.fn();
vi.mock("@deera/shared/lib/geocode", () => ({
  searchPlacesText: (...a) => searchPlacesTextMock(...a),
  fetchPlaceDetails: (...a) => fetchPlaceDetailsMock(...a),
}));

const resolveLinkMutateAsync = vi.fn();
const createTokoMutateAsync = vi.fn();
const setLocationMutateAsync = vi.fn();
vi.mock("../hooks", async () => ({
  ...(await vi.importActual("../utils")),
  useCreateTokoMutation: () => ({ mutateAsync: createTokoMutateAsync }),
  useSetTokoLocationMutation: () => ({ mutateAsync: setLocationMutateAsync }),
  useResolveGoogleMapsLinkMutation: () => ({ mutateAsync: resolveLinkMutateAsync }),
}));

import PetaCariToko from "./PetaCariToko";
import { toast } from "@deera/shared/features/toast/hooks";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PetaCariToko - pencarian teks biasa", () => {
  it("cari berdasarkan nama memanggil searchPlacesText apa adanya", async () => {
    searchPlacesTextMock.mockResolvedValue([{ id: "p1", nama: "Toko Gamis Tegal", alamat: "Jl. A", lat: 1, lng: 2 }]);
    render(<PetaCariToko tokoList={[]} center={null} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/toko gamis Tegal/), { target: { value: "toko gamis Tegal" } });
    fireEvent.click(screen.getByText("Cari"));
    await screen.findByText("Toko Gamis Tegal");
    expect(searchPlacesTextMock).toHaveBeenCalledWith("toko gamis Tegal", { center: null });
    expect(resolveLinkMutateAsync).not.toHaveBeenCalled();
  });
});

describe("PetaCariToko - tempel link Google Maps", () => {
  it("link terdeteksi → resolve dulu lalu cari pakai nama & titik hasil resolve", async () => {
    resolveLinkMutateAsync.mockResolvedValue({ nama: "Husna Boutique", lat: -6.9, lng: 106.9 });
    searchPlacesTextMock.mockResolvedValue([{ id: "p1", nama: "Husna Boutique", alamat: "Jl. B", lat: -6.9, lng: 106.9 }]);
    render(<PetaCariToko tokoList={[]} center={null} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/toko gamis Tegal/), {
      target: { value: "https://share.google/Sf1aAl24CjQurS8Qd" },
    });
    fireEvent.click(screen.getByText("Cari"));
    await screen.findByText("Husna Boutique");
    expect(resolveLinkMutateAsync).toHaveBeenCalledWith("https://share.google/Sf1aAl24CjQurS8Qd");
    expect(searchPlacesTextMock).toHaveBeenCalledWith("Husna Boutique", { center: { lat: -6.9, lng: 106.9 } });
  });

  it("link gagal di-resolve → toast error, tidak lanjut cari", async () => {
    resolveLinkMutateAsync.mockRejectedValue(new Error("Tidak bisa baca nama/lokasi dari link ini. Coba cari manual."));
    render(<PetaCariToko tokoList={[]} center={null} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/toko gamis Tegal/), {
      target: { value: "https://maps.app.goo.gl/xyz" },
    });
    fireEvent.click(screen.getByText("Cari"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Tidak bisa baca nama/lokasi dari link ini. Coba cari manual."),
    );
    expect(searchPlacesTextMock).not.toHaveBeenCalled();
  });

  it("link ke-resolve tapi tanpa nama → toast minta cari manual", async () => {
    resolveLinkMutateAsync.mockResolvedValue({ nama: null, lat: -6.9, lng: 106.9 });
    render(<PetaCariToko tokoList={[]} center={null} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/toko gamis Tegal/), {
      target: { value: "https://www.google.com/maps/@-6.9,106.9,17z" },
    });
    fireEvent.click(screen.getByText("Cari"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Nama toko tidak terbaca dari link ini, coba cari manual pakai nama toko."),
    );
    expect(searchPlacesTextMock).not.toHaveBeenCalled();
  });
});

describe("PetaCariToko - tambah hasil", () => {
  it("klik Tambah membuat toko baru dari hasil pencarian", async () => {
    searchPlacesTextMock.mockResolvedValue([{ id: "p1", nama: "Toko A", alamat: "Jl. A", lat: 1, lng: 2, place: {} }]);
    fetchPlaceDetailsMock.mockResolvedValue({ noHp: "0800", website: "https://toko-a.com", rating: 4.5, ratingCount: 10, jamBuka: [] });
    createTokoMutateAsync.mockResolvedValue({ id: "new1" });
    render(<PetaCariToko tokoList={[]} center={null} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/toko gamis Tegal/), { target: { value: "Toko A" } });
    fireEvent.click(screen.getByText("Cari"));
    await screen.findByText("Toko A");
    fireEvent.click(screen.getByText("Tambah"));
    await waitFor(() => expect(createTokoMutateAsync).toHaveBeenCalled());
    expect(setLocationMutateAsync).toHaveBeenCalledWith({ id: "new1", lat: 1, lng: 2, source: "google" });
    expect(toast.success).toHaveBeenCalledWith('"Toko A" ditambahkan.');
  });
});
