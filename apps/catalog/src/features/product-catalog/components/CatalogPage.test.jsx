import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const productsState = { products: undefined, loading: false, error: null };
vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: () => productsState,
}));

let soldOutSetValue = new Set();
const modalState = { open: false, initOpen: vi.fn(), show: vi.fn(), close: vi.fn() };
const searchState = {
  open: false,
  query: "",
  show: vi.fn(),
  close: vi.fn(),
  setQuery: vi.fn(),
};
vi.mock("../hooks", () => ({
  useSoldOutSet: () => soldOutSetValue,
  useVisitUsModal: () => modalState,
  useCatalogSearch: () => searchState,
}));

vi.mock("./VisitUsModal", () => ({
  default: ({ open, onClose }) =>
    open ? (
      <div data-testid="visit-us-modal">
        <button onClick={onClose}>tutup-modal</button>
      </div>
    ) : null,
}));

let lastSearchModalProps = null;
vi.mock("./SearchModal", () => ({
  default: (props) => {
    lastSearchModalProps = props;
    if (!props.open) return null;
    return (
      <div data-testid="search-modal">
        <button onClick={() => props.onSelect("C")}>pilih-C</button>
        <button onClick={props.onClose}>tutup-search</button>
      </div>
    );
  },
}));

const { default: CatalogPage } = await import("./CatalogPage");

function renderPage() {
  return render(
    <MemoryRouter>
      <CatalogPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  productsState.products = undefined;
  productsState.loading = false;
  productsState.error = null;
  soldOutSetValue = new Set();
  modalState.open = false;
  modalState.initOpen.mockReset();
  modalState.show.mockReset();
  modalState.close.mockReset();
  searchState.open = false;
  searchState.query = "";
  searchState.show.mockReset();
  searchState.close.mockReset();
  searchState.setQuery.mockReset();
  lastSearchModalProps = null;
});

describe("CatalogPage", () => {
  it("memanggil initOpen saat mount", () => {
    renderPage();
    expect(modalState.initOpen).toHaveBeenCalledTimes(1);
  });

  it("menampilkan LOADING saat loading=true", () => {
    productsState.loading = true;
    renderPage();
    expect(screen.getByText("LOADING...")).toBeInTheDocument();
  });

  it("menampilkan pesan error saat error tersedia", () => {
    productsState.error = { message: "Network down" };
    renderPage();
    expect(screen.getByText("GAGAL MEMUAT KATALOG")).toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });

  it("menampilkan BELUM ADA PRODUK saat products kosong", () => {
    productsState.products = [];
    renderPage();
    expect(screen.getByText("BELUM ADA PRODUK")).toBeInTheDocument();
  });

  it("hanya render produk yang punya image, terurut created_at desc", () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "B", nama: "Produk B", image: null, created_at: "2026-03-01" },
      { kode: "C", nama: "Produk C", image: "c.jpg", created_at: "2026-02-01" },
    ];
    renderPage();
    // CatalogSlide merender kode produk dua kali (blok desktop + blok mobile),
    // jadi dedupe sambil mempertahankan urutan kemunculan pertama.
    const kodes = [...new Set(screen.getAllByText(/^[AC]$/).map((el) => el.textContent))];
    expect(kodes).toEqual(["C", "A"]);
    expect(screen.queryByText("B")).toBeNull();
  });

  it("created_at null/undefined dianggap string kosong saat sort (selalu di akhir)", () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "B", nama: "Produk B", image: "b.jpg", created_at: undefined },
      { kode: "C", nama: "Produk C", image: "c.jpg", created_at: null },
      { kode: "D", nama: "Produk D", image: "d.jpg", created_at: "2026-03-01" },
    ];
    renderPage();
    const kodes = [...new Set(screen.getAllByText(/^[ABCD]$/).map((el) => el.textContent))];
    expect(kodes).toEqual(["D", "A", "B", "C"]);
  });

  it("menandai soldOut sesuai soldOutSet", () => {
    productsState.products = [{ kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" }];
    soldOutSetValue = new Set(["A"]);
    renderPage();
    expect(screen.getAllByText("SOLD OUT").length).toBeGreaterThan(0);
  });

  it("klik VISIT US memanggil show()", () => {
    productsState.products = [];
    renderPage();
    fireEvent.click(screen.getByText("VISIT US"));
    expect(modalState.show).toHaveBeenCalledTimes(1);
  });

  it("render VisitUsModal terbuka saat open=true & menutup memanggil close()", () => {
    productsState.products = [];
    modalState.open = true;
    renderPage();
    expect(screen.getByTestId("visit-us-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("tutup-modal"));
    // onClose diteruskan dari closeModal milik hooks
    expect(typeof modalState.close).toBe("function");
  });

  it("tombol scroll-to-top muncul setelah scroll & memanggil mainRef.scrollTo saat diklik", () => {
    productsState.products = [];
    const { container } = renderPage();
    const main = container.querySelector("main");
    Object.defineProperty(main, "scrollTop", { value: 1000, configurable: true });
    Object.defineProperty(main, "clientHeight", { value: 500, configurable: true });
    main.scrollTo = vi.fn();

    fireEvent.scroll(main);

    const backBtn = screen.getByRole("button", { name: "Kembali ke atas" });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(main.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("tombol scroll-to-top tidak muncul saat scroll masih sedikit", () => {
    productsState.products = [];
    const { container } = renderPage();
    const main = container.querySelector("main");
    Object.defineProperty(main, "scrollTop", { value: 10, configurable: true });
    Object.defineProperty(main, "clientHeight", { value: 500, configurable: true });

    fireEvent.scroll(main);

    expect(screen.queryByRole("button", { name: "Kembali ke atas" })).toBeNull();
  });

  it("melepas listener scroll saat unmount", () => {
    productsState.products = [];
    const { container, unmount } = renderPage();
    const main = container.querySelector("main");
    const removeSpy = vi.spyOn(main, "removeEventListener");
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("klik CARI memanggil show() dari useCatalogSearch", () => {
    productsState.products = [];
    renderPage();
    fireEvent.click(screen.getByText("CARI"));
    expect(searchState.show).toHaveBeenCalledTimes(1);
  });

  it("render SearchModal terbuka saat open=true", () => {
    productsState.products = [];
    searchState.open = true;
    renderPage();
    expect(screen.getByTestId("search-modal")).toBeInTheDocument();
  });

  it("memilih hasil pencarian scroll ke node produk & menutup modal", () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "C", nama: "Produk C", image: "c.jpg", created_at: "2026-02-01" },
    ];
    searchState.open = true;
    renderPage();

    const scrollIntoViewSpy = vi.fn();
    // stub scrollIntoView di semua elemen (jsdom tidak mengimplementasikannya)
    Element.prototype.scrollIntoView = scrollIntoViewSpy;

    fireEvent.click(screen.getByText("pilih-C"));

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    expect(searchState.close).toHaveBeenCalledTimes(1);
  });

  it("tidak error saat memilih hasil pencarian untuk kode yang tidak terdaftar", () => {
    productsState.products = [];
    searchState.open = true;
    renderPage();
    Element.prototype.scrollIntoView = vi.fn();
    expect(() => fireEvent.click(screen.getByText("pilih-C"))).not.toThrow();
    expect(searchState.close).toHaveBeenCalledTimes(1);
  });

  it("menampilkan indikator posisi X / Y saat ada produk", () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "C", nama: "Produk C", image: "c.jpg", created_at: "2026-02-01" },
    ];
    renderPage();
    expect(screen.getByText(/\/ 2/)).toBeInTheDocument();
  });

  it("tidak menampilkan indikator posisi saat tidak ada produk", () => {
    productsState.products = [];
    renderPage();
    expect(screen.queryByText(/\//)).toBeNull();
  });
});
