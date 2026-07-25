import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CatalogSlide from "./CatalogSlide";
import CatalogSkeleton from "./CatalogSkeleton";
import VisitUsModal from "./VisitUsModal";
import SearchModal from "./SearchModal";
import FilterModal from "./FilterModal";
import { useProducts } from "@deera/shared/features/products/hooks";
import { useSoldOutSet, useVisitUsModal, useCatalogSearch, useCatalogFilter } from "../hooks";
import { sortCatalogProducts, filterByAttributes } from "../utils";
import { useFavorites } from "../../favorites/hooks";

export default function CatalogPage() {
  const { products, loading, error } = useProducts();
  const soldOutSet = useSoldOutSet();
  const { open: openModal, initOpen, show: showModal, close: closeModal } = useVisitUsModal();
  const {
    open: searchOpen,
    query: searchQuery,
    show: showSearch,
    close: closeSearch,
    setQuery: setSearchQuery,
  } = useCatalogSearch();
  const {
    open: filterOpen,
    bahan,
    ukuran,
    show: showFilter,
    close: closeFilter,
    setBahan,
    setUkuran,
    reset: resetFilter,
  } = useCatalogFilter();
  const { count: favoriteCount } = useFavorites();
  const mainRef = useRef(null);
  const slideNodesRef = useRef({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeKode, setActiveKode] = useState(null);

  useEffect(() => {
    initOpen();
  }, [initOpen]);

  useEffect(() => {
    const el = mainRef.current;
    /* v8 ignore next @preserve -- mainRef selalu terisi saat effect ini
       jalan (React commit ref <main> sebelum effect); guard ini hanya
       defensif & tidak bisa dipicu lewat render normal. */
    if (!el) return;
    function onScroll() {
      setShowScrollTop(el.scrollTop > el.clientHeight * 0.5);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const sorted = useMemo(() => sortCatalogProducts(products), [products]);
  const filtered = useMemo(
    () => filterByAttributes(sorted, { bahan, ukuran }),
    [sorted, bahan, ukuran],
  );
  const hasActiveFilter = !!bahan || !!ukuran;

  const activePosition = filtered.findIndex((p) => p.kode === activeKode) + 1;

  const handleActive = useCallback((kode) => setActiveKode(kode), []);

  const registerNode = useCallback((kode, node) => {
    if (node) {
      slideNodesRef.current[kode] = node;
    } else {
      delete slideNodesRef.current[kode];
    }
  }, []);

  function handleSelectSearchResult(kode) {
    const node = slideNodesRef.current[kode];
    node?.scrollIntoView({ behavior: "auto", block: "start" });
    closeSearch();
  }

  return (
    <>
      <main
        ref={mainRef}
        className="w-full h-dvh min-h-dvh overflow-y-scroll bg-black snap-y snap-mandatory"
      >
        {loading && <CatalogSkeleton />}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center w-full h-screen text-center px-7">
            <p className="font-editorial text-white/80 text-sm tracking-[0.25em]">
              GAGAL MEMUAT KATALOG
            </p>
            <p className="mt-3 font-editorial text-white/40 text-xs tracking-[0.15em]">
              {error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-8 px-6 py-3 font-editorial text-xs tracking-[0.3em] uppercase border border-white/25 text-white/70 hover:border-white hover:text-white transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!loading && !error && products?.length === 0 && (
          <div className="flex items-center justify-center w-full h-screen text-white/40 font-editorial text-xs tracking-[0.3em]">
            BELUM ADA PRODUK
          </div>
        )}

        {!loading && !error && products?.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center w-full h-screen text-center px-7">
            <p className="font-editorial text-white/50 text-xs tracking-[0.25em]">
              TIDAK ADA PRODUK YANG COCOK
            </p>
            <button
              onClick={resetFilter}
              className="mt-6 px-6 py-3 font-editorial text-xs tracking-[0.3em] uppercase border border-white/25 text-white/70 hover:border-white hover:text-white transition"
            >
              Reset Filter
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filtered.map((model, index) => (
            <CatalogSlide
              key={model.kode}
              model={model}
              isLast={index === filtered.length - 1}
              soldOut={soldOutSet.has(model.kode)}
              onActive={handleActive}
              registerNode={registerNode}
            />
          ))}
      </main>

      {!loading && !error && filtered.length > 0 && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 px-3 py-1 font-editorial text-[11px] tracking-[0.25em] text-white/50 pointer-events-none">
          {activePosition > 0 ? activePosition : 1} / {filtered.length}
        </div>
      )}

      {/* CARI & favorit disatukan dalam satu baris (bukan ditumpuk) supaya
          tidak saling menutup di layar sempit. */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={showFilter}
          aria-label="Filter produk"
          className="relative px-5 py-3 font-editorial text-xs tracking-[0.3em] text-white/90 border border-white/30 bg-black/40 backdrop-blur hover:border-white transition"
        >
          FILTER
          {hasActiveFilter && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#cab170]" />
          )}
        </button>

        <Link
          to="/favorit"
          aria-label="Lihat produk favorit"
          className="px-5 py-3 font-editorial text-xs tracking-[0.3em] text-white/90 border border-white/30 bg-black/40 backdrop-blur hover:border-white transition"
        >
          <span className="leading-none">FAVORITE</span>
          {favoriteCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#cab170] text-black text-[9px] font-editorial flex items-center justify-center">
              {favoriteCount}
            </span>
          )}
        </Link>

        <button
          onClick={showSearch}
          aria-label="Cari produk"
          className="px-5 py-3 font-editorial text-xs tracking-[0.3em] text-white/90 border border-white/30 bg-black/40 backdrop-blur hover:border-white transition"
        >
          CARI
        </button>
      </div>

      <button
        onClick={showModal}
        className="fixed bottom-6 right-6 z-50 px-5 py-3 font-editorial text-xs tracking-[0.3em] text-white/90 border border-white/30 bg-black/40 backdrop-blur hover:border-white transition"
      >
        VISIT US
      </button>

      {showScrollTop && (
        <button
          onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Kembali ke atas"
          className="fixed bottom-6 left-6 z-50 w-11 h-11 flex items-center justify-center border border-white/30 bg-black/40 backdrop-blur text-white/80 hover:border-white hover:text-white active:scale-95 transition text-base"
        >
          &#8593;
        </button>
      )}

      <VisitUsModal open={openModal} onClose={closeModal} />

      <SearchModal
        open={searchOpen}
        query={searchQuery}
        products={sorted}
        soldOutSet={soldOutSet}
        onSetQuery={setSearchQuery}
        onSelect={handleSelectSearchResult}
        onClose={closeSearch}
      />

      <FilterModal
        open={filterOpen}
        products={sorted}
        bahan={bahan}
        ukuran={ukuran}
        resultCount={filtered.length}
        onSetBahan={setBahan}
        onSetUkuran={setUkuran}
        onReset={resetFilter}
        onClose={closeFilter}
      />
    </>
  );
}
