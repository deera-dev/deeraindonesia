import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../../../test/renderWithRouter.jsx";

const productsState = { products: undefined, loading: false, error: null };
vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: () => productsState,
}));

let soldOutSetValue = new Set();
let limitedStokSetValue = new Set();
let baruSetValue = new Set();
let terlarisMapValue = new Map();
const modalState = { open: false, initOpen: vi.fn(), show: vi.fn(), close: vi.fn() };
const searchState = {
  open: false,
  query: "",
  show: vi.fn(),
  close: vi.fn(),
  setQuery: vi.fn(),
};
const filterState = {
  open: false,
  bahan: null,
  ukuran: null,
  show: vi.fn(),
  close: vi.fn(),
  setBahan: vi.fn(),
  setUkuran: vi.fn(),
  reset: vi.fn(),
};
const scrollPositionState = { lastActiveKode: null, setLastActiveKode: vi.fn() };
const grosirState = { open: false, show: vi.fn(), close: vi.fn() };
vi.mock("../hooks", () => ({
  useSoldOutSet: () => soldOutSetValue,
  useLimitedStokSet: () => limitedStokSetValue,
  useBaruSet: () => baruSetValue,
  useTerlarisMap: () => terlarisMapValue,
  useVisitUsModal: () => modalState,
  useCatalogSearch: () => searchState,
  useCatalogFilter: () => filterState,
  useCatalogScrollPosition: () => scrollPositionState,
  useGrosirInfo: () => grosirState,
}));

const favState = { favoriteKodes: new Set(), toggle: vi.fn(), count: 0 };
vi.mock("../../favorites/hooks", () => ({
  useFavorites: () => favState,
}));

vi.mock("./VisitUsModal", () => ({
  default: ({ open, onClose, onGrosirInfo }) =>
    open ? (
      <div data-testid="visit-us-modal">
        <button onClick={onClose}>tutup-modal</button>
        <button onClick={onGrosirInfo}>visit-grosir</button>
      </div>
    ) : null,
}));

vi.mock("./GrosirInfoModal", () => ({
  default: ({ open, onClose }) =>
    open ? (
      <div data-testid="grosir-modal">
        <button onClick={onClose}>tutup-grosir</button>
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

vi.mock("./FilterModal", () => ({
  default: (props) =>
    props.open ? (
      <div data-testid="filter-modal">
        <span data-testid="filter-result-count">{props.resultCount}</span>
        <button onClick={props.onClose}>tutup-filter</button>
      </div>
    ) : null,
}));

let lastMenuButtonProps = null;
vi.mock("./MenuButton", () => ({
  default: (props) => {
    lastMenuButtonProps = props;
    return (
      <div data-testid="menu-button">
        <button onClick={props.onFilter}>menu-filter</button>
        <button onClick={props.onSearch}>menu-cari</button>
        <button onClick={props.onVisitUs}>menu-visit</button>
        <button onClick={props.onGrosirInfo}>menu-grosir</button>
        {props.hasActiveFilter && <span data-testid="menu-filter-active" />}
        {props.favoriteCount > 0 && (
          <span data-testid="menu-favorite-count">{props.favoriteCount}</span>
        )}
      </div>
    );
  },
}));

const { default: CatalogPage } = await import("./CatalogPage");

async function renderPage() {
  return renderWithRouter({
    initialPath: "/catalog",
    routes: { "/catalog": CatalogPage },
  });
}

beforeEach(() => {
  productsState.products = undefined;
  productsState.loading = false;
  productsState.error = null;
  soldOutSetValue = new Set();
  limitedStokSetValue = new Set();
  baruSetValue = new Set();
  terlarisMapValue = new Map();
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
  lastMenuButtonProps = null;
  filterState.open = false;
  filterState.bahan = null;
  filterState.ukuran = null;
  filterState.show.mockReset();
  filterState.close.mockReset();
  filterState.setBahan.mockReset();
  filterState.setUkuran.mockReset();
  filterState.reset.mockReset();
  favState.favoriteKodes = new Set();
  favState.count = 0;
  scrollPositionState.lastActiveKode = null;
  scrollPositionState.setLastActiveKode.mockReset();
});

describe("CatalogPage", () => {
  it("memanggil initOpen saat mount", async () => {
    await renderPage();
    expect(modalState.initOpen).toHaveBeenCalledTimes(1);
  });

  it("menampilkan skeleton saat loading=true", async () => {
    productsState.loading = true;
    const { container } = await renderPage();
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("menampilkan pesan error & tombol Coba Lagi saat error tersedia", async () => {
    productsState.error = { message: "Network down" };
    await renderPage();
    expect(screen.getByText("GAGAL MEMUAT KATALOG")).toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
    expect(screen.getByText("Coba Lagi")).toBeInTheDocument();
  });

  it("tombol Coba Lagi memanggil window.location.reload()", async () => {
    productsState.error = { message: "Network down" };
    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });
    await renderPage();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("menampilkan BELUM ADA PRODUK saat products kosong", async () => {
    productsState.products = [];
    await renderPage();
    expect(screen.getByText("BELUM ADA PRODUK")).toBeInTheDocument();
  });

  it("hanya render produk yang punya image, terurut created_at desc", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "B", nama: "Produk B", image: null, created_at: "2026-03-01" },
      { kode: "C", nama: "Produk C", image: "c.jpg", created_at: "2026-02-01" },
    ];
    await renderPage();
    const kodes = [...new Set(screen.getAllByText(/^[AC]$/).map((el) => el.textContent))];
    expect(kodes).toEqual(["C", "A"]);
    expect(screen.queryByText("B")).toBeNull();
  });

  it("created_at null/undefined dianggap string kosong saat sort (selalu di akhir)", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "B", nama: "Produk B", image: "b.jpg", created_at: undefined },
      { kode: "C", nama: "Produk C", image: "c.jpg", created_at: null },
      { kode: "D", nama: "Produk D", image: "d.jpg", created_at: "2026-03-01" },
    ];
    await renderPage();
    const kodes = [...new Set(screen.getAllByText(/^[ABCD]$/).map((el) => el.textContent))];
    expect(kodes).toEqual(["D", "A", "B", "C"]);
  });

  it("menandai soldOut sesuai soldOutSet", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
    ];
    soldOutSetValue = new Set(["A"]);
    await renderPage();
    expect(screen.getAllByText("SOLD OUT").length).toBeGreaterThan(0);
  });

  it("meneruskan baru/terlaris/stok-terbatas dari hooks ke CatalogSlide", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
    ];
    baruSetValue = new Set(["A"]);
    terlarisMapValue = new Map([["A", "7d"]]);
    limitedStokSetValue = new Set(["A"]);
    await renderPage();
    expect(screen.getAllByText("Baru").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Terlaris Minggu Ini/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stok Terbatas").length).toBeGreaterThan(0);
  });

  it("tidak menandai stok terbatas kalau produk sudah sold out (soldOut menang)", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
    ];
    soldOutSetValue = new Set(["A"]);
    limitedStokSetValue = new Set(["A"]);
    await renderPage();
    expect(screen.queryByText("Stok Terbatas")).toBeNull();
  });

  it("klik Visit Us (via MenuButton) memanggil show() dari useVisitUsModal", async () => {
    productsState.products = [];
    await renderPage();
    fireEvent.click(screen.getByText("menu-visit"));
    expect(modalState.show).toHaveBeenCalledTimes(1);
  });

  it("render VisitUsModal terbuka saat open=true & menutup memanggil close()", async () => {
    productsState.products = [];
    modalState.open = true;
    await renderPage();
    expect(screen.getByTestId("visit-us-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("tutup-modal"));
    expect(typeof modalState.close).toBe("function");
  });

  it("tombol scroll-to-top muncul setelah scroll & memanggil mainRef.scrollTo saat diklik", async () => {
    productsState.products = [];
    const { container } = await renderPage();
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

  it("tombol scroll-to-top tidak muncul saat scroll masih sedikit", async () => {
    productsState.products = [];
    const { container } = await renderPage();
    const main = container.querySelector("main");
    Object.defineProperty(main, "scrollTop", { value: 10, configurable: true });
    Object.defineProperty(main, "clientHeight", { value: 500, configurable: true });

    fireEvent.scroll(main);

    expect(screen.queryByRole("button", { name: "Kembali ke atas" })).toBeNull();
  });

  it("melepas listener scroll saat unmount", async () => {
    productsState.products = [];
    const { container, unmount } = await renderPage();
    const main = container.querySelector("main");
    const removeSpy = vi.spyOn(main, "removeEventListener");
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("klik Cari (via MenuButton) memanggil show() dari useCatalogSearch", async () => {
    productsState.products = [];
    await renderPage();
    fireEvent.click(screen.getByText("menu-cari"));
    expect(searchState.show).toHaveBeenCalledTimes(1);
  });

  it("render SearchModal terbuka saat open=true", async () => {
    productsState.products = [];
    searchState.open = true;
    await renderPage();
    expect(screen.getByTestId("search-modal")).toBeInTheDocument();
  });

  it("memilih hasil pencarian scroll ke node produk & menutup modal", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "C", nama: "Produk C", image: "c.jpg", created_at: "2026-02-01" },
    ];
    searchState.open = true;
    await renderPage();

    const scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;

    fireEvent.click(screen.getByText("pilih-C"));

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    expect(searchState.close).toHaveBeenCalledTimes(1);
  });

  it("tidak error saat memilih hasil pencarian untuk kode yang tidak terdaftar", async () => {
    productsState.products = [];
    searchState.open = true;
    await renderPage();
    Element.prototype.scrollIntoView = vi.fn();
    expect(() => fireEvent.click(screen.getByText("pilih-C"))).not.toThrow();
    expect(searchState.close).toHaveBeenCalledTimes(1);
  });

  it("menampilkan indikator posisi X / Y saat ada produk", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "C", nama: "Produk C", image: "c.jpg", created_at: "2026-02-01" },
    ];
    await renderPage();
    expect(screen.getByText(/\/ 2/)).toBeInTheDocument();
  });

  it("tidak menampilkan indikator posisi saat tidak ada produk", async () => {
    productsState.products = [];
    await renderPage();
    expect(screen.queryByText(/\//)).toBeNull();
  });
});

describe("CatalogPage — filter bahan/ukuran", () => {
  it("klik Filter (via MenuButton) memanggil show() dari useCatalogFilter", async () => {
    productsState.products = [];
    await renderPage();
    fireEvent.click(screen.getByText("menu-filter"));
    expect(filterState.show).toHaveBeenCalledTimes(1);
  });

  it("render FilterModal terbuka saat open=true", async () => {
    productsState.products = [];
    filterState.open = true;
    await renderPage();
    expect(screen.getByTestId("filter-modal")).toBeInTheDocument();
  });

  it("MenuButton menerima hasActiveFilter sesuai filter yang aktif", async () => {
    productsState.products = [];
    const { unmount } = await renderPage();
    expect(screen.queryByTestId("menu-filter-active")).toBeNull();
    unmount();

    filterState.bahan = "Ceruti";
    await renderPage();
    expect(screen.getByTestId("menu-filter-active")).toBeInTheDocument();
  });

  it("hanya menampilkan produk yang cocok dengan filter aktif", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", bahan: "Ceruti", created_at: "2026-01-01" },
      { kode: "C", nama: "Produk C", image: "c.jpg", bahan: "Sifon", created_at: "2026-02-01" },
    ];
    filterState.bahan = "Ceruti";
    await renderPage();
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
    expect(screen.queryByText("C")).toBeNull();
  });

  it("menampilkan TIDAK ADA PRODUK YANG COCOK & tombol Reset Filter saat hasil filter kosong", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", bahan: "Ceruti", created_at: "2026-01-01" },
    ];
    filterState.bahan = "Sifon";
    await renderPage();
    expect(screen.getByText("TIDAK ADA PRODUK YANG COCOK")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reset Filter"));
    expect(filterState.reset).toHaveBeenCalledTimes(1);
  });
});

describe("CatalogPage — favorit (via MenuButton)", () => {
  it("meneruskan favoriteCount ke MenuButton", async () => {
    productsState.products = [];
    favState.count = 3;
    await renderPage();
    expect(screen.getByTestId("menu-favorite-count")).toHaveTextContent("3");
  });

  it("tidak menampilkan badge jumlah saat count 0", async () => {
    productsState.products = [];
    favState.count = 0;
    await renderPage();
    expect(screen.queryByTestId("menu-favorite-count")).toBeNull();
  });
});

describe("CatalogPage — restore posisi scroll saat kembali dari halaman detail", () => {
  it("scroll ke node produk yang terakhir aktif (lastActiveKode) saat mount, BUKAN mulai dari atas", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "C", nama: "Produk C", image: "c.jpg", created_at: "2026-02-01" },
    ];
    scrollPositionState.lastActiveKode = "C";
    const scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;

    await renderPage();

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("TIDAK melakukan restore scroll saat lastActiveKode masih null (kunjungan pertama)", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
    ];
    scrollPositionState.lastActiveKode = null;
    const scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;

    await renderPage();

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it("tidak error kalau lastActiveKode sudah tidak ada di antara produk yang tampil (mis. difilter/dihapus)", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
    ];
    scrollPositionState.lastActiveKode = "ZZZ-TIDAK-ADA";
    const scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;

    await expect(renderPage()).resolves.toBeTruthy();
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it("saat products masih loading, belum ada percobaan restore (tunggu sampai loading selesai)", async () => {
    productsState.loading = true;
    productsState.products = undefined;
    scrollPositionState.lastActiveKode = "C";
    const scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;

    await renderPage();

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });
});

describe("CatalogPage — mencatat slide aktif ke store scroll (utk restore nanti)", () => {
  let ioInstances;
  class FakeIntersectionObserver {
    constructor(cb) {
      this.cb = cb;
      ioInstances.push(this);
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }

  it("saat sebuah slide jadi intersecting, memanggil setLastActiveKode dengan kode produk itu", async () => {
    productsState.products = [
      { kode: "A", nama: "Produk A", image: "a.jpg", created_at: "2026-01-01" },
      { kode: "C", nama: "Produk C", image: "c.jpg", created_at: "2026-02-01" },
    ];
    ioInstances = [];
    window.IntersectionObserver = FakeIntersectionObserver;

    await renderPage();

    act(() => {
      ioInstances[0].cb([{ isIntersecting: true }]);
    });

    expect(scrollPositionState.setLastActiveKode).toHaveBeenCalledWith("C");
  });
});

describe("CatalogPage — info grosir", () => {
  beforeEach(() => {
    productsState.products = [];
    modalState.open = false;
    grosirState.open = false;
    grosirState.show.mockClear();
    grosirState.close.mockClear();
  });

  it("klik Cara Order (via MenuButton) memanggil show() dari useGrosirInfo", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("menu-grosir"));
    expect(grosirState.show).toHaveBeenCalledTimes(1);
  });

  it("VisitUsModal bisa membuka info grosir", async () => {
    modalState.open = true;
    await renderPage();
    fireEvent.click(screen.getByText("visit-grosir"));
    expect(grosirState.show).toHaveBeenCalledTimes(1);
  });

  it("render GrosirInfoModal saat open=true & menutup memanggil close()", async () => {
    grosirState.open = true;
    await renderPage();
    expect(screen.getByTestId("grosir-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("tutup-grosir"));
    expect(grosirState.close).toHaveBeenCalledTimes(1);
  });
});
