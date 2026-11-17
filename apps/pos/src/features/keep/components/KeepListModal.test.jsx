import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const { useKeepOrdersQueryMock, kirimKeepMock, batalkanKeepMock, payKeepMock } = vi.hoisted(() => ({
  useKeepOrdersQueryMock: vi.fn(),
  kirimKeepMock: vi.fn(),
  batalkanKeepMock: vi.fn(),
  payKeepMock: vi.fn(),
}));

vi.mock("@deera/shared/lib/marketDay", () => ({ LOCATION_LABELS: { cideng: "Cideng", gudang: "Gudang" } }));
vi.mock("../../../shared/components/Struk", () => ({
  default: ({ onClose }) => <div data-testid="struk"><button onClick={onClose}>Tutup Struk</button></div>,
}));
vi.mock("../hooks", () => ({
  useKeepOrdersQuery: () => useKeepOrdersQueryMock(),
  useKeepFulfillment: () => ({ kirimKeep: kirimKeepMock, batalkanKeep: batalkanKeepMock, processingId: null }),
  usePayKeep: () => ({ payKeep: payKeepMock, payingId: null }),
  buildKeepStruk: (k) => ({ ...k, struk: true }),
  keepPcs: (items) => items.reduce((s, i) => s + (i.qty ?? 0), 0),
  fmtKeepTanggal: () => "5 Okt",
}));

import KeepListModal from "./KeepListModal";

const aktifKeep = { id: "k1", buyer_name: "BUDI", date: "2026-10-05", total: 200000, location: "cideng", status: "aktif", items: [{ kode: "A", qty: 2 }] };
const terkirimKeep = { id: "k2", buyer_name: "SITI", date: "2026-10-06", total: 100000, location: "gudang", status: "terkirim", items: [{ kode: "B", qty: 1 }] };

function rowOf(name) {
  return screen.getByText(name).closest("div.space-y-2");
}

beforeEach(() => {
  vi.clearAllMocks();
  useKeepOrdersQueryMock.mockReturnValue({ data: [aktifKeep, terkirimKeep], isLoading: false, isError: false });
});

describe("KeepListModal — status aktif vs terkirim", () => {
  it("keep aktif: badge 'Belum Dikirim', tombol Kirim & Edit tampil, Bayar TIDAK tampil", () => {
    render(<KeepListModal onClose={vi.fn()} onEdit={vi.fn()} />);
    const row = rowOf("BUDI");
    expect(row).toHaveTextContent("Belum Dikirim");
    expect(within(row).getByText("Kirim")).toBeInTheDocument();
    expect(within(row).getByText("Edit")).toBeInTheDocument();
    expect(within(row).queryByText("Bayar")).not.toBeInTheDocument();
  });

  it("keep terkirim: badge 'Terkirim', tombol Bayar tampil, Kirim & Edit TIDAK tampil", () => {
    render(<KeepListModal onClose={vi.fn()} onEdit={vi.fn()} />);
    const row = rowOf("SITI");
    expect(row).toHaveTextContent("Terkirim");
    expect(within(row).getByText("Bayar")).toBeInTheDocument();
    expect(within(row).queryByText("Kirim")).not.toBeInTheDocument();
    expect(within(row).queryByText("Edit")).not.toBeInTheDocument();
  });

  it("klik Kirim -> konfirmasi -> Ya, Kirim -> panggil kirimKeep dgn keep itu", async () => {
    render(<KeepListModal onClose={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(within(rowOf("BUDI")).getByText("Kirim"));
    expect(await screen.findByText(/sudah dikirim\/diambil pembeli/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Ya, Kirim"));
    await waitFor(() => expect(kirimKeepMock).toHaveBeenCalledWith(aktifKeep));
  });

  it("klik Bayar (keep terkirim) -> konfirmasi -> Ya, Bayar -> panggil payKeep, tampilkan struk", async () => {
    payKeepMock.mockResolvedValue({ struk: true });
    const onPaid = vi.fn();
    render(<KeepListModal onClose={vi.fn()} onEdit={vi.fn()} onPaid={onPaid} />);
    fireEvent.click(within(rowOf("SITI")).getByText("Bayar"));
    expect(await screen.findByText(/stok sudah dikurangi sejak ditandai terkirim/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Ya, Bayar"));
    await waitFor(() => expect(payKeepMock).toHaveBeenCalledWith(terkirimKeep));
    await waitFor(() => expect(onPaid).toHaveBeenCalled());
    expect(screen.getByTestId("struk")).toBeInTheDocument();
  });

  it("Batalkan keep aktif -> teks konfirmasi bilang stok tidak berubah", async () => {
    render(<KeepListModal onClose={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(within(rowOf("BUDI")).getByText("Batalkan"));
    expect(await screen.findByText(/Tidak ada stok yang berubah/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Ya, Batalkan"));
    await waitFor(() => expect(batalkanKeepMock).toHaveBeenCalledWith(aktifKeep));
  });

  it("Batalkan keep terkirim -> teks konfirmasi bilang stok akan dikembalikan", async () => {
    render(<KeepListModal onClose={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(within(rowOf("SITI")).getByText("Batalkan"));
    expect(await screen.findByText(/akan dikembalikan/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Ya, Batalkan"));
    await waitFor(() => expect(batalkanKeepMock).toHaveBeenCalledWith(terkirimKeep));
  });
});
